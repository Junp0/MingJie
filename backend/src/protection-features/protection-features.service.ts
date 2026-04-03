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
    const count = await this.prisma.protectionFeature.count();
    if (count > 0) return;

    const creator = await this.prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });

    await this.prisma.protectionFeature.createMany({
      data: [
        {
          featureType: ProtectionFeatureType.MASKING,
          featureName: '手机号脱敏识别',
          featureCode: 'MASK_PHONE',
          scene: '通用脱敏形态',
          featurePoint: '中间4位替换为*',
          matcher: 'regex',
          hitRate: 95,
          priority: 10,
          expression: '^1\\d{2}\\*{4}\\d{4}$',
          sampleValue: '138****1234',
          status: ProtectionFeatureStatus.ACTIVE,
          description: '识别手机号脱敏结果',
          creatorId: creator?.id,
        },
        {
          featureType: ProtectionFeatureType.ENCRYPTION,
          featureName: 'SHA256摘要识别',
          featureCode: 'ENC_SHA256',
          scene: '摘要哈希',
          featurePoint: '64位十六进制摘要串',
          matcher: 'regex',
          hitRate: 88,
          priority: 20,
          expression: '^[A-Fa-f0-9]{64}$',
          sampleValue: '9f86d081884c7d659a2feaa0c55ad015...',
          status: ProtectionFeatureStatus.ACTIVE,
          description: '识别常见 SHA256 摘要字段',
          creatorId: creator?.id,
        },
      ],
    });
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
