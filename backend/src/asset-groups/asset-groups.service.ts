import { Injectable } from '@nestjs/common';
import { AuditLogCategory, AuditLogResult, CommonStatus } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetGroupDto } from './dto/create-asset-group.dto';
import { UpdateAssetGroupDto } from './dto/update-asset-group.dto';

@Injectable()
export class AssetGroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async seed() {
    const count = await this.prisma.assetGroup.count();
    if (count > 0) return;

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
          status: CommonStatus.ACTIVE,
          description: `${item.name}默认根分组`,
        },
      });
    }
  }

  async findAll() {
    return this.prisma.assetGroup.findMany({
      orderBy: [{ level: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(dto: CreateAssetGroupDto) {
    const group = await this.prisma.assetGroup.create({
      data: {
        name: dto.name,
        description: dto.description,
        parentId: dto.parentId,
        level: dto.level ?? 1,
        owner: dto.owner,
        department: dto.department,
        status: dto.status ?? CommonStatus.ACTIVE,
      },
    });

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
    const group = await this.prisma.assetGroup.update({
      where: { id },
      data: dto,
    });

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

  async remove(id: string) {
    const group = await this.prisma.assetGroup.delete({ where: { id } });

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

    return group;
  }
}
