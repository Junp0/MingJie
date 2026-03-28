import { Injectable } from '@nestjs/common';
import { ClassificationTaskSource, ClassificationTaskStatus, TemplateStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassificationTaskDto } from './dto/create-classification-task.dto';
import { UpdateClassificationTaskDto } from './dto/update-classification-task.dto';

@Injectable()
export class ClassificationTasksService {
  constructor(private readonly prisma: PrismaService) {}

  async seed() {
    const count = await this.prisma.classificationTask.count();
    if (count > 0) return;

    const creator = await this.prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
    let template = await this.prisma.classificationTemplate.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!template) {
      template = await this.prisma.classificationTemplate.create({
        data: {
          templateName: '默认分类模板',
          templateType: 'built-in',
          description: '系统默认分类分级模板',
          status: TemplateStatus.ACTIVE,
        },
      });
    }

    await this.prisma.classificationTask.create({
      data: {
        taskName: '用户中心敏感数据分类任务',
        dataSource: '用户中心主库',
        dataType: 'database',
        classificationType: 'automatic',
        priority: 'high',
        description: '系统初始化分类任务',
        source: ClassificationTaskSource.CLASSIFICATION_CENTER,
        sourceLabel: '任务中心',
        status: ClassificationTaskStatus.RUNNING,
        templateId: template.id,
        creatorId: creator?.id,
      },
      include: { template: true, creator: true, importTask: true },
    });
  }

  async findAll() {
    await this.seed();
    return this.prisma.classificationTask.findMany({
      include: { template: true, creator: true, importTask: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(dto: CreateClassificationTaskDto) {
    return this.prisma.classificationTask.create({
      data: {
        ...dto,
        source: dto.source ?? ClassificationTaskSource.CLASSIFICATION_CENTER,
        sourceLabel: dto.sourceLabel ?? '任务中心',
        status: dto.status ?? ClassificationTaskStatus.PENDING,
      },
      include: { template: true, creator: true, importTask: true },
    });
  }

  update(id: string, dto: UpdateClassificationTaskDto) {
    return this.prisma.classificationTask.update({
      where: { id },
      data: dto,
      include: { template: true, creator: true, importTask: true },
    });
  }

  remove(id: string) {
    return this.prisma.classificationTask.delete({ where: { id } });
  }
}
