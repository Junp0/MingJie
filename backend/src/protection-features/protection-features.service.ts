import { Injectable } from '@nestjs/common';
import { ProtectionFeatureStatus, ProtectionFeatureType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProtectionFeatureDto } from './dto/create-protection-feature.dto';
import { UpdateProtectionFeatureDto } from './dto/update-protection-feature.dto';

@Injectable()
export class ProtectionFeaturesService {
  constructor(private readonly prisma: PrismaService) {}

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
          confidence: 95,
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
          confidence: 88,
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

  async findAll(type?: ProtectionFeatureType) {
    await this.seed();
    return this.prisma.protectionFeature.findMany({
      where: type ? { featureType: type } : undefined,
      include: { creator: true },
      orderBy: [{ featureType: 'asc' }, { priority: 'asc' }, { createdAt: 'desc' }],
    });
  }

  create(dto: CreateProtectionFeatureDto) {
    return this.prisma.protectionFeature.create({
      data: {
        ...dto,
        status: dto.status ?? ProtectionFeatureStatus.ACTIVE,
      },
      include: { creator: true },
    });
  }

  update(id: string, dto: UpdateProtectionFeatureDto) {
    return this.prisma.protectionFeature.update({
      where: { id },
      data: dto,
      include: { creator: true },
    });
  }

  remove(id: string) {
    return this.prisma.protectionFeature.delete({ where: { id } });
  }
}
