import { Injectable } from '@nestjs/common';
import { ImportTaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateImportTaskDto } from './dto/create-import-task.dto';
import { UpdateImportTaskDto } from './dto/update-import-task.dto';

@Injectable()
export class ImportTasksService {
  constructor(private readonly prisma: PrismaService) {}

  async seed() {
    const count = await this.prisma.importTask.count();
    if (count > 0) return;

    const assetGroup = await this.prisma.assetGroup.findFirst({ orderBy: { createdAt: 'asc' } });
    const creator = await this.prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!assetGroup) return;

    await this.prisma.importTask.create({
      data: {
        sourceName: '用户中心主库',
        sourceType: 'mysql',
        ipAddress: '10.10.0.12',
        port: 3306,
        databaseName: 'user_center',
        assetGroupId: assetGroup.id,
        creatorId: creator?.id,
        status: ImportTaskStatus.SUCCESS,
        progress: 100,
        description: '系统初始化导入任务',
      },
      include: { assetGroup: true, creator: true },
    });
  }

  async findAll() {
    await this.seed();
    return this.prisma.importTask.findMany({
      include: { assetGroup: true, creator: true, classificationTask: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(dto: CreateImportTaskDto) {
    return this.prisma.importTask.create({
      data: {
        ...dto,
        status: dto.status ?? ImportTaskStatus.PENDING,
        progress: dto.progress ?? 0,
      },
      include: { assetGroup: true, creator: true, classificationTask: true },
    });
  }

  update(id: string, dto: UpdateImportTaskDto) {
    return this.prisma.importTask.update({
      where: { id },
      data: dto,
      include: { assetGroup: true, creator: true, classificationTask: true },
    });
  }

  remove(id: string) {
    return this.prisma.importTask.delete({ where: { id } });
  }
}
