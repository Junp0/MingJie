import { Injectable } from '@nestjs/common';
import {
  AuditLogCategory,
  AuditLogResult,
  CommonStatus,
  DataLevel,
  ScanTaskStatus,
} from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAutoScanRuleDto } from './dto/create-auto-scan-rule.dto';
import { UpdateAutoScanRuleDto } from './dto/update-auto-scan-rule.dto';

@Injectable()
export class AutoScanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  private parsePort(value?: string | null): number {
    if (!value) return 3306;
    const matched = value.match(/\d+/);
    return matched ? Number(matched[0]) : 3306;
  }

  private buildIpAddress(ruleName: string, sequence: number): string {
    const cidrHost = ruleName.match(/(\d+\.\d+\.\d+)\.\d+(?:\/\d+)?/);
    if (cidrHost) {
      return `${cidrHost[1]}.${10 + sequence}`;
    }

    const directHost = ruleName.match(/(\d+\.\d+\.\d+\.\d+)/);
    if (directHost) {
      return directHost[1];
    }

    return `10.10.${Math.min(99, sequence)}.${20 + sequence}`;
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
    return this.prisma.autoScanResult.findMany({
      include: { scanRule: true, assetGroup: true, dataAsset: true },
      orderBy: { createdAt: 'desc' },
    });
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

  async executeScan() {
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
      const rules = await this.prisma.autoScanRule.findMany({
        where: { status: ScanTaskStatus.RUNNING },
        orderBy: { createdAt: 'desc' },
      });

      let createdResultCount = 0;

      for (const [index, rule] of rules.entries()) {
        const existingCount = await this.prisma.autoScanResult.count({
          where: { scanRuleId: rule.id },
        });

        await this.prisma.autoScanResult.create({
          data: {
            scanRuleId: rule.id,
            assetGroupId: rule.assetGroupId,
            sourceName: `${rule.name}-scan-${existingCount + 1}`,
            sourceType: 'mysql',
            ipAddress: this.buildIpAddress(rule.name, existingCount + index + 1),
            port: this.parsePort(rule.sourceType),
            databaseName: `auto_scan_${existingCount + 1}`,
            owner: '自动扫描',
            department: '数据治理平台',
            status: ScanTaskStatus.COMPLETED,
            claimed: false,
          },
        });
        createdResultCount += 1;
      }

      const pendingCount = await this.prisma.autoScanResult.count({
        where: { claimed: false, ignoredAt: null },
      });

      const summary = {
        touchedRuleCount: rules.length,
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
        detail: `自动扫描完成，命中 ${pendingCount} 条待处理结果`,
        metadata: summary,
      });

      return summary;
    } catch (error) {
      await this.auditLogsService.record({
        category: AuditLogCategory.AUTO_SCAN,
        action: '执行自动扫描',
        result: AuditLogResult.FAILED,
        actorName: '系统',
        targetType: 'auto-scan',
        targetName: '自动扫描任务',
        detail: error instanceof Error ? error.message : '自动扫描执行失败',
      });
      throw error;
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
