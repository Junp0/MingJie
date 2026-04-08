import { Injectable } from '@nestjs/common';
import {
  AuditLogCategory,
  AuditLogResult,
  ClassificationTaskSource,
  ClassificationTaskStatus,
  DataLevel,
  Prisma,
  TemplateStatus,
} from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassificationTaskDto } from './dto/create-classification-task.dto';
import { UpdateClassificationTaskDto } from './dto/update-classification-task.dto';

@Injectable()
export class ClassificationTasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  private normalizeAssetIds(dataAssetIds?: unknown) {
    if (!Array.isArray(dataAssetIds)) {
      return [];
    }

    return Array.from(
      new Set(
        dataAssetIds
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim())
          .filter((item): item is string => Boolean(item)),
      ),
    );
  }

  private dataLevelWeight(level?: DataLevel | null) {
    if (!level) return 0;
    if (level === DataLevel.SECRET) return 4;
    if (level === DataLevel.CONFIDENTIAL) return 3;
    if (level === DataLevel.INTERNAL) return 2;
    return 1;
  }

  private mapLevelCodeToDataLevel(
    code?: string | null,
    isSensitive?: boolean,
    needEncrypt?: boolean,
  ) {
    if (code === 'L1') return DataLevel.PUBLIC;
    if (code === 'L2') return DataLevel.INTERNAL;
    if (code === 'L3') return DataLevel.CONFIDENTIAL;
    if (code === 'L4' || code === 'L5') return DataLevel.SECRET;
    if (needEncrypt) return DataLevel.SECRET;
    if (isSensitive) return DataLevel.CONFIDENTIAL;
    return DataLevel.INTERNAL;
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

  private calculateNextExecuteAt(
    _scheduleMode?: string | null,
    executeAt?: Date | null,
  ) {
    return executeAt ?? null;
  }

  private matchRuleValue(value: string, matcher: string, expected: string) {
    const normalizedValue = value.toLowerCase();
    const normalizedExpected = expected.toLowerCase();

    switch (matcher) {
      case 'equals':
        return normalizedValue === normalizedExpected;
      case 'contains':
        return normalizedExpected
          .split(',')
          .map((item) => item.trim())
          .some((item) => item && normalizedValue.includes(item));
      case 'prefix':
        return normalizedValue.startsWith(normalizedExpected);
      case 'suffix':
        return normalizedValue.endsWith(normalizedExpected);
      case 'regex':
        try {
          return new RegExp(expected, 'i').test(value);
        } catch {
          return false;
        }
      case 'enumContains':
        return normalizedExpected
          .split(',')
          .map((item) => item.trim())
          .some((item) => item && normalizedValue.includes(item));
      default:
        return false;
    }
  }

  private async loadTemplateDataTypes(templateId?: string | null) {
    const template =
      (templateId
        ? await this.prisma.classificationTemplate.findUnique({
            where: { id: templateId },
            include: {
              dataTypes: {
                include: {
                  category: true,
                  levelDefinition: true,
                  rules: true,
                },
              },
            },
          })
        : null) ??
      (await this.prisma.classificationTemplate.findFirst({
        where: { status: TemplateStatus.ACTIVE },
        include: {
          dataTypes: {
            include: {
              category: true,
              levelDefinition: true,
              rules: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })) ??
      (await this.prisma.classificationTemplate.findFirst({
        include: {
          dataTypes: {
            include: {
              category: true,
              levelDefinition: true,
              rules: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }));

    return template?.dataTypes ?? [];
  }

  private classifyColumn(
    column: {
      id: string;
      columnName: string;
      columnComment: string | null;
      dataType: string;
      columnType: string;
    },
    table: {
      id: string;
      tableName: string;
      tableComment: string | null;
    },
    dataTypes: Awaited<
      ReturnType<ClassificationTasksService['loadTemplateDataTypes']>
    >,
  ) {
    const candidates = dataTypes
      .map((dataType) => {
        const score = dataType.rules.reduce((bestScore, rule) => {
          const currentValue =
            rule.target === 'fieldComment'
              ? (column.columnComment ?? '')
              : rule.target === 'fieldType'
                ? column.columnType
                : rule.target === 'tableName'
                  ? table.tableName
                  : rule.target === 'tableComment'
                    ? (table.tableComment ?? '')
                    : column.columnName;

          if (!this.matchRuleValue(currentValue, rule.matcher, rule.value)) {
            return bestScore;
          }

          return Math.max(bestScore, Number(rule.hitRate));
        }, 0);

        return {
          dataType,
          score,
        };
      })
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score);

    const matched = candidates[0]?.dataType;
    if (!matched) {
      return {
        classificationDataTypeId: null,
        dataCategory: '未分类',
        dataLevel: null,
        isSensitive: false,
        needMask: false,
        needEncrypt: false,
      };
    }

    return {
      classificationDataTypeId: matched.id,
      dataCategory: matched.category?.name ?? '未分类',
      dataLevel: this.mapLevelCodeToDataLevel(
        matched.levelDefinition?.code,
        matched.isSensitive,
        matched.needEncrypt,
      ),
      isSensitive: matched.isSensitive,
      needMask: matched.needMask,
      needEncrypt: matched.needEncrypt,
    };
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
    const defaultStatus =
      dto.source === ClassificationTaskSource.ASSET_IMPORT &&
      dataAssetIds.length === 0
        ? ClassificationTaskStatus.WAITING_IMPORT
        : ClassificationTaskStatus.PENDING;

    return {
      taskName: dto.taskName.trim(),
      dataSource: await this.resolveDataSource(dataAssetIds, dto.dataSource),
      dataAssetIds: dataAssetIds as Prisma.InputJsonValue,
      dataType: dto.dataType.trim(),
      scheduleMode: dto.scheduleMode?.trim() || 'single',
      classificationType: dto.classificationType?.trim() || 'automatic',
      priority: dto.priority?.trim() || 'medium',
      description: dto.description?.trim() ?? '',
      source: dto.source ?? ClassificationTaskSource.CLASSIFICATION_CENTER,
      sourceLabel: dto.sourceLabel?.trim() || '任务中心',
      status: dto.status ?? defaultStatus,
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
    if (dto.scheduleMode !== undefined)
      data.scheduleMode = dto.scheduleMode.trim() || 'single';
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
    const task = await this.prisma.classificationTask.create({
      data: await this.buildCreateData(dto),
      include: { template: true, creator: true },
    });

    await this.auditLogsService.record({
      category: AuditLogCategory.CLASSIFICATION_TASK,
      action: '创建分类分级任务',
      result: AuditLogResult.SUCCESS,
      actorId: task.creatorId,
      actorName: task.creator?.name ?? '当前用户',
      targetType: 'classification-task',
      targetId: task.id,
      targetName: task.taskName,
      detail: task.description ?? '创建分类分级任务',
      metadata: {
        source: task.source,
        executeAt: task.executeAt?.toISOString() ?? null,
      },
    });

    return task;
  }

  async executeNow(id: string) {
    const task = await this.prisma.classificationTask.findUnique({
      where: { id },
      include: { template: true, creator: true },
    });
    if (!task) {
      return null;
    }

    await this.prisma.classificationTask.update({
      where: { id },
      data: {
        status: ClassificationTaskStatus.RUNNING,
      },
    });

    await this.auditLogsService.record({
      category: AuditLogCategory.CLASSIFICATION_TASK,
      action: '执行分类分级任务',
      result: AuditLogResult.RUNNING,
      actorId: task.creatorId,
      actorName: task.creator?.name ?? '系统',
      targetType: 'classification-task',
      targetId: task.id,
      targetName: task.taskName,
      detail: '分类分级任务开始执行',
      metadata: {
        dataAssetCount: this.normalizeAssetIds(task.dataAssetIds).length,
        source: task.source,
      },
    });

    try {
      const dataAssetIds = this.normalizeAssetIds(task.dataAssetIds);
      const dataTypes = await this.loadTemplateDataTypes(task.templateId);
      const nextDataSource = await this.resolveDataSource(
        dataAssetIds,
        task.dataSource,
      );

      for (const assetId of dataAssetIds) {
        const asset = await this.prisma.dataAsset.findUnique({
          where: { id: assetId },
          include: {
            tables: {
              where: { isDeleted: false },
              include: {
                columns: {
                  where: { isDeleted: false },
                },
              },
            },
          },
        });

        if (!asset || asset.isDeleted) {
          continue;
        }

        let highestLevel: DataLevel | null = null;

        for (const table of asset.tables) {
          for (const column of table.columns) {
            const classification = this.classifyColumn(column, table, dataTypes);

            if (this.dataLevelWeight(classification.dataLevel) > this.dataLevelWeight(highestLevel)) {
              highestLevel = classification.dataLevel;
            }

            await this.prisma.dataAssetColumn.update({
              where: { id: column.id },
              data: {
                classificationDataTypeId: classification.classificationDataTypeId,
                dataCategory: classification.dataCategory,
                dataLevel: classification.dataLevel,
                isSensitive: classification.isSensitive,
                needMask: classification.needMask,
                needEncrypt: classification.needEncrypt,
              },
            });
          }
        }

        await this.prisma.dataAsset.update({
          where: { id: assetId },
          data: {
            dataLevel:
              highestLevel ?? asset.dataLevel,
          },
        });
      }

      const completedTask = await this.prisma.classificationTask.update({
        where: { id },
        data: {
          dataSource: nextDataSource,
          status: ClassificationTaskStatus.COMPLETED,
        },
        include: { template: true, creator: true },
      });

      await this.auditLogsService.record({
        category: AuditLogCategory.CLASSIFICATION_TASK,
        action: '执行分类分级任务',
        result: AuditLogResult.SUCCESS,
        actorId: completedTask.creatorId,
        actorName: completedTask.creator?.name ?? '系统',
        targetType: 'classification-task',
        targetId: completedTask.id,
        targetName: completedTask.taskName,
        detail: '分类分级任务执行完成',
        metadata: {
          dataAssetCount: dataAssetIds.length,
          templateId: completedTask.templateId,
        },
      });

      return completedTask;
    } catch (error) {
      await this.prisma.classificationTask.update({
        where: { id },
        data: { status: ClassificationTaskStatus.FAILED },
      });
      await this.auditLogsService.record({
        category: AuditLogCategory.CLASSIFICATION_TASK,
        action: '执行分类分级任务',
        result: AuditLogResult.FAILED,
        actorId: task.creatorId,
        actorName: task.creator?.name ?? '系统',
        targetType: 'classification-task',
        targetId: task.id,
        targetName: task.taskName,
        detail:
          error instanceof Error ? error.message : '分类分级任务执行失败',
      });
      throw error;
    }
  }

  async update(id: string, dto: UpdateClassificationTaskDto) {
    const currentTask = await this.prisma.classificationTask.findUnique({
      where: { id },
    });

    const data = await this.buildUpdateData(dto);
    if (currentTask && dto.status === undefined) {
      const nextAssetIds =
        dto.dataAssetIds !== undefined
          ? this.normalizeAssetIds(dto.dataAssetIds)
          : this.normalizeAssetIds(currentTask.dataAssetIds);

      if (dto.executeAt !== undefined || dto.scheduleMode !== undefined) {
        data.status =
          currentTask.source === ClassificationTaskSource.ASSET_IMPORT &&
          nextAssetIds.length === 0
            ? ClassificationTaskStatus.WAITING_IMPORT
            : ClassificationTaskStatus.PENDING;
      }
    }

    const task = await this.prisma.classificationTask.update({
      where: { id },
      data,
      include: { template: true, creator: true },
    });

    await this.auditLogsService.record({
      category: AuditLogCategory.CLASSIFICATION_TASK,
      action: '更新分类分级任务',
      result: AuditLogResult.SUCCESS,
      actorId: task.creatorId,
      actorName: task.creator?.name ?? '当前用户',
      targetType: 'classification-task',
      targetId: task.id,
      targetName: task.taskName,
      detail: task.description ?? '分类分级任务配置已更新',
    });

    return task;
  }

  async remove(id: string) {
    const task = await this.prisma.classificationTask.delete({ where: { id } });

    await this.auditLogsService.record({
      category: AuditLogCategory.CLASSIFICATION_TASK,
      action: '删除分类分级任务',
      result: AuditLogResult.SUCCESS,
      actorName: '当前用户',
      targetType: 'classification-task',
      targetId: task.id,
      targetName: task.taskName,
      detail: '分类分级任务已删除',
    });

    return task;
  }
}
