import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CommonStatus,
  Prisma,
  ClassificationTaskSource,
  DataLevel,
  ImportTaskStatus,
  TemplateStatus,
} from '@prisma/client';
import mysql from 'mysql2/promise';
import { ClassificationTasksService } from '../classification-tasks/classification-tasks.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateImportTaskDto } from './dto/create-import-task.dto';
import { DiscoverImportDatabasesDto } from './dto/discover-import-databases.dto';
import { UpdateImportTaskDto } from './dto/update-import-task.dto';

type RemoteTable = {
  TABLE_NAME: string;
  TABLE_COMMENT: string | null;
  ENGINE: string | null;
  TABLE_ROWS: number | null;
  DATA_LENGTH: number | null;
  INDEX_LENGTH: number | null;
};

type RemoteColumn = {
  TABLE_NAME: string;
  COLUMN_NAME: string;
  COLUMN_COMMENT: string | null;
  DATA_TYPE: string;
  COLUMN_TYPE: string;
  IS_NULLABLE: 'YES' | 'NO';
  COLUMN_KEY: string;
  ORDINAL_POSITION: number;
};

@Injectable()
export class ImportTasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly classificationTasksService: ClassificationTasksService,
  ) {}

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

  private async resolveClassificationTaskDataSource(
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

  private buildImportTaskUpdateData(
    dto: UpdateImportTaskDto,
  ): Prisma.ImportTaskUpdateInput {
    const data: Prisma.ImportTaskUpdateInput = {};

    if (dto.sourceName !== undefined) data.sourceName = dto.sourceName;
    if (dto.sourceType !== undefined) data.sourceType = dto.sourceType;
    if (dto.ipAddress !== undefined) data.ipAddress = dto.ipAddress;
    if (dto.port !== undefined) data.port = dto.port;
    if (dto.databaseName !== undefined) data.databaseName = dto.databaseName;
    if (dto.sourceUsername !== undefined)
      data.sourceUsername = dto.sourceUsername;
    if (dto.sourcePassword !== undefined)
      data.sourcePassword = dto.sourcePassword;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.progress !== undefined) data.progress = dto.progress;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.scheduleMode !== undefined)
      data.scheduleMode = dto.scheduleMode.trim() || 'single';
    if (dto.executeAt !== undefined)
      data.executeAt = this.parseExecuteAt(dto.executeAt);
    if (dto.runClassificationImmediatelyAfterImport !== undefined) {
      data.runClassificationImmediatelyAfterImport =
        dto.runClassificationImmediatelyAfterImport;
    }

    if (dto.assetGroupId !== undefined) {
      data.assetGroup = {
        connect: { id: dto.assetGroupId },
      };
    }

    if (dto.creatorId !== undefined) {
      data.creator = dto.creatorId
        ? { connect: { id: dto.creatorId } }
        : { disconnect: true };
    }

    if (dto.classificationTaskId !== undefined) {
      data.classificationTask = dto.classificationTaskId
        ? { connect: { id: dto.classificationTaskId } }
        : { disconnect: true };
    }

    return data;
  }

  private getInclude() {
    return {
      assetGroup: true,
      creator: true,
      classificationTask: true,
      dataAsset: true,
      tables: {
        include: {
          columns: true,
        },
      },
    } as const;
  }

  private sanitizeTask<T extends { sourcePassword?: string | null }>(
    task: T | null,
  ) {
    if (!task) {
      return task;
    }

    const { sourcePassword: _sourcePassword, ...safeTask } = task;
    return safeTask as Omit<T, 'sourcePassword'>;
  }

  private sanitizeTasks<T extends { sourcePassword?: string | null }>(
    tasks: T[],
  ) {
    return tasks.map((task) => this.sanitizeTask(task));
  }

  private toSafeIdentifier(value: string) {
    return value.replace(/`/g, '``');
  }

  private async openMySqlConnection(params: {
    ipAddress: string;
    port: number;
    sourceUsername?: string;
    sourcePassword?: string;
    databaseName?: string;
  }) {
    return mysql.createConnection({
      host: params.ipAddress,
      port: params.port,
      user: params.sourceUsername,
      password: params.sourcePassword,
      database: params.databaseName,
      multipleStatements: false,
    });
  }

  private dataLevelWeight(level?: DataLevel | null) {
    if (!level) return 0;
    if (level === DataLevel.SECRET) return 4;
    if (level === DataLevel.CONFIDENTIAL) return 3;
    if (level === DataLevel.INTERNAL) return 2;
    return 1;
  }

  private canExecuteImportTask(task: {
    sourceType: string;
    databaseName?: string | null;
    sourceUsername?: string | null;
    sourcePassword?: string | null;
  }) {
    return Boolean(
      task.sourceType.toLowerCase() === 'mysql' &&
        task.databaseName &&
        task.sourceUsername &&
        task.sourcePassword,
    );
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

  private async loadTemplateDataTypes() {
    const template =
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

  private async loadSampleData(
    connection: mysql.Connection,
    databaseName: string,
    tableName: string,
    columnName: string,
  ) {
    try {
      const db = this.toSafeIdentifier(databaseName);
      const table = this.toSafeIdentifier(tableName);
      const column = this.toSafeIdentifier(columnName);
      const [rows] = await connection.query(
        `SELECT DISTINCT \`${column}\` AS value FROM \`${db}\`.\`${table}\` WHERE \`${column}\` IS NOT NULL LIMIT 3`,
      );

      return (rows as Array<{ value: unknown }>)
        .map((row) => row.value)
        .filter((value) => value !== null && value !== undefined)
        .map((value) => String(value));
    } catch {
      return [];
    }
  }

  private classifyColumn(
    column: RemoteColumn,
    table: RemoteTable,
    dataTypes: Awaited<ReturnType<ImportTasksService['loadTemplateDataTypes']>>,
  ) {
    const candidates = dataTypes
      .map((dataType) => {
        const score = dataType.rules.reduce((total, rule) => {
          const currentValue =
            rule.target === 'fieldComment'
              ? (column.COLUMN_COMMENT ?? '')
              : rule.target === 'fieldType'
                ? column.COLUMN_TYPE
                : rule.target === 'tableName'
                  ? table.TABLE_NAME
                  : rule.target === 'tableComment'
                    ? (table.TABLE_COMMENT ?? '')
                    : column.COLUMN_NAME;

          return this.matchRuleValue(currentValue, rule.matcher, rule.value)
            ? total + Number(rule.hitRate)
            : total;
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

  async seed() {
    const count = await this.prisma.importTask.count();
    if (count > 0) return;

    const assetGroup = await this.prisma.assetGroup.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    const creator = await this.prisma.user.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    if (!assetGroup) return;

    await this.prisma.importTask.create({
      data: {
        sourceName: '用户中心主库',
        sourceType: 'mysql',
        ipAddress: '10.10.0.12',
        port: 3306,
        databaseName: 'user_center',
        sourceUsername: 'app',
        assetGroupId: assetGroup.id,
        creatorId: creator?.id,
        status: ImportTaskStatus.SUCCESS,
        progress: 100,
        description: '系统初始化导入任务',
      },
      include: this.getInclude(),
    });
  }

  async findAll() {
    const tasks = await this.prisma.importTask.findMany({
      include: this.getInclude(),
      orderBy: { createdAt: 'desc' },
    });

    return this.sanitizeTasks(tasks);
  }

  async discoverDatabases(dto: DiscoverImportDatabasesDto) {
    if (dto.sourceType.toLowerCase() !== 'mysql') {
      throw new BadRequestException(
        'Only MySQL discovery is supported right now.',
      );
    }

    let connection: mysql.Connection | null = null;
    try {
      connection = await this.openMySqlConnection(dto);
      const [rows] = await connection.query(
        `
          SELECT SCHEMA_NAME
          FROM information_schema.SCHEMATA
          WHERE SCHEMA_NAME NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
          ORDER BY SCHEMA_NAME
        `,
      );

      const databases = (rows as Array<{ SCHEMA_NAME: string }>)
        .map((row) => row.SCHEMA_NAME)
        .filter(Boolean);

      return {
        success: true,
        databases,
      };
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : 'Failed to connect to the database server.',
      );
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  private async importMySqlSchema(taskId: string, dto: CreateImportTaskDto) {
    const connection = await this.openMySqlConnection(dto);

    try {
      const [tablesRows] = await connection.query(
        `
          SELECT
            TABLE_NAME,
            TABLE_COMMENT,
            ENGINE,
            TABLE_ROWS,
            DATA_LENGTH,
            INDEX_LENGTH
          FROM information_schema.TABLES
          WHERE TABLE_SCHEMA = ?
          ORDER BY TABLE_NAME
        `,
        [dto.databaseName],
      );
      const tablesResult = tablesRows as RemoteTable[];

      const [columnsRows] = await connection.query(
        `
          SELECT
            TABLE_NAME,
            COLUMN_NAME,
            COLUMN_COMMENT,
            DATA_TYPE,
            COLUMN_TYPE,
            IS_NULLABLE,
            COLUMN_KEY,
            ORDINAL_POSITION
          FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = ?
          ORDER BY TABLE_NAME, ORDINAL_POSITION
        `,
        [dto.databaseName],
      );
      const columnsResult = columnsRows as RemoteColumn[];

      const dataTypes = await this.loadTemplateDataTypes();

      const [assetGroup, creator] = await Promise.all([
        this.prisma.assetGroup.findUnique({ where: { id: dto.assetGroupId } }),
        dto.creatorId
          ? this.prisma.user.findUnique({ where: { id: dto.creatorId } })
          : this.prisma.user.findFirst(),
      ]);

      let asset = await this.prisma.dataAsset.findFirst({
        where: {
          ipAddress: dto.ipAddress,
          port: dto.port,
          sourceDatabaseName: dto.databaseName,
        },
      });

      if (!asset) {
        asset = await this.prisma.dataAsset.create({
          data: {
            name: dto.sourceName,
            sourceType: dto.sourceType,
            sourceDatabaseName: dto.databaseName,
            ipAddress: dto.ipAddress,
            port: dto.port,
            status: CommonStatus.ACTIVE,
            dataLevel: DataLevel.INTERNAL,
            owner: creator?.name ?? '数据库导入',
            department: assetGroup?.department ?? '数据治理平台',
            description: dto.description,
            tags: ['mysql-import', dto.databaseName ?? 'database'],
            assetGroupId: dto.assetGroupId,
          },
        });
      } else {
        asset = await this.prisma.dataAsset.update({
          where: { id: asset.id },
          data: {
            name: dto.sourceName,
            sourceType: dto.sourceType,
            sourceDatabaseName: dto.databaseName,
            description: dto.description,
            assetGroupId: dto.assetGroupId,
          },
        });
      }

      await this.prisma.dataAssetColumn.deleteMany({
        where: {
          table: {
            assetId: asset.id,
          },
        },
      });
      await this.prisma.dataAssetTable.deleteMany({
        where: { assetId: asset.id },
      });

      const columnsByTable = new Map<string, RemoteColumn[]>();
      columnsResult.forEach((column) => {
        const current = columnsByTable.get(column.TABLE_NAME) ?? [];
        current.push(column);
        columnsByTable.set(column.TABLE_NAME, current);
      });

      let fieldCount = 0;
      let recordCount = 0;
      let sizeBytes = 0;
      let highestLevel: DataLevel | null = null;

      for (const table of tablesResult) {
        const tableColumns = columnsByTable.get(table.TABLE_NAME) ?? [];
        recordCount += Number(table.TABLE_ROWS ?? 0);
        sizeBytes +=
          Number(table.DATA_LENGTH ?? 0) + Number(table.INDEX_LENGTH ?? 0);

        const createdTable = await this.prisma.dataAssetTable.create({
          data: {
            assetId: asset.id,
            importTaskId: taskId,
            tableName: table.TABLE_NAME,
            tableComment: table.TABLE_COMMENT ?? '',
            engine: table.ENGINE ?? undefined,
            rowCount: Number(table.TABLE_ROWS ?? 0),
            sizeBytes:
              Number(table.DATA_LENGTH ?? 0) + Number(table.INDEX_LENGTH ?? 0),
          },
        });

        for (const column of tableColumns) {
          fieldCount += 1;
          const classification = this.classifyColumn(column, table, dataTypes);
          if (this.dataLevelWeight(classification.dataLevel) > this.dataLevelWeight(highestLevel)) {
            highestLevel = classification.dataLevel;
          }

          const sampleData = await this.loadSampleData(
            connection,
            dto.databaseName ?? '',
            table.TABLE_NAME,
            column.COLUMN_NAME,
          );

          await this.prisma.dataAssetColumn.create({
            data: {
              tableId: createdTable.id,
              columnName: column.COLUMN_NAME,
              columnComment: column.COLUMN_COMMENT ?? '',
              dataType: column.DATA_TYPE,
              columnType: column.COLUMN_TYPE,
              isNullable: column.IS_NULLABLE === 'YES',
              isPrimaryKey: column.COLUMN_KEY === 'PRI',
              ordinalPosition: column.ORDINAL_POSITION,
              sampleData,
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

      const updatedAsset = await this.prisma.dataAsset.update({
        where: { id: asset.id },
        data: {
          tableCount: tablesResult.length,
          fieldCount,
          sizeBytes,
          recordCount,
          dataLevel: highestLevel ?? asset.dataLevel,
          tags: ['mysql-import', dto.databaseName ?? 'database'],
        },
      });

      await this.prisma.importTask.update({
        where: { id: taskId },
        data: {
          status: ImportTaskStatus.SUCCESS,
          progress: 100,
          dataAssetId: updatedAsset.id,
          importedTableCount: tablesResult.length,
          importedFieldCount: fieldCount,
          importedRecordCount: recordCount,
          errorMessage: null,
        },
      });
    } finally {
      await connection.end();
    }
  }

  private async maybeExecuteLinkedClassificationTask(taskId: string) {
    const task = await this.prisma.importTask.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        status: true,
        classificationTaskId: true,
        runClassificationImmediatelyAfterImport: true,
        classificationTriggeredAt: true,
      },
    });

    if (
      !task ||
      task.status !== ImportTaskStatus.SUCCESS ||
      !task.classificationTaskId ||
      !task.runClassificationImmediatelyAfterImport ||
      task.classificationTriggeredAt
    ) {
      return;
    }

    try {
      await this.classificationTasksService.executeNow(task.classificationTaskId);
      await this.prisma.importTask.update({
        where: { id: task.id },
        data: {
          classificationTriggeredAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Failed to auto execute linked classification task', error);
    }
  }

  private async executeImportTask(taskId: string) {
    const task = await this.prisma.importTask.findUnique({
      where: { id: taskId },
      include: this.getInclude(),
    });

    if (!task) {
      return null;
    }

    if (!this.canExecuteImportTask(task)) {
      return task;
    }

    await this.prisma.importTask.update({
      where: { id: task.id },
      data: {
        status: ImportTaskStatus.RUNNING,
        progress: 10,
        errorMessage: null,
        classificationTriggeredAt: null,
      },
    });

    try {
      await this.importMySqlSchema(task.id, {
        sourceName: task.sourceName,
        sourceType: task.sourceType,
        ipAddress: task.ipAddress,
        port: task.port,
        databaseName: task.databaseName ?? undefined,
        sourceUsername: task.sourceUsername ?? undefined,
        sourcePassword: task.sourcePassword ?? undefined,
        assetGroupId: task.assetGroupId,
        creatorId: task.creatorId ?? undefined,
        classificationTaskId: task.classificationTaskId ?? undefined,
        description: task.description ?? undefined,
      });
    } catch (error) {
      await this.prisma.importTask.update({
        where: { id: task.id },
        data: {
          status: ImportTaskStatus.FAILED,
          progress: 0,
          errorMessage:
            error instanceof Error ? error.message : '数据库连接或结构读取失败',
        },
      });
    }

    await this.maybeExecuteLinkedClassificationTask(task.id);

    return this.prisma.importTask.findUnique({
      where: { id: task.id },
      include: this.getInclude(),
    });
  }

  async create(dto: CreateImportTaskDto) {
    const task = await this.prisma.importTask.create({
      data: {
        sourceName: dto.sourceName,
        sourceType: dto.sourceType,
        ipAddress: dto.ipAddress,
        port: dto.port,
        databaseName: dto.databaseName,
        sourceUsername: dto.sourceUsername,
        sourcePassword: dto.sourcePassword,
        scheduleMode: dto.scheduleMode?.trim() || 'single',
        executeAt: this.parseExecuteAt(dto.executeAt) ?? null,
        runClassificationImmediatelyAfterImport:
          dto.runClassificationImmediatelyAfterImport ?? false,
        status: dto.status ?? ImportTaskStatus.PENDING,
        progress: dto.progress ?? 0,
        description: dto.description,
        assetGroup: {
          connect: { id: dto.assetGroupId },
        },
        creator: dto.creatorId
          ? {
              connect: { id: dto.creatorId },
            }
          : undefined,
        classificationTask: dto.classificationTaskId
          ? {
              connect: { id: dto.classificationTaskId },
            }
          : undefined,
      },
      include: this.getInclude(),
    });

    if (dto.runImmediately === false || !this.canExecuteImportTask(dto)) {
      return this.sanitizeTask(task);
    }

    return this.sanitizeTask((await this.executeImportTask(task.id)) ?? task);
  }

  async update(id: string, dto: UpdateImportTaskDto) {
    const currentTask = await this.prisma.importTask.findUnique({
      where: { id },
      select: {
        classificationTaskId: true,
      },
    });

    const data = this.buildImportTaskUpdateData(dto);
    if (
      dto.classificationTaskId !== undefined &&
      dto.classificationTaskId !== currentTask?.classificationTaskId
    ) {
      data.classificationTriggeredAt = null;
    }

    const updatedTask = await this.prisma.importTask.update({
      where: { id },
      data,
      include: this.getInclude(),
    });

    if (
      dto.status === ImportTaskStatus.RUNNING &&
      this.canExecuteImportTask(updatedTask)
    ) {
      return this.sanitizeTask(
        (await this.executeImportTask(id)) ?? updatedTask,
      );
    }

    if (updatedTask.status === ImportTaskStatus.SUCCESS) {
      await this.maybeExecuteLinkedClassificationTask(id);
      return this.sanitizeTask(
        await this.prisma.importTask.findUnique({
          where: { id },
          include: this.getInclude(),
        }),
      );
    }

    return this.sanitizeTask(updatedTask);
  }

  async remove(id: string) {
    const task = await this.prisma.importTask.findUnique({
      where: { id },
      include: {
        classificationTask: true,
      },
    });

    if (!task) {
      return { success: false };
    }

    let deletedClassificationTask = false;
    if (task.classificationTask?.id) {
      const currentAssetIds = this.normalizeAssetIds(
        task.classificationTask.dataAssetIds,
      );
      const nextAssetIds = task.dataAssetId
        ? currentAssetIds.filter((assetId) => assetId !== task.dataAssetId)
        : currentAssetIds;

      const linkedImportTaskCount = await this.prisma.importTask.count({
        where: {
          classificationTask: {
            is: { id: task.classificationTask.id },
          },
          NOT: { id },
        },
      });

      if (
        task.classificationTask.source ===
          ClassificationTaskSource.ASSET_IMPORT &&
        nextAssetIds.length === 0 &&
        linkedImportTaskCount === 0
      ) {
        await this.prisma.classificationTask.delete({
          where: { id: task.classificationTask.id },
        });
        deletedClassificationTask = true;
      } else {
        await this.prisma.classificationTask.update({
          where: { id: task.classificationTask.id },
          data: {
            dataAssetIds: nextAssetIds as Prisma.InputJsonValue,
            dataSource:
              await this.resolveClassificationTaskDataSource(nextAssetIds),
          },
        });
      }
    }

    const dataAssetId = task.dataAssetId;

    await this.prisma.importTask.delete({
      where: { id },
    });

    let deletedDataAsset = false;
    if (dataAssetId) {
      const relatedTaskCount = await this.prisma.importTask.count({
        where: { dataAssetId },
      });

      if (relatedTaskCount === 0) {
        await this.prisma.dataAsset.delete({
          where: { id: dataAssetId },
        });
        deletedDataAsset = true;
      }
    }

    return {
      success: true,
      deletedClassificationTask,
      deletedDataAsset,
    };
  }
}
