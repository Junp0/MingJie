import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AuditLogCategory,
  AuditLogResult,
  ClassificationTaskSource,
  CommonStatus,
  DataLevel,
  Prisma,
} from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDataAssetDto } from './dto/create-data-asset.dto';
import { UpdateDataAssetDto } from './dto/update-data-asset.dto';

@Injectable()
export class DataAssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  private getInclude() {
    return {
      assetGroup: true,
      importTasks: {
        where: { status: 'SUCCESS' as const },
        orderBy: { updatedAt: 'desc' as const },
        take: 1,
      },
    } as const;
  }

  private normalizeAssetIds(value: unknown) {
    if (!Array.isArray(value)) return [];
    return Array.from(
      new Set(
        value
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );
  }

  async seed() {
    const count = await this.prisma.dataAsset.count();
    if (count > 0) return;

    const firstGroup = await this.prisma.assetGroup.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!firstGroup) return;

    await this.prisma.dataAsset.createMany({
      data: [
        {
          name: '用户中心 MySQL 主库',
          sourceType: 'mysql',
          ipAddress: '10.10.0.12',
          port: 3306,
          status: CommonStatus.ACTIVE,
          dataLevel: DataLevel.CONFIDENTIAL,
          owner: '张三',
          department: '数据平台部',
          tags: JSON.stringify(['mysql', '用户', '核心']),
          description: '用户账号、手机号、实名信息主库',
          tableCount: 12,
          fieldCount: 96,
          sizeBytes: 52428800,
          recordCount: 250000,
          assetGroupId: firstGroup.id,
        },
      ],
    });
  }

  async findAll() {
    return this.prisma.dataAsset.findMany({
      include: this.getInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  create(dto: CreateDataAssetDto) {
    return this.prisma.dataAsset.create({
      data: {
        ...dto,
        tags: dto.tags ?? [],
        tableCount: dto.tableCount ?? 0,
        fieldCount: dto.fieldCount ?? 0,
        sizeBytes: dto.sizeBytes ?? 0,
        recordCount: dto.recordCount ?? 0,
      },
      include: this.getInclude(),
    });
  }

  update(id: string, dto: UpdateDataAssetDto) {
    return this.prisma.dataAsset.update({
      where: { id },
      data: {
        ...dto,
        tags: dto.tags,
      },
      include: this.getInclude(),
    });
  }

  async remove(id: string) {
    const asset = await this.prisma.dataAsset.findUnique({
      where: { id },
      include: {
        importTasks: {
          select: { id: true },
        },
      },
    });

    if (!asset) {
      throw new NotFoundException('数据资产不存在');
    }

    // 1. Unlink this asset from all classification tasks that reference it
    const classificationTasks = await this.prisma.classificationTask.findMany({
      where: {
        NOT: { dataAssetIds: { equals: Prisma.DbNull } },
      },
    });

    for (const ct of classificationTasks) {
      const assetIds = this.normalizeAssetIds(ct.dataAssetIds);
      if (!assetIds.includes(id)) continue;

      const nextAssetIds = assetIds.filter((aid) => aid !== id);

      if (
        nextAssetIds.length === 0 &&
        ct.source === ClassificationTaskSource.ASSET_IMPORT
      ) {
        // If no assets left and it was created from import, check if any other import tasks reference it
        const linkedImportCount = await this.prisma.importTask.count({
          where: { classificationTaskId: ct.id },
        });
        if (linkedImportCount === 0) {
          await this.prisma.classificationTask.delete({ where: { id: ct.id } });
          continue;
        }
      }

      const nextAssets = nextAssetIds.length
        ? await this.prisma.dataAsset.findMany({
            where: { id: { in: nextAssetIds } },
            select: { name: true },
          })
        : [];

      await this.prisma.classificationTask.update({
        where: { id: ct.id },
        data: {
          dataAssetIds: nextAssetIds as Prisma.InputJsonValue,
          dataSource: nextAssets.map((a) => a.name).join('、') || '未关联数据资产',
        },
      });
    }

    // 2. Disconnect import tasks from this asset (don't delete them, just unlink)
    await this.prisma.importTask.updateMany({
      where: { dataAssetId: id },
      data: { dataAssetId: null },
    });

    // 3. Delete the data asset (tables & columns cascade via schema)
    await this.prisma.dataAsset.delete({ where: { id } });

    await this.auditLogsService.record({
      category: AuditLogCategory.ASSET_GROUP,
      action: '删除数据资产',
      result: AuditLogResult.SUCCESS,
      targetType: 'data-asset',
      targetId: id,
      targetName: asset.name,
      detail: `删除数据资产: ${asset.name}（${asset.ipAddress}:${asset.port}）`,
    });

    return { success: true };
  }
}
