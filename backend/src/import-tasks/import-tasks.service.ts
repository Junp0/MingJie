import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AuditLogCategory,
  AuditLogResult,
  ClassificationTaskStatus,
  CommonStatus,
  Prisma,
  ClassificationTaskSource,
  DataLevel,
  ImportTaskStatus,
  TemplateStatus,
} from '@prisma/client';
import mysql from 'mysql2/promise';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
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
    private readonly auditLogsService: AuditLogsService,
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

  private normalizeSampleCount(value?: number | null) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return 20;
    }

    return Math.min(200, Math.max(1, Math.floor(value)));
  }

  private normalizeSampleStrategy(value?: string | null) {
    return value === 'random' ? 'random' : 'latest';
  }

  private normalizeSampleStorageMode(value?: string | null) {
    return value === 'incremental' ? 'incremental' : 'replace';
  }

  private calculateNextExecuteAt(
    scheduleMode?: string | null,
    executeAt?: Date | null,
    referenceTime: Date = new Date(),
  ) {
    if (!executeAt || !scheduleMode || scheduleMode === 'single') {
      return executeAt ?? null;
    }

    const nextExecuteAt = new Date(executeAt);
    while (nextExecuteAt <= referenceTime) {
      if (scheduleMode === 'daily') {
        nextExecuteAt.setDate(nextExecuteAt.getDate() + 1);
      } else if (scheduleMode === 'weekly') {
        nextExecuteAt.setDate(nextExecuteAt.getDate() + 7);
      } else if (scheduleMode === 'monthly') {
        nextExecuteAt.setMonth(nextExecuteAt.getMonth() + 1);
      } else {
        return executeAt;
      }
    }

    return nextExecuteAt;
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
    if (dto.databaseNames !== undefined) {
      data.databaseNames = dto.databaseNames as Prisma.InputJsonValue;
      if (!data.databaseName && dto.databaseNames.length > 0) {
        data.databaseName = dto.databaseNames[0];
      }
    }
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
    if (dto.sampleCount !== undefined)
      data.sampleCount = this.normalizeSampleCount(dto.sampleCount);
    if (dto.sampleStrategy !== undefined)
      data.sampleStrategy = this.normalizeSampleStrategy(dto.sampleStrategy);
    if (dto.sampleStorageMode !== undefined) {
      data.sampleStorageMode = this.normalizeSampleStorageMode(
        dto.sampleStorageMode,
      );
    }
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
      dataAsset: {
        include: {
          tables: {
            include: {
              columns: {
                orderBy: { ordinalPosition: 'asc' as const },
              },
            },
            orderBy: { databaseName: 'asc' as const },
          },
        },
      },
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
      charset: 'utf8mb4',
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
    databaseNames?: unknown;
    sourceUsername?: string | null;
    sourcePassword?: string | null;
  }) {
    const hasDb =
      (Array.isArray(task.databaseNames) && task.databaseNames.length > 0) ||
      Boolean(task.databaseName);
    return Boolean(
      task.sourceType.toLowerCase() === 'mysql' &&
        hasDb &&
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
    options?: {
      sampleCount?: number;
      sampleStrategy?: string;
      orderColumnName?: string | null;
      existingSamples?: string[];
      sampleStorageMode?: string;
    },
  ) {
    try {
      const db = this.toSafeIdentifier(databaseName);
      const table = this.toSafeIdentifier(tableName);
      const column = this.toSafeIdentifier(columnName);
      const sampleCount = this.normalizeSampleCount(options?.sampleCount);
      const sampleStrategy = this.normalizeSampleStrategy(
        options?.sampleStrategy,
      );
      const sampleStorageMode = this.normalizeSampleStorageMode(
        options?.sampleStorageMode,
      );
      const orderColumnName = options?.orderColumnName
        ? this.toSafeIdentifier(options.orderColumnName)
        : null;

      const query =
        sampleStrategy === 'random'
          ? `SELECT \`${column}\` AS value FROM \`${db}\`.\`${table}\` WHERE \`${column}\` IS NOT NULL ORDER BY RAND() LIMIT ${sampleCount}`
          : orderColumnName
            ? `SELECT \`${column}\` AS value FROM \`${db}\`.\`${table}\` WHERE \`${column}\` IS NOT NULL ORDER BY \`${orderColumnName}\` DESC LIMIT ${sampleCount}`
            : `SELECT \`${column}\` AS value FROM \`${db}\`.\`${table}\` WHERE \`${column}\` IS NOT NULL LIMIT ${sampleCount}`;
      const [rows] = await connection.query(query);

      const currentSamples = (rows as Array<{ value: unknown }>)
        .map((row) => row.value)
        .filter((value) => value !== null && value !== undefined)
        .map((value) => String(value));
      const dedupedCurrentSamples = Array.from(new Set(currentSamples));

      if (sampleStorageMode === 'incremental') {
        return Array.from(
          new Set([...(options?.existingSamples ?? []), ...dedupedCurrentSamples]),
        );
      }

      return dedupedCurrentSamples;
    } catch {
      return this.normalizeSampleStorageMode(options?.sampleStorageMode) ===
        'incremental'
        ? [...(options?.existingSamples ?? [])]
        : [];
    }
  }

  private findPreferredSampleOrderColumn(columns: RemoteColumn[]) {
    const primaryKey = columns.find((column) => column.COLUMN_KEY === 'PRI');
    if (primaryKey) {
      return primaryKey.COLUMN_NAME;
    }

    const preferredNames = [
      'updated_at',
      'update_time',
      'gmt_modified',
      'modified_at',
      'last_modified',
      'created_at',
      'create_time',
      'gmt_create',
      'id',
    ];

    const normalizedMap = new Map(
      columns.map((column) => [column.COLUMN_NAME.toLowerCase(), column.COLUMN_NAME]),
    );

    for (const candidate of preferredNames) {
      const matched = normalizedMap.get(candidate);
      if (matched) {
        return matched;
      }
    }

    return null;
  }

  private classifyColumn(
    column: RemoteColumn,
    table: RemoteTable,
    dataTypes: Awaited<ReturnType<ImportTasksService['loadTemplateDataTypes']>>,
  ) {
    const candidates = dataTypes
      .map((dataType) => {
        const score = dataType.rules.reduce((bestScore, rule) => {
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

  private resolveDbNames(dto: {
    databaseNames?: string[];
    databaseName?: string | null;
  }): string[] {
    if (Array.isArray(dto.databaseNames) && dto.databaseNames.length > 0) {
      return dto.databaseNames.filter(Boolean);
    }
    if (dto.databaseName) {
      return [dto.databaseName];
    }
    return [];
  }

  private async importMySqlSchema(taskId: string, dto: CreateImportTaskDto) {
    const dbNames = this.resolveDbNames(dto);
    if (dbNames.length === 0) {
      return;
    }

    const connection = await this.openMySqlConnection({
      ...dto,
      databaseName: undefined,
    });

    try {
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
        },
      });

      if (!asset) {
        asset = await this.prisma.dataAsset.create({
          data: {
            name: dto.sourceName,
            sourceType: dto.sourceType,
            ipAddress: dto.ipAddress,
            port: dto.port,
            status: CommonStatus.ACTIVE,
            dataLevel: DataLevel.INTERNAL,
            owner: creator?.name ?? '数据库导入',
            department: assetGroup?.department ?? '数据治理平台',
            description: dto.description,
            tags: ['mysql-import'],
            assetGroupId: dto.assetGroupId,
            isDeleted: false,
            deletedAt: null,
          },
        });
      } else {
        asset = await this.prisma.dataAsset.update({
          where: { id: asset.id },
          data: {
            name: dto.sourceName,
            sourceType: dto.sourceType,
            description: dto.description,
            assetGroupId: dto.assetGroupId,
            isDeleted: false,
            deletedAt: null,
          },
        });
      }

      let totalTableCount = 0;
      let totalFieldCount = 0;
      let totalRecordCount = 0;

      for (const dbName of dbNames) {
        const result = await this.importMySqlDatabase(
          connection,
          taskId,
          asset.id,
          dbName,
          dto,
        );
        totalTableCount += result.tableCount;
        totalFieldCount += result.fieldCount;
        totalRecordCount += result.recordCount;
      }

      // Recalculate asset-level stats across all databases
      const globalStats = await this.prisma.dataAssetTable.aggregate({
        where: { assetId: asset.id, isDeleted: false },
        _count: true,
        _sum: { sizeBytes: true, rowCount: true },
      });
      const globalFieldCount = await this.prisma.dataAssetColumn.count({
        where: { table: { assetId: asset.id, isDeleted: false }, isDeleted: false },
      });
      await this.prisma.dataAsset.update({
        where: { id: asset.id },
        data: {
          tableCount: globalStats._count,
          fieldCount: globalFieldCount,
          sizeBytes: globalStats._sum.sizeBytes ?? 0,
          recordCount: globalStats._sum.rowCount ?? 0,
          dataLevel: asset.dataLevel ?? DataLevel.INTERNAL,
          tags: ['mysql-import'],
          isDeleted: false,
          deletedAt: null,
        },
      });

      await this.prisma.importTask.update({
        where: { id: taskId },
        data: {
          status: ImportTaskStatus.SUCCESS,
          progress: 100,
          dataAssetId: asset.id,
          importedTableCount: totalTableCount,
          importedFieldCount: totalFieldCount,
          importedRecordCount: totalRecordCount,
          errorMessage: null,
        },
      });
    } finally {
      await connection.end();
    }
  }

  private async importMySqlDatabase(
    connection: mysql.Connection,
    taskId: string,
    assetId: string,
    databaseName: string,
    dto: CreateImportTaskDto,
  ) {
    const [schemaRows] = await connection.query(
      `SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ? LIMIT 1`,
      [databaseName],
    );
    const schemaExists =
      (schemaRows as Array<{ SCHEMA_NAME: string }>).length > 0;

    const syncTimestamp = new Date();

    if (!schemaExists) {
      await this.prisma.dataAssetColumn.updateMany({
        where: {
          table: { assetId, databaseName },
        },
        data: { isDeleted: true, deletedAt: syncTimestamp },
      });
      await this.prisma.dataAssetTable.updateMany({
        where: { assetId, databaseName },
        data: { isDeleted: true, deletedAt: syncTimestamp },
      });
      return { tableCount: 0, fieldCount: 0, recordCount: 0 };
    }

    const [tablesRows] = await connection.query(
      `SELECT TABLE_NAME, TABLE_COMMENT, ENGINE, TABLE_ROWS, DATA_LENGTH, INDEX_LENGTH
       FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME`,
      [databaseName],
    );
    const tablesResult = tablesRows as RemoteTable[];

    const [columnsRows] = await connection.query(
      `SELECT TABLE_NAME, COLUMN_NAME, COLUMN_COMMENT, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, ORDINAL_POSITION
       FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME, ORDINAL_POSITION`,
      [databaseName],
    );
    const columnsResult = columnsRows as RemoteColumn[];

    const existingTables = await this.prisma.dataAssetTable.findMany({
      where: { assetId, databaseName },
      include: { columns: true },
    });
    const existingTablesByName = new Map(
      existingTables.map((table) => [table.tableName, table]),
    );
    const existingSampleMap =
      dto.sampleStorageMode === 'incremental'
        ? new Map(
            existingTables.flatMap((table) =>
              table.columns.map((column) => [
                `${table.tableName}::${column.columnName}`,
                Array.isArray(column.sampleData)
                  ? (column.sampleData as string[])
                  : [],
              ]),
            ),
          )
        : new Map<string, string[]>();

    const columnsByTable = new Map<string, RemoteColumn[]>();
    columnsResult.forEach((column) => {
      const current = columnsByTable.get(column.TABLE_NAME) ?? [];
      current.push(column);
      columnsByTable.set(column.TABLE_NAME, current);
    });

    let fieldCount = 0;
    let recordCount = 0;
    const nextTableNames = new Set<string>();

    for (const table of tablesResult) {
      nextTableNames.add(table.TABLE_NAME);
      const tableColumns = columnsByTable.get(table.TABLE_NAME) ?? [];
      const sampleOrderColumn =
        this.findPreferredSampleOrderColumn(tableColumns);
      const existingTable = existingTablesByName.get(table.TABLE_NAME);
      recordCount += Number(table.TABLE_ROWS ?? 0);

      const persistedTable = existingTable
        ? await this.prisma.dataAssetTable.update({
            where: { id: existingTable.id },
            data: {
              importTaskId: taskId,
              tableComment: table.TABLE_COMMENT ?? '',
              engine: table.ENGINE ?? undefined,
              rowCount: Number(table.TABLE_ROWS ?? 0),
              sizeBytes:
                Number(table.DATA_LENGTH ?? 0) +
                Number(table.INDEX_LENGTH ?? 0),
              isDeleted: false,
              deletedAt: null,
            },
          })
        : await this.prisma.dataAssetTable.create({
            data: {
              assetId,
              importTaskId: taskId,
              databaseName,
              tableName: table.TABLE_NAME,
              tableComment: table.TABLE_COMMENT ?? '',
              engine: table.ENGINE ?? undefined,
              rowCount: Number(table.TABLE_ROWS ?? 0),
              sizeBytes:
                Number(table.DATA_LENGTH ?? 0) +
                Number(table.INDEX_LENGTH ?? 0),
              isDeleted: false,
              deletedAt: null,
            },
          });

      const existingColumnsByName = new Map(
        (existingTable?.columns ?? []).map((column) => [
          column.columnName,
          column,
        ]),
      );
      const nextColumnNames = new Set<string>();

      for (const column of tableColumns) {
        nextColumnNames.add(column.COLUMN_NAME);
        fieldCount += 1;
        const sampleData = await this.loadSampleData(
          connection,
          databaseName,
          table.TABLE_NAME,
          column.COLUMN_NAME,
          {
            sampleCount: dto.sampleCount,
            sampleStrategy: dto.sampleStrategy,
            sampleStorageMode: dto.sampleStorageMode,
            orderColumnName: sampleOrderColumn,
            existingSamples: existingSampleMap.get(
              `${table.TABLE_NAME}::${column.COLUMN_NAME}`,
            ),
          },
        );

        const existingColumn = existingColumnsByName.get(column.COLUMN_NAME);
        if (existingColumn) {
          await this.prisma.dataAssetColumn.update({
            where: { id: existingColumn.id },
            data: {
              tableId: persistedTable.id,
              columnComment: column.COLUMN_COMMENT ?? '',
              dataType: column.DATA_TYPE,
              columnType: column.COLUMN_TYPE,
              isNullable: column.IS_NULLABLE === 'YES',
              isPrimaryKey: column.COLUMN_KEY === 'PRI',
              ordinalPosition: column.ORDINAL_POSITION,
              sampleData,
              isDeleted: false,
              deletedAt: null,
            },
          });
        } else {
          await this.prisma.dataAssetColumn.create({
            data: {
              tableId: persistedTable.id,
              columnName: column.COLUMN_NAME,
              columnComment: column.COLUMN_COMMENT ?? '',
              dataType: column.DATA_TYPE,
              columnType: column.COLUMN_TYPE,
              isNullable: column.IS_NULLABLE === 'YES',
              isPrimaryKey: column.COLUMN_KEY === 'PRI',
              ordinalPosition: column.ORDINAL_POSITION,
              sampleData,
              isDeleted: false,
              deletedAt: null,
            },
          });
        }
      }

      const deletedColumnIds = (existingTable?.columns ?? [])
        .filter((column) => !nextColumnNames.has(column.columnName))
        .map((column) => column.id);

      if (deletedColumnIds.length > 0) {
        await this.prisma.dataAssetColumn.updateMany({
          where: { id: { in: deletedColumnIds } },
          data: { isDeleted: true, deletedAt: syncTimestamp },
        });
      }
    }

    const deletedTables = existingTables.filter(
      (table) => !nextTableNames.has(table.tableName),
    );
    const deletedTableIds = deletedTables.map((table) => table.id);

    if (deletedTableIds.length > 0) {
      await this.prisma.dataAssetTable.updateMany({
        where: { id: { in: deletedTableIds } },
        data: { isDeleted: true, deletedAt: syncTimestamp },
      });
      await this.prisma.dataAssetColumn.updateMany({
        where: { tableId: { in: deletedTableIds } },
        data: { isDeleted: true, deletedAt: syncTimestamp },
      });
    }

    return {
      tableCount: tablesResult.length,
      fieldCount,
      recordCount,
    };
  }

  private async syncLinkedClassificationTaskDataAsset(taskId: string) {
    const task = await this.prisma.importTask.findUnique({
      where: { id: taskId },
      include: {
        classificationTask: true,
      },
    });

    if (!task?.classificationTaskId || !task.dataAssetId || !task.classificationTask) {
      return;
    }

    const nextAssetIds = Array.from(
      new Set([
        ...this.normalizeAssetIds(task.classificationTask.dataAssetIds),
        task.dataAssetId,
      ]),
    );

    await this.prisma.classificationTask.update({
      where: { id: task.classificationTaskId },
      data: {
        dataAssetIds: nextAssetIds as Prisma.InputJsonValue,
        dataSource: await this.resolveClassificationTaskDataSource(
          nextAssetIds,
          task.classificationTask.dataSource,
        ),
        ...(task.classificationTask.status ===
        ClassificationTaskStatus.WAITING_IMPORT
          ? { status: ClassificationTaskStatus.PENDING }
          : {}),
      },
    });
  }

  private async maybeExecuteLinkedClassificationTask(taskId: string) {
    const task = await this.prisma.importTask.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        sourceName: true,
        status: true,
        classificationTaskId: true,
        runClassificationImmediatelyAfterImport: true,
        classificationTriggeredAt: true,
        dataAsset: {
          select: {
            isDeleted: true,
          },
        },
      },
    });

    if (
      !task ||
      task.status !== ImportTaskStatus.SUCCESS ||
      !task.classificationTaskId ||
      !task.runClassificationImmediatelyAfterImport ||
      task.classificationTriggeredAt ||
      task.dataAsset?.isDeleted
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
      await this.auditLogsService.record({
        category: AuditLogCategory.IMPORT_TASK,
        action: '触发关联分类分级任务',
        result: AuditLogResult.SUCCESS,
        actorName: '系统',
        targetType: 'import-task',
        targetId: task.id,
        targetName: task.sourceName,
        detail: `已自动触发关联分类分级任务 ${task.classificationTaskId}`,
        metadata: { classificationTaskId: task.classificationTaskId },
      });
    } catch (error) {
      console.error('Failed to auto execute linked classification task', error);
      await this.auditLogsService.record({
        category: AuditLogCategory.IMPORT_TASK,
        action: '触发关联分类分级任务',
        result: AuditLogResult.FAILED,
        actorName: '系统',
        targetType: 'import-task',
        targetId: task.id,
        targetName: task.sourceName,
        detail:
          error instanceof Error
            ? error.message
            : '关联分类分级任务触发失败',
        metadata: { classificationTaskId: task.classificationTaskId },
      });
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
        ...(task.scheduleMode !== 'single' &&
        task.executeAt &&
        task.executeAt <= new Date()
          ? {
              executeAt: this.calculateNextExecuteAt(
                task.scheduleMode,
                task.executeAt,
              ),
            }
          : {}),
      },
    });

    await this.auditLogsService.record({
      category: AuditLogCategory.IMPORT_TASK,
      action: '执行导入任务',
      result: AuditLogResult.RUNNING,
      actorId: task.creatorId,
      actorName: task.creator?.name ?? '系统',
      targetType: 'import-task',
      targetId: task.id,
      targetName: task.sourceName,
      detail: '导入任务开始执行',
      metadata: {
        scheduleMode: task.scheduleMode,
        executeAt: task.executeAt?.toISOString() ?? null,
      },
    });

    try {
      await this.importMySqlSchema(task.id, {
        sourceName: task.sourceName,
        sourceType: task.sourceType,
        ipAddress: task.ipAddress,
        port: task.port,
        databaseName: task.databaseName ?? undefined,
        databaseNames: Array.isArray(task.databaseNames)
          ? (task.databaseNames as string[])
          : undefined,
        sourceUsername: task.sourceUsername ?? undefined,
        sourcePassword: task.sourcePassword ?? undefined,
        assetGroupId: task.assetGroupId,
        creatorId: task.creatorId ?? undefined,
        classificationTaskId: task.classificationTaskId ?? undefined,
        sampleCount: task.sampleCount,
        sampleStrategy: task.sampleStrategy,
        sampleStorageMode: task.sampleStorageMode,
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

    const latestTask = await this.prisma.importTask.findUnique({
      where: { id: task.id },
      include: this.getInclude(),
    });

    if (latestTask?.status === ImportTaskStatus.SUCCESS) {
      await this.auditLogsService.record({
        category: AuditLogCategory.IMPORT_TASK,
        action: '执行导入任务',
        result: AuditLogResult.SUCCESS,
        actorId: latestTask.creatorId,
        actorName: latestTask.creator?.name ?? '系统',
        targetType: 'import-task',
        targetId: latestTask.id,
        targetName: latestTask.sourceName,
        detail: `导入完成，成功导入 ${latestTask.importedTableCount} 张表`,
        metadata: {
          importedTableCount: latestTask.importedTableCount,
          importedFieldCount: latestTask.importedFieldCount,
          importedRecordCount: latestTask.importedRecordCount,
        },
      });
    } else if (latestTask?.status === ImportTaskStatus.FAILED) {
      await this.auditLogsService.record({
        category: AuditLogCategory.IMPORT_TASK,
        action: '执行导入任务',
        result: AuditLogResult.FAILED,
        actorId: latestTask.creatorId,
        actorName: latestTask.creator?.name ?? '系统',
        targetType: 'import-task',
        targetId: latestTask.id,
        targetName: latestTask.sourceName,
        detail: latestTask.errorMessage ?? '导入任务执行失败',
      });
    }

    await this.syncLinkedClassificationTaskDataAsset(task.id);
    await this.maybeExecuteLinkedClassificationTask(task.id);

    return this.prisma.importTask.findUnique({
      where: { id: task.id },
      include: this.getInclude(),
    });
  }

  async executeNow(id: string) {
    return this.sanitizeTask(await this.executeImportTask(id));
  }

  async create(dto: CreateImportTaskDto) {
    const dbNames = this.resolveDbNames(dto);
    const commonData = {
      sourceName: dto.sourceName,
      sourceType: dto.sourceType,
      ipAddress: dto.ipAddress,
      port: dto.port,
      databaseName: dbNames[0] ?? dto.databaseName,
      databaseNames: dbNames as Prisma.InputJsonValue,
      sourceUsername: dto.sourceUsername,
      sourcePassword: dto.sourcePassword,
      scheduleMode: dto.scheduleMode?.trim() || 'single',
      executeAt: this.parseExecuteAt(dto.executeAt) ?? null,
      runClassificationImmediatelyAfterImport:
        dto.runClassificationImmediatelyAfterImport ?? false,
      status: dto.status ?? ImportTaskStatus.PENDING,
      progress: dto.progress ?? 0,
      sampleCount: this.normalizeSampleCount(dto.sampleCount),
      sampleStrategy: this.normalizeSampleStrategy(dto.sampleStrategy),
      sampleStorageMode: this.normalizeSampleStorageMode(dto.sampleStorageMode),
      description: dto.description,
      assetGroup: {
        connect: { id: dto.assetGroupId },
      },
      creator: dto.creatorId
        ? { connect: { id: dto.creatorId } }
        : undefined,
      classificationTask: dto.classificationTaskId
        ? { connect: { id: dto.classificationTaskId } }
        : undefined,
    };

    const task = await this.prisma.importTask.create({
      data: commonData,
      include: this.getInclude(),
    });

    await this.auditLogsService.record({
      category: AuditLogCategory.IMPORT_TASK,
      action: '创建导入任务',
      result: AuditLogResult.SUCCESS,
      actorId: task.creatorId,
      actorName: task.creator?.name ?? '当前用户',
      targetType: 'import-task',
      targetId: task.id,
      targetName: task.sourceName,
      detail:
        dto.runImmediately === false
          ? '导入任务已创建，等待按计划执行'
          : '导入任务已创建',
      metadata: {
        scheduleMode: task.scheduleMode,
        executeAt: task.executeAt?.toISOString() ?? null,
        runImmediately: dto.runImmediately ?? true,
      },
    });

    // Mark matching auto-scan results as claimed
    await this.prisma.autoScanResult.updateMany({
      where: { ipAddress: dto.ipAddress, port: dto.port, claimed: false },
      data: { claimed: true },
    });

    if (dto.runImmediately === false || !this.canExecuteImportTask(task)) {
      return this.sanitizeTask(task);
    }

    return this.sanitizeTask(
      (await this.executeImportTask(task.id)) ?? task,
    );
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

    await this.auditLogsService.record({
      category: AuditLogCategory.IMPORT_TASK,
      action:
        dto.classificationTaskId !== undefined
          ? '关联分类分级任务'
          : dto.status === ImportTaskStatus.SUCCESS
            ? '标记导入完成'
            : dto.status === ImportTaskStatus.FAILED
              ? '标记导入失败'
              : '更新导入任务',
      result: AuditLogResult.SUCCESS,
      actorId: updatedTask.creatorId,
      actorName: updatedTask.creator?.name ?? '当前用户',
      targetType: 'import-task',
      targetId: updatedTask.id,
      targetName: updatedTask.sourceName,
      detail:
        dto.classificationTaskId !== undefined
          ? `已关联分类分级任务 ${dto.classificationTaskId ?? ''}`
          : updatedTask.description ?? '导入任务配置已更新',
    });

    if (updatedTask.status === ImportTaskStatus.SUCCESS) {
      await this.syncLinkedClassificationTaskDataAsset(id);
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

  private async cleanupClassificationTaskLink(
    task: {
      id: string;
      dataAssetId: string | null;
      classificationTask: {
        id: string;
        source: ClassificationTaskSource;
        dataAssetIds: unknown;
        dataSource: string;
      } | null;
    },
    excludeImportTaskIds: string[],
  ) {
    let deleted = false;
    if (!task.classificationTask?.id) return deleted;

    const currentAssetIds = this.normalizeAssetIds(
      task.classificationTask.dataAssetIds,
    );
    const nextAssetIds = task.dataAssetId
      ? currentAssetIds.filter((assetId) => assetId !== task.dataAssetId)
      : currentAssetIds;

    const linkedImportTaskCount = await this.prisma.importTask.count({
      where: {
        classificationTaskId: task.classificationTask.id,
        NOT: { id: { in: excludeImportTaskIds } },
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
      deleted = true;
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

    return deleted;
  }

  private async cleanupDataAsset(
    dataAssetId: string | null,
    excludeImportTaskIds: string[],
  ) {
    if (!dataAssetId) return false;

    const relatedTaskCount = await this.prisma.importTask.count({
      where: {
        dataAssetId,
        NOT: { id: { in: excludeImportTaskIds } },
      },
    });

    if (relatedTaskCount === 0) {
      await this.prisma.dataAsset.delete({
        where: { id: dataAssetId },
      });
      return true;
    }

    return false;
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

    // Clean up classification task link
    let deletedClassificationTask = false;
    if (task.classificationTask?.id) {
      deletedClassificationTask = await this.cleanupClassificationTaskLink(task, [task.id]);
    }

    // Delete the import task
    await this.prisma.importTask.delete({
      where: { id },
    });

    await this.auditLogsService.record({
      category: AuditLogCategory.IMPORT_TASK,
      action: '删除导入任务',
      result: AuditLogResult.SUCCESS,
      actorId: task.creatorId,
      actorName: '当前用户',
      targetType: 'import-task',
      targetId: task.id,
      targetName: task.sourceName,
      detail: '导入任务已删除',
    });

    // Clean up orphaned data asset
    let deletedDataAsset = false;
    if (task.dataAssetId) {
      deletedDataAsset = await this.cleanupDataAsset(task.dataAssetId, [task.id]);
    }

    return {
      success: true,
      deletedClassificationTask,
      deletedDataAsset,
    };
  }
}
