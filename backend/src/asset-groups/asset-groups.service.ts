import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditLogCategory, AuditLogResult, Prisma } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetGroupDto } from './dto/create-asset-group.dto';
import { UpdateAssetGroupDto } from './dto/update-asset-group.dto';

const DEFAULT_DEPARTMENTS = [
  '数据平台部',
  '账号中台部',
  '增长分析部',
  '安全风控部',
  '交易平台部',
  '财务科技部',
  '基础架构部',
];

@Injectable()
export class AssetGroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  private normalizeName(name: string) {
    const normalized = name.trim();
    if (!normalized) {
      throw new BadRequestException('名称不能为空');
    }
    return normalized;
  }

  private normalizeOptionalText(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private async ensureDepartmentExists(name?: string | null) {
    const normalized = this.normalizeOptionalText(name);
    if (!normalized) {
      return;
    }

    await this.prisma.assetGroupDepartment.upsert({
      where: { name: normalized },
      update: {},
      create: { name: normalized },
    });
  }

  private async ensureDefaultDepartments() {
    await Promise.all(
      DEFAULT_DEPARTMENTS.map((name) => this.ensureDepartmentExists(name)),
    );
  }

  private async syncDepartmentsFromGroups() {
    const departments = await this.prisma.assetGroup.findMany({
      where: { department: { not: null } },
      select: { department: true },
    });

    const uniqueDepartmentNames = Array.from(
      new Set(
        departments
          .map((item) => this.normalizeOptionalText(item.department))
          .filter((item): item is string => Boolean(item)),
      ),
    );

    await Promise.all(uniqueDepartmentNames.map((name) => this.ensureDepartmentExists(name)));
  }

  async seed() {
    await this.ensureDefaultDepartments();

    const count = await this.prisma.assetGroup.count();
    if (count > 0) {
      await this.syncDepartmentsFromGroups();
      return;
    }

    const roots = [
      { name: '用户数据域', owner: '张三', department: '数据平台部' },
      { name: '交易经营域', owner: '李四', department: '交易平台部' },
      { name: '基础设施域', owner: '王五', department: '基础架构部' },
    ];

    for (const item of roots) {
      await this.prisma.assetGroup.create({
        data: {
          ...item,
          level: 1,
          description: `${item.name}默认根分组`,
        },
      });
    }

    await this.syncDepartmentsFromGroups();
  }

  async findAll() {
    return this.prisma.assetGroup.findMany({
      orderBy: [{ level: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findDepartments() {
    await this.syncDepartmentsFromGroups();

    const [departments, usage] = await Promise.all([
      this.prisma.assetGroupDepartment.findMany({
        orderBy: { name: 'asc' },
      }),
      this.prisma.assetGroup.groupBy({
        by: ['department'],
        where: { department: { not: null } },
        _count: { _all: true },
      }),
    ]);

    const usageCountByName = new Map(
      usage
        .filter((item) => item.department)
        .map((item) => [item.department as string, item._count._all]),
    );

    return departments.map((department) => {
      const usageCount = usageCountByName.get(department.name) ?? 0;
      return {
        id: department.id,
        name: department.name,
        usageCount,
        inUse: usageCount > 0,
      };
    });
  }

  async create(dto: CreateAssetGroupDto) {
    const data: Prisma.AssetGroupUncheckedCreateInput = {
      name: this.normalizeName(dto.name),
      description: this.normalizeOptionalText(dto.description),
      parentId: dto.parentId ?? null,
      level: dto.level ?? 1,
      owner: this.normalizeOptionalText(dto.owner),
      department: this.normalizeOptionalText(dto.department),
    };

    const group = await this.prisma.assetGroup.create({
      data,
    });

    await this.ensureDepartmentExists(group.department);
    await this.auditLogsService.record({
      category: AuditLogCategory.ASSET_GROUP,
      action: '创建资产分组',
      result: AuditLogResult.SUCCESS,
      actorName: '当前用户',
      targetType: 'asset-group',
      targetId: group.id,
      targetName: group.name,
      detail: dto.description ?? '创建新的资产分组',
    });

    return group;
  }

  async update(id: string, dto: UpdateAssetGroupDto) {
    const data: Prisma.AssetGroupUncheckedUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = this.normalizeName(dto.name);
    }
    if (dto.description !== undefined) {
      data.description = this.normalizeOptionalText(dto.description);
    }
    if (dto.parentId !== undefined) {
      data.parentId = dto.parentId;
    }
    if (dto.level !== undefined) {
      data.level = dto.level;
    }
    if (dto.owner !== undefined) {
      data.owner = this.normalizeOptionalText(dto.owner);
    }
    if (dto.department !== undefined) {
      data.department = this.normalizeOptionalText(dto.department);
    }

    const group = await this.prisma.assetGroup.update({
      where: { id },
      data,
    });

    await this.ensureDepartmentExists(group.department);
    await this.auditLogsService.record({
      category: AuditLogCategory.ASSET_GROUP,
      action: '更新资产分组',
      result: AuditLogResult.SUCCESS,
      actorName: '当前用户',
      targetType: 'asset-group',
      targetId: group.id,
      targetName: group.name,
      detail: dto.description ?? '更新资产分组配置',
    });

    return group;
  }

  async removeDepartment(id: string) {
    const department = await this.prisma.assetGroupDepartment.findUnique({
      where: { id },
    });

    if (!department) {
      throw new NotFoundException('归属部门选项不存在');
    }

    const usageCount = await this.prisma.assetGroup.count({
      where: { department: department.name },
    });

    if (usageCount > 0) {
      throw new BadRequestException('该归属部门正在被资产分组使用，无法删除');
    }

    await this.prisma.assetGroupDepartment.delete({
      where: { id },
    });

    return { success: true };
  }

  async remove(id: string) {
    const group = await this.prisma.assetGroup.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            children: true,
            dataAssets: true,
            importTasks: true,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('资产分组不存在');
    }

    if (group._count.children > 0) {
      throw new BadRequestException('请先处理当前分组下的子分组，再删除该分组');
    }

    if (group._count.dataAssets > 0 || group._count.importTasks > 0) {
      throw new BadRequestException('请先迁移当前分组下的关联数据，再删除该分组');
    }

    await this.prisma.assetGroup.delete({ where: { id } });

    await this.auditLogsService.record({
      category: AuditLogCategory.ASSET_GROUP,
      action: '删除资产分组',
      result: AuditLogResult.SUCCESS,
      actorName: '当前用户',
      targetType: 'asset-group',
      targetId: group.id,
      targetName: group.name,
      detail: '资产分组已删除',
    });

    return { success: true };
  }
}
