import { Injectable } from '@nestjs/common';
import {
  ClassificationTaskSource,
  ClassificationTaskStatus,
  Prisma,
  TemplateStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassificationTaskDto } from './dto/create-classification-task.dto';
import { UpdateClassificationTaskDto } from './dto/update-classification-task.dto';

@Injectable()
export class ClassificationTasksService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeAssetIds(dataAssetIds?: string[] | null) {
    return Array.from(
      new Set(
        (dataAssetIds ?? [])
          .map((item) => item?.trim())
          .filter((item): item is string => Boolean(item)),
      ),
    );
  }

  private parseExecuteAt(value?: string | null) {
    if (value === undefined) return undefined;
    if (value === null || value.trim() === '') return null;

    const normalizedValue =
      value.includes('T') || value.includes('Z')
        ? value
        : value.replace(' ', 'T');
    const parsed = new Date(normalizedValue);

    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed;
  }

  private async resolveDataSource(
    dataAssetIds: string[],
    fallback?: string | null,
  ) {
    if (!dataAssetIds.length) {
      return fallback?.trim() || '未关联数据资产';
    }

    const assets = await this.prisma.dataAsset.findMany({
      where: { id: { in: dataAssetIds } },
      select: { id: true, name: true },
    });
    const assetNameMap = new Map(assets.map((item) => [item.id, item.name]));
    const assetNames = dataAssetIds
      .map((assetId) => assetNameMap.get(assetId))
      .filter((item): item is string => Boolean(item));

    return assetNames.join('、') || fallback?.trim() || '未关联数据资产';
  }

  private async buildCreateData(
    dto: CreateClassificationTaskDto,
  ): Promise<Prisma.ClassificationTaskUncheckedCreateInput> {
    const dataAssetIds = this.normalizeAssetIds(dto.dataAssetIds);

    return {
      taskName: dto.taskName.trim(),
      dataSource: await this.resolveDataSource(dataAssetIds, dto.dataSource),
      dataAssetIds: dataAssetIds as Prisma.InputJsonValue,
      dataType: dto.dataType.trim(),
      classificationType: dto.classificationType?.trim() || 'automatic',
      priority: dto.priority?.trim() || 'medium',
      description: dto.description?.trim() ?? '',
      source: dto.source ?? ClassificationTaskSource.CLASSIFICATION_CENTER,
      sourceLabel: dto.sourceLabel?.trim() || '任务中心',
      status: dto.status ?? ClassificationTaskStatus.PENDING,
      templateId: dto.templateId ?? null,
      creatorId: dto.creatorId ?? null,
      executeAt: this.parseExecuteAt(dto.executeAt) ?? null,
    };
  }

  private async buildUpdateData(
    dto: UpdateClassificationTaskDto,
  ): Promise<Prisma.ClassificationTaskUncheckedUpdateInput> {
    const data: Prisma.ClassificationTaskUncheckedUpdateInput = {};

    if (dto.taskName !== undefined) data.taskName = dto.taskName.trim();
    if (dto.dataType !== undefined) data.dataType = dto.dataType.trim();
    if (dto.classificationType !== undefined)
      data.classificationType = dto.classificationType.trim();
    if (dto.priority !== undefined) data.priority = dto.priority.trim();
    if (dto.description !== undefined)
      data.description = dto.description?.trim() ?? '';
    if (dto.source !== undefined) data.source = dto.source;
    if (dto.sourceLabel !== undefined)
      data.sourceLabel = dto.sourceLabel?.trim() || '任务中心';
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.templateId !== undefined) data.templateId = dto.templateId ?? null;
    if (dto.creatorId !== undefined) data.creatorId = dto.creatorId ?? null;
    if (dto.executeAt !== undefined)
      data.executeAt = this.parseExecuteAt(dto.executeAt);

    if (dto.dataAssetIds !== undefined) {
      const dataAssetIds = this.normalizeAssetIds(dto.dataAssetIds);
      data.dataAssetIds = dataAssetIds as Prisma.InputJsonValue;
      data.dataSource = await this.resolveDataSource(
        dataAssetIds,
        dto.dataSource,
      );
    } else if (dto.dataSource !== undefined) {
      data.dataSource = dto.dataSource?.trim() || '未关联数据资产';
    }

    return data;
  }

  async seed() {
    const count = await this.prisma.classificationTask.count();
    if (count > 0) return;

    const creator = await this.prisma.user.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    let template = await this.prisma.classificationTemplate.findFirst({
      orderBy: { createdAt: 'asc' },
    });
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
      include: { template: true, creator: true },
    });
  }

  async findAll() {
    return this.prisma.classificationTask.findMany({
      include: { template: true, creator: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateClassificationTaskDto) {
    return this.prisma.classificationTask.create({
      data: await this.buildCreateData(dto),
      include: { template: true, creator: true },
    });
  }

  async update(id: string, dto: UpdateClassificationTaskDto) {
    return this.prisma.classificationTask.update({
      where: { id },
      data: await this.buildUpdateData(dto),
      include: { template: true, creator: true },
    });
  }

  remove(id: string) {
    return this.prisma.classificationTask.delete({ where: { id } });
  }
}
