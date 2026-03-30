import { Injectable } from '@nestjs/common';
import { CommonStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetGroupDto } from './dto/create-asset-group.dto';
import { UpdateAssetGroupDto } from './dto/update-asset-group.dto';

@Injectable()
export class AssetGroupsService {
  constructor(private readonly prisma: PrismaService) {}

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

  create(dto: CreateAssetGroupDto) {
    return this.prisma.assetGroup.create({
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
  }

  update(id: string, dto: UpdateAssetGroupDto) {
    return this.prisma.assetGroup.update({
      where: { id },
      data: dto,
    });
  }

  remove(id: string) {
    return this.prisma.assetGroup.delete({ where: { id } });
  }
}
