import { Injectable } from '@nestjs/common';
import {
  AuditLogCategory,
  AuditLogResult,
  CommonStatus,
  DataLevel,
  ScanTaskStatus,
} from '@prisma/client';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAutoScanRuleDto } from './dto/create-auto-scan-rule.dto';
import { UpdateAutoScanRuleDto } from './dto/update-auto-scan-rule.dto';

const execFileAsync = promisify(execFile);

@Injectable()
export class AutoScanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  private static readonly DB_SERVICE_KEYWORDS = [
    'mysql',
    'mariadb',
    'postgresql',
    'postgres',
    'oracle',
    'ms-sql',
    'microsoft sql',
    'sqlserver',
    'mongodb',
    'mongod',
    'redis',
    'kafka',
    'rabbitmq',
    'rocketmq',
    'amqp',
  ];

  private static readonly NMAP_TIMEOUT_MS = 300_000; // 5 minutes per host batch

  /**
   * Parse an IP range string into a list of individual IPs.
   * Supports: single IP, CIDR /24-/32, comma-separated, and dash ranges.
   *   "10.0.0.1"              → [10.0.0.1]
   *   "10.0.0.0/24"           → [10.0.0.1 … 10.0.0.254]
   *   "10.0.0.1,10.0.0.2"    → [10.0.0.1, 10.0.0.2]
   *   "10.0.0.1-10.0.0.5"    → [10.0.0.1 … 10.0.0.5]
   */
  private expandIpRange(ipRange: string): string[] {
    const trimmed = ipRange.trim();
    if (!trimmed) return [];

    // Comma-separated
    if (trimmed.includes(',')) {
      return trimmed
        .split(',')
        .flatMap((segment) => this.expandIpRange(segment));
    }

    // CIDR notation
    const cidrMatch = trimmed.match(
      /^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/,
    );
    if (cidrMatch) {
      return this.expandCidr(cidrMatch[1], Number(cidrMatch[2]));
    }

    // Dash range: 10.0.0.1-10.0.0.5
    const dashMatch = trimmed.match(
      /^(\d+\.\d+\.\d+)\.(\d+)\s*-\s*(\d+\.\d+\.\d+)\.(\d+)$/,
    );
    if (dashMatch) {
      const prefix = dashMatch[1];
      const start = Number(dashMatch[2]);
      const end = Number(dashMatch[4]);
      const ips: string[] = [];
      for (let i = start; i <= end && i <= 255; i++) {
        ips.push(`${prefix}.${i}`);
      }
      return ips;
    }

    // Single IP
    if (/^\d+\.\d+\.\d+\.\d+$/.test(trimmed)) {
      return [trimmed];
    }

    return [];
  }

  private expandCidr(baseIp: string, prefix: number): string[] {
    if (prefix < 24) {
      // Limit to /24 to avoid scanning huge ranges accidentally
      prefix = 24;
    }

    const parts = baseIp.split('.').map(Number);
    const ipNum =
      ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>>
      0;
    const mask = prefix === 32 ? 0xffffffff : (0xffffffff << (32 - prefix)) >>> 0;
    const network = (ipNum & mask) >>> 0;
    const hostCount = ~mask >>> 0;

    const ips: string[] = [];
    // Skip network address (i=0) and broadcast (i=hostCount) for ranges > /31
    const start = hostCount > 1 ? 1 : 0;
    const end = hostCount > 1 ? hostCount - 1 : hostCount;
    for (let i = start; i <= end; i++) {
      const addr = (network + i) >>> 0;
      ips.push(
        `${(addr >>> 24) & 0xff}.${(addr >>> 16) & 0xff}.${(addr >>> 8) & 0xff}.${addr & 0xff}`,
      );
    }
    return ips;
  }

  /**
   * Normalize nmap service name to a standard database type label.
   */
  private normalizeServiceName(service: string): string | null {
    const lower = service.toLowerCase();
    if (lower.includes('mysql') || lower.includes('mariadb')) return 'mysql';
    if (lower.includes('postgres')) return 'postgresql';
    if (lower.includes('oracle') || lower.includes('tns')) return 'oracle';
    if (lower.includes('ms-sql') || lower.includes('microsoft sql') || lower.includes('sqlserver'))
      return 'sqlserver';
    if (lower.includes('mongo')) return 'mongodb';
    if (lower.includes('redis')) return 'redis';
    if (lower.includes('kafka')) return 'kafka';
    if (lower.includes('amqp') || lower.includes('rabbitmq')) return 'rabbitmq';
    if (lower.includes('rocketmq')) return 'rocketmq';

    // Check if any DB keyword appears
    for (const keyword of AutoScanService.DB_SERVICE_KEYWORDS) {
      if (lower.includes(keyword)) return keyword;
    }
    return null;
  }

  /**
   * Run nmap -sV on a list of IPs with the given port spec.
   * Returns only ports identified as database services.
   */
  private async nmapScan(
    ips: string[],
    portSpec: string,
  ): Promise<Array<{ ip: string; port: number; sourceType: string }>> {
    if (ips.length === 0) return [];

    const hits: Array<{ ip: string; port: number; sourceType: string }> = [];

    // Process IPs in batches to avoid nmap argument overflow
    const batchSize = 32;
    for (let i = 0; i < ips.length; i += batchSize) {
      const batch = ips.slice(i, i + batchSize);
      const args = [
        '-sV',                // Service/version detection
        '--open',             // Only show open ports
        '-T4',                // Aggressive timing
        '--version-intensity', '5',
        '-p', portSpec,
        ...batch,
      ];

      try {
        const { stdout } = await execFileAsync('nmap', args, {
          timeout: AutoScanService.NMAP_TIMEOUT_MS,
        });
        hits.push(...this.parseNmapOutput(stdout));
      } catch (error) {
        // If nmap fails for a batch, log and continue with next batch
        console.error(
          `nmap scan failed for batch starting at index ${i}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }

    return hits;
  }

  /**
   * Parse nmap text output and extract database service hits.
   *
   * nmap output format:
   *   Nmap scan report for <host> (<ip>)
   *   PORT     STATE SERVICE VERSION
   *   3306/tcp open  mysql   MySQL 8.4.8
   */
  private parseNmapOutput(
    output: string,
  ): Array<{ ip: string; port: number; sourceType: string }> {
    const hits: Array<{ ip: string; port: number; sourceType: string }> = [];
    let currentIp = '';

    for (const line of output.split('\n')) {
      // Match host line: "Nmap scan report for hostname (1.2.3.4)" or "Nmap scan report for 1.2.3.4"
      const hostMatch = line.match(
        /Nmap scan report for .*?(\d+\.\d+\.\d+\.\d+)/,
      );
      if (hostMatch) {
        currentIp = hostMatch[1];
        continue;
      }

      // Match port line: "3306/tcp open  mysql   MySQL 8.4.8"
      const portMatch = line.match(
        /^(\d+)\/tcp\s+open\s+(\S+)\s*(.*)?$/,
      );
      if (portMatch && currentIp) {
        const port = Number(portMatch[1]);
        const serviceName = portMatch[2];
        const versionInfo = portMatch[3]?.trim() ?? '';
        const combined = `${serviceName} ${versionInfo}`;

        const sourceType = this.normalizeServiceName(combined);
        if (sourceType) {
          hits.push({ ip: currentIp, port, sourceType });
        }
      }
    }

    return hits;
  }

  private async findResultWithRelations(id: string) {
    return this.prisma.autoScanResult.findUnique({
      where: { id },
      include: { scanRule: true, assetGroup: true, dataAsset: true },
    });
  }

  async seed() {
    const count = await this.prisma.autoScanRule.count();
    if (count > 0) return;

    const assetGroup = await this.prisma.assetGroup.findFirst({ orderBy: { createdAt: 'asc' } });

    const rule = await this.prisma.autoScanRule.create({
      data: {
        name: '每日 MySQL 资产扫描',
        cronExpression: '0 2 * * *',
        assetGroupId: assetGroup?.id,
        sourceType: 'mysql',
        status: ScanTaskStatus.RUNNING,
        description: '自动发现新增数据库实例',
      },
    });

    await this.prisma.autoScanResult.create({
      data: {
        scanRuleId: rule.id,
        assetGroupId: assetGroup?.id,
        sourceName: '订单中心只读库',
        sourceType: 'mysql',
        ipAddress: '10.10.2.18',
        port: 3306,
        databaseName: 'order_center',
        owner: '李四',
        department: '交易平台部',
        status: ScanTaskStatus.COMPLETED,
        claimed: false,
      },
    });
  }

  async listRules() {
    return this.prisma.autoScanRule.findMany({
      include: { assetGroup: true, results: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listResults() {
    const results = await this.prisma.autoScanResult.findMany({
      include: { scanRule: true, assetGroup: true, dataAsset: true },
      orderBy: { createdAt: 'desc' },
    });

    // Batch lookup: find ImportTasks matching any (ipAddress, port) in results
    const ipPortPairs = [...new Set(results.map((r) => `${r.ipAddress}:${r.port}`))];
    const importTasks = await this.prisma.importTask.findMany({
      where: {
        OR: ipPortPairs.map((pair) => {
          const [ipAddress, port] = pair.split(':');
          return { ipAddress, port: Number(port) };
        }),
      },
      select: { id: true, ipAddress: true, port: true },
    });

    const importTaskMap = new Map<string, string>();
    for (const task of importTasks) {
      importTaskMap.set(`${task.ipAddress}:${task.port}`, task.id);
    }

    return results.map((r) => ({
      ...r,
      importTaskId: importTaskMap.get(`${r.ipAddress}:${r.port}`) ?? null,
    }));
  }

  async createRule(dto: CreateAutoScanRuleDto) {
    const rule = await this.prisma.autoScanRule.create({
      data: {
        ...dto,
        status: dto.status ?? ScanTaskStatus.DRAFT,
      },
      include: { assetGroup: true, results: true },
    });

    await this.auditLogsService.record({
      category: AuditLogCategory.AUTO_SCAN,
      action: '创建自动扫描规则',
      result: AuditLogResult.SUCCESS,
      actorName: '当前用户',
      targetType: 'auto-scan-rule',
      targetId: rule.id,
      targetName: rule.name,
      detail: rule.description ?? '自动扫描规则已创建',
    });

    return rule;
  }

  async updateRule(id: string, dto: UpdateAutoScanRuleDto) {
    const rule = await this.prisma.autoScanRule.update({
      where: { id },
      data: dto,
      include: { assetGroup: true, results: true },
    });

    await this.auditLogsService.record({
      category: AuditLogCategory.AUTO_SCAN,
      action: '更新自动扫描规则',
      result: AuditLogResult.SUCCESS,
      actorName: '当前用户',
      targetType: 'auto-scan-rule',
      targetId: rule.id,
      targetName: rule.name,
      detail: rule.description ?? '自动扫描规则已更新',
    });

    return rule;
  }

  async removeRule(id: string) {
    await this.prisma.autoScanResult.deleteMany({ where: { scanRuleId: id } });
    const rule = await this.prisma.autoScanRule.delete({ where: { id } });

    await this.auditLogsService.record({
      category: AuditLogCategory.AUTO_SCAN,
      action: '删除自动扫描规则',
      result: AuditLogResult.SUCCESS,
      actorName: '当前用户',
      targetType: 'auto-scan-rule',
      targetId: rule.id,
      targetName: rule.name,
      detail: '自动扫描规则已删除',
    });

    return rule;
  }

  async executeScan(ruleId: string) {
    // Validate rule exists before returning
    const rule = await this.prisma.autoScanRule.findUniqueOrThrow({
      where: { id: ruleId },
    });

    // Fire and forget — run scan in background
    this.runScan(rule).catch((error) => {
      console.error('Background scan failed:', error);
    });

    return { message: '扫描任务已提交' };
  }

  private async runScan(rule: { id: string; name: string; sourceType: string | null; assetGroupId: string | null }) {
    const updateProgress = (progress: number, status: string) =>
      this.prisma.autoScanRule.update({ where: { id: rule.id }, data: { scanProgress: progress, scanStatus: status } });

    await updateProgress(0, '准备扫描');

    await this.auditLogsService.record({
      category: AuditLogCategory.AUTO_SCAN,
      action: '执行自动扫描',
      result: AuditLogResult.RUNNING,
      actorName: '系统',
      targetType: 'auto-scan',
      targetName: '自动扫描任务',
      detail: '开始执行自动扫描',
    });

    try {
      // rule.name stores ipRange, rule.sourceType stores portRange
      const ips = this.expandIpRange(rule.name);
      const portSpec = (rule.sourceType ?? '').trim();
      const nmapPortSpec = (!portSpec || portSpec === '0') ? '1-65535' : portSpec;

      await updateProgress(5, `正在扫描 ${ips.length} 个 IP`);
      let createdResultCount = 0;
      const hits = await this.nmapScan(ips, nmapPortSpec);

      await updateProgress(50, `发现 ${hits.length} 条结果，正在入库`);
      for (let i = 0; i < hits.length; i++) {
        const hit = hits[i];
        const percent = 50 + Math.round(((i + 1) / hits.length) * 45);

        const existing = await this.prisma.autoScanResult.findFirst({
          where: {
            scanRuleId: rule.id,
            ipAddress: hit.ip,
            port: hit.port,
            ignoredAt: null,
          },
        });

        if (existing) {
          await this.prisma.autoScanResult.update({
            where: { id: existing.id },
            data: { updatedAt: new Date() },
          });
        } else {
          await this.prisma.autoScanResult.create({
            data: {
              scanRuleId: rule.id,
              assetGroupId: rule.assetGroupId,
              sourceName: `${hit.ip}:${hit.port}`,
              sourceType: hit.sourceType,
              ipAddress: hit.ip,
              port: hit.port,
              owner: '自动扫描',
              department: '待分配',
              status: ScanTaskStatus.COMPLETED,
              claimed: false,
            },
          });
          createdResultCount += 1;
        }

        if (i % 5 === 0 || i === hits.length - 1) {
          await updateProgress(percent, `正在入库 ${i + 1}/${hits.length}`);
        }
      }

      const pendingCount = await this.prisma.autoScanResult.count({
        where: { scanRuleId: rule.id, claimed: false, ignoredAt: null },
      });

      await this.prisma.autoScanRule.update({
        where: { id: rule.id },
        data: { lastScannedAt: new Date(), scanProgress: 100, scanStatus: `完成，新增 ${createdResultCount} 条` },
      });

      const summary = {
        touchedRuleCount: 1,
        createdResultCount,
        matchedResultCount: pendingCount,
      };

      await this.auditLogsService.record({
        category: AuditLogCategory.AUTO_SCAN,
        action: '执行自动扫描',
        result: AuditLogResult.SUCCESS,
        actorName: '系统',
        targetType: 'auto-scan',
        targetName: '自动扫描任务',
        detail: `自动扫描完成，新发现 ${createdResultCount} 个开放端口，共 ${pendingCount} 条待处理结果`,
        metadata: summary,
      });
    } catch (error) {
      await this.prisma.autoScanRule.update({
        where: { id: rule.id },
        data: { scanProgress: -1, scanStatus: error instanceof Error ? error.message : '扫描失败' },
      }).catch(() => {});
      await this.auditLogsService.record({
        category: AuditLogCategory.AUTO_SCAN,
        action: '执行自动扫描',
        result: AuditLogResult.FAILED,
        actorName: '系统',
        targetType: 'auto-scan',
        targetName: '自动扫描任务',
        detail: error instanceof Error ? error.message : '自动扫描执行失败',
      });
    }
  }

  async ignoreResult(id: string, reason: string) {
    const normalizedReason = reason?.trim();
    if (!normalizedReason) return null;

    await this.prisma.autoScanResult.update({
      where: { id },
      data: {
        ignoreReason: normalizedReason,
        ignoredAt: new Date(),
      },
    });

    const result = await this.findResultWithRelations(id);
    if (result) {
      await this.auditLogsService.record({
        category: AuditLogCategory.AUTO_SCAN,
        action: '忽略扫描结果',
        result: AuditLogResult.SUCCESS,
        actorName: '当前用户',
        targetType: 'auto-scan-result',
        targetId: result.id,
        targetName: result.sourceName,
        detail: normalizedReason,
      });
    }

    return result;
  }

  async cancelIgnoreResult(id: string) {
    await this.prisma.autoScanResult.update({
      where: { id },
      data: {
        ignoreReason: null,
        ignoredAt: null,
      },
    });

    const result = await this.findResultWithRelations(id);
    if (result) {
      await this.auditLogsService.record({
        category: AuditLogCategory.AUTO_SCAN,
        action: '取消忽略扫描结果',
        result: AuditLogResult.SUCCESS,
        actorName: '当前用户',
        targetType: 'auto-scan-result',
        targetId: result.id,
        targetName: result.sourceName,
        detail: '扫描结果重新恢复为待处理状态',
      });
    }

    return result;
  }

  async claimResult(id: string) {
    const result = await this.prisma.autoScanResult.findUnique({ where: { id } });
    if (!result) return null;

    let asset = await this.prisma.dataAsset.findFirst({ where: { scanResultId: id } });
    if (!asset) {
      const assetGroup = result.assetGroupId
        ? await this.prisma.assetGroup.findUnique({ where: { id: result.assetGroupId } })
        : await this.prisma.assetGroup.findFirst({ orderBy: { createdAt: 'asc' } });

      if (!assetGroup) return null;

      asset = await this.prisma.dataAsset.create({
        data: {
          name: result.sourceName,
          sourceType: result.sourceType,
          ipAddress: result.ipAddress,
          port: result.port,
          status: CommonStatus.ACTIVE,
          dataLevel: DataLevel.INTERNAL,
          owner: result.owner ?? '待认领',
          department: result.department ?? '待分配',
          description: `由扫描结果 ${result.id} 自动认领生成`,
          assetGroupId: assetGroup.id,
          scanResultId: result.id,
        },
      });
    }

    await this.prisma.autoScanResult.update({
      where: { id },
      data: {
        claimed: true,
        ignoreReason: null,
        ignoredAt: null,
      },
    });

    const claimedResult = await this.findResultWithRelations(id);
    if (claimedResult) {
      await this.auditLogsService.record({
        category: AuditLogCategory.AUTO_SCAN,
        action: '认领扫描结果',
        result: AuditLogResult.SUCCESS,
        actorName: '当前用户',
        targetType: 'auto-scan-result',
        targetId: claimedResult.id,
        targetName: claimedResult.sourceName,
        detail: '扫描结果已转为数据资产',
        metadata: {
          dataAssetId: claimedResult.dataAsset?.id ?? asset?.id ?? null,
        },
      });
    }

    return claimedResult;
  }
}
