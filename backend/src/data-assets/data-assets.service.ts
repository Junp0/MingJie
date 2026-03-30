import { Injectable } from '@nestjs/common';
import { CommonStatus, DataLevel } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDataAssetDto } from './dto/create-data-asset.dto';
import { UpdateDataAssetDto } from './dto/update-data-asset.dto';

@Injectable()
export class DataAssetsService {
  constructor(private readonly prisma: PrismaService) {}

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
          sourceDatabaseName: 'user_center',
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
      include: { assetGroup: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(dto: CreateDataAssetDto) {
    return this.prisma.dataAsset.create({
      data: {
        ...dto,
        tags: dto.tags ?? [],
        sourceDatabaseName: dto.sourceDatabaseName,
        tableCount: dto.tableCount ?? 0,
        fieldCount: dto.fieldCount ?? 0,
        sizeBytes: dto.sizeBytes ?? 0,
        recordCount: dto.recordCount ?? 0,
      },
      include: { assetGroup: true },
    });
  }

  update(id: string, dto: UpdateDataAssetDto) {
    return this.prisma.dataAsset.update({
      where: { id },
      data: {
        ...dto,
        tags: dto.tags,
      },
      include: { assetGroup: true },
    });
  }

  remove(id: string) {
    return this.prisma.dataAsset.delete({ where: { id } });
  }
}
