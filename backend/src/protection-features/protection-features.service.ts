import { Injectable } from '@nestjs/common';
import {
  AuditLogCategory,
  AuditLogResult,
  ProtectionFeatureStatus,
  ProtectionFeatureType,
} from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProtectionFeatureDto } from './dto/create-protection-feature.dto';
import { UpdateProtectionFeatureDto } from './dto/update-protection-feature.dto';
import {
  BUILT_IN_PROTECTION_FEATURES,
  RETIRED_BUILT_IN_MASKING_FEATURE_CODES,
} from './protection-feature-catalog';

@Injectable()
export class ProtectionFeaturesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  private normalizeType(type?: string): ProtectionFeatureType | undefined {
    if (!type) {
      return undefined;
    }

    const normalizedType = type.split(/[?&]/)[0];
    if (normalizedType === ProtectionFeatureType.MASKING) {
      return ProtectionFeatureType.MASKING;
    }
    if (normalizedType === ProtectionFeatureType.ENCRYPTION) {
      return ProtectionFeatureType.ENCRYPTION;
    }

    return undefined;
  }

  async seed() {
    return this.installBuiltInCatalog();
  }

  async installBuiltInCatalog() {
    await this.prisma.protectionFeature.deleteMany({
      where: {
        featureType: ProtectionFeatureType.MASKING,
        featureCode: { in: [...RETIRED_BUILT_IN_MASKING_FEATURE_CODES] },
      },
    });

    const featureCodes = BUILT_IN_PROTECTION_FEATURES.map(
      (feature) => feature.featureCode,
    );
    const existingFeatures = await this.prisma.protectionFeature.findMany({
      where: { featureCode: { in: featureCodes } },
      select: { featureCode: true },
    });
    const existingCodes = new Set(
      existingFeatures
        .map((feature) => feature.featureCode)
        .filter((code): code is string => Boolean(code)),
    );
    const missingFeatures = BUILT_IN_PROTECTION_FEATURES.filter(
      (feature) => !existingCodes.has(feature.featureCode),
    );

    if (missingFeatures.length === 0) return 0;

    const creator = await this.prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
    const result = await this.prisma.protectionFeature.createMany({
      data: missingFeatures.map((feature) => ({
        ...feature,
        creatorId: creator?.id,
      })),
    });

    return result.count;
  }

  async findAll(type?: string) {
    const normalizedType = this.normalizeType(type);
    return this.prisma.protectionFeature.findMany({
      where: normalizedType ? { featureType: normalizedType } : undefined,
      include: { creator: true },
      orderBy: [{ featureType: 'asc' }, { priority: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async create(dto: CreateProtectionFeatureDto) {
    const feature = await this.prisma.protectionFeature.create({
      data: {
        ...dto,
        status: dto.status ?? ProtectionFeatureStatus.ACTIVE,
      },
      include: { creator: true },
    });

    await this.auditLogsService.record({
      category: AuditLogCategory.PROTECTION_FEATURE,
      action: '创建保护特征',
      result: AuditLogResult.SUCCESS,
      actorId: feature.creatorId,
      actorName: feature.creator?.name ?? '当前用户',
      targetType: 'protection-feature',
      targetId: feature.id,
      targetName: feature.featureName,
      detail: `${feature.featureType} 特征已创建`,
    });

    return feature;
  }

  async update(id: string, dto: UpdateProtectionFeatureDto) {
    const feature = await this.prisma.protectionFeature.update({
      where: { id },
      data: dto,
      include: { creator: true },
    });

    await this.auditLogsService.record({
      category: AuditLogCategory.PROTECTION_FEATURE,
      action: '更新保护特征',
      result: AuditLogResult.SUCCESS,
      actorId: feature.creatorId,
      actorName: feature.creator?.name ?? '当前用户',
      targetType: 'protection-feature',
      targetId: feature.id,
      targetName: feature.featureName,
      detail: `${feature.featureType} 特征配置已更新`,
    });

    return feature;
  }

  async remove(id: string) {
    const feature = await this.prisma.protectionFeature.delete({ where: { id } });

    await this.auditLogsService.record({
      category: AuditLogCategory.PROTECTION_FEATURE,
      action: '删除保护特征',
      result: AuditLogResult.SUCCESS,
      actorName: '当前用户',
      targetType: 'protection-feature',
      targetId: feature.id,
      targetName: feature.featureName,
      detail: `${feature.featureType} 特征已删除`,
    });

    return feature;
  }
}
