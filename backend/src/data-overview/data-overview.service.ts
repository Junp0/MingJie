import { Injectable } from '@nestjs/common';
import {
  CommonStatus,
  DataLevel,
  ProtectionFeatureType,
  TemplateStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type OverviewDataLevel = 'public' | 'internal' | 'confidential' | 'secret';
type OverviewLevelCode = 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
type ProtectionStatus = 'not_required' | 'recommended' | 'confirmed';
type FeatureMatcherConfig = {
  matcher: string;
  expression: string;
  hitRate: number;
};

type PathNode = {
  id: string;
  name: string;
  parentId: string | null;
};

type OverviewReferenceData = {
  assetGroupMap: Map<string, PathNode>;
  classificationCategoryMap: Map<string, PathNode>;
  levelColorMap: Map<OverviewLevelCode, string>;
};

export interface OverviewFieldRecord {
  id: string;
  databaseName: string;
  tableName: string;
  fieldName: string;
  fieldComment: string;
  fieldTable: string;
  dataType: string;
  dataCategory: string;
  dataTypeName: string;
  classificationPathNames: string[];
  dataLevel: OverviewDataLevel | null;
  levelCode: OverviewLevelCode | null;
  levelColor?: string | null;
  isSensitive: boolean;
  maskingStatus: ProtectionStatus;
  encryptionStatus: ProtectionStatus;
  groupName: string;
  rootGroupName: string;
  assetGroupPathNames: string[];
  sampleData: string[];
  updateTime: string;
  status: 'active' | 'inactive' | 'processing';
}

export interface MissedDataRecord extends Omit<OverviewFieldRecord, 'status'> {
  key: string;
  missCount: number;
  missRate: number;
  lastCheckTime: string;
  status: 'high' | 'medium' | 'low';
  source: string;
  priority: 'high' | 'medium' | 'low';
}

export interface TableFieldRecord {
  id: string;
  fieldName: string;
  fieldComment: string;
  fieldTable: string;
  dataType: string;
  dataCategory: string;
  dataTypeName: string;
  classificationPathNames: string[];
  dataLevel: OverviewDataLevel | null;
  levelCode: OverviewLevelCode | null;
  levelColor?: string | null;
  isSensitive: boolean;
  maskingStatus: ProtectionStatus;
  encryptionStatus: ProtectionStatus;
  groupName: string;
  rootGroupName: string;
  assetGroupPathNames: string[];
  sampleData: string[];
  updateTime: string;
}

export interface TableRecord {
  id: string;
  name: string;
  databaseId: string;
  rowCount: number;
  size: number;
  status: 'online' | 'offline' | 'maintenance';
  lastSyncTime: string;
  syncStatus: 'success' | 'failed' | 'syncing';
  fields: TableFieldRecord[];
}

export interface DatabaseRecord {
  id: string;
  assetId: string;
  assetName: string;
  name: string;
  type: string;
  status: 'online' | 'offline';
  tables: TableRecord[];
}

export interface DatabaseInstanceRecord {
  ip: string;
  status: 'online' | 'offline';
  databases: DatabaseRecord[];
}

@Injectable()
export class DataOverviewService {
  constructor(private readonly prisma: PrismaService) {}

  private mapPersistedLevel(level?: DataLevel | null): OverviewDataLevel | null {
    if (!level) return null;
    if (level === 'PUBLIC') return 'public';
    if (level === 'CONFIDENTIAL') return 'confidential';
    if (level === 'SECRET') return 'secret';
    return 'internal';
  }

  private mapPersistedLevelCode(
    level?: DataLevel | null,
    classificationLevelCode?: string | null,
  ): OverviewLevelCode | null {
    if (
      classificationLevelCode === 'L1' ||
      classificationLevelCode === 'L2' ||
      classificationLevelCode === 'L3' ||
      classificationLevelCode === 'L4' ||
      classificationLevelCode === 'L5'
    ) {
      return classificationLevelCode;
    }

    if (!level) return null;
    if (level === 'PUBLIC') return 'L1';
    if (level === 'CONFIDENTIAL') return 'L3';
    if (level === 'SECRET') return 'L4';
    return 'L2';
  }

  private formatDateTime(value?: Date | null) {
    if (!value) return '';
    return value.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
  }

  private createPathMap(items: PathNode[]): Map<string, PathNode> {
    return new Map(items.map((item) => [item.id, item]));
  }

  private buildPathNames(
    nodeId: string | null | undefined,
    nodeMap: Map<string, PathNode>,
  ): string[] {
    if (!nodeId) {
      return [];
    }

    const pathNames: string[] = [];
    let current = nodeMap.get(nodeId) ?? null;

    while (current) {
      pathNames.unshift(current.name);
      current = current.parentId ? nodeMap.get(current.parentId) ?? null : null;
    }

    return pathNames;
  }

  private buildAssetGroupMeta(
    assetGroupId: string | null | undefined,
    fallbackGroupName: string | null | undefined,
    assetGroupMap: Map<string, PathNode>,
  ) {
    const normalizedFallback = fallbackGroupName?.trim() ?? '';
    const resolvedPath = this.buildPathNames(assetGroupId, assetGroupMap);
    const assetGroupPathNames = resolvedPath.length
      ? resolvedPath
      : normalizedFallback
        ? [normalizedFallback]
        : [];
    const groupName =
      assetGroupPathNames[assetGroupPathNames.length - 1] || normalizedFallback || '';
    const rootGroupName = assetGroupPathNames[0] || normalizedFallback || '未分组';

    return {
      groupName,
      rootGroupName,
      assetGroupPathNames,
    };
  }

  private buildClassificationMeta(
    categoryId: string | null | undefined,
    dataTypeName: string | null | undefined,
    fallbackCategoryName: string | null | undefined,
    classificationCategoryMap: Map<string, PathNode>,
  ) {
    const normalizedDataTypeName = dataTypeName?.trim() || '';
    const normalizedCategoryName = fallbackCategoryName?.trim() || '';
    const displayName = normalizedDataTypeName || normalizedCategoryName || '未分类';
    const resolvedCategoryPath = this.buildPathNames(
      categoryId,
      classificationCategoryMap,
    );
    const categoryPathNames = resolvedCategoryPath.length
      ? resolvedCategoryPath
      : normalizedCategoryName && normalizedCategoryName !== displayName
        ? [normalizedCategoryName]
        : [];
    const classificationPathNames = [...categoryPathNames, displayName].filter(Boolean);

    return {
      dataCategory:
        categoryPathNames[categoryPathNames.length - 1] ||
        normalizedCategoryName ||
        displayName,
      dataTypeName: displayName,
      classificationPathNames: classificationPathNames.length
        ? classificationPathNames
        : [displayName],
    };
  }

  private async getOverviewReferenceData(): Promise<OverviewReferenceData> {
    const [assetGroups, classificationCategories, templates] = await Promise.all([
      this.prisma.assetGroup.findMany({
        select: {
          id: true,
          name: true,
          parentId: true,
        },
      }),
      this.prisma.classificationCategory.findMany({
        select: {
          id: true,
          name: true,
          parentId: true,
        },
      }),
      this.prisma.classificationTemplate.findMany({
        select: {
          status: true,
          createdAt: true,
          levelDefinitions: {
            select: {
              code: true,
              color: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const activeTemplate =
      templates.find((item) => item.status === TemplateStatus.ACTIVE) ?? templates[0] ?? null;
    const levelColorMap = new Map<OverviewLevelCode, string>();

    activeTemplate?.levelDefinitions.forEach((level) => {
      if (
        (level.code === 'L1' ||
          level.code === 'L2' ||
          level.code === 'L3' ||
          level.code === 'L4' ||
          level.code === 'L5') &&
        /^#[0-9a-fA-F]{6}$/.test(level.color?.trim() ?? '')
      ) {
        levelColorMap.set(level.code, level.color!.trim());
      }
    });

    return {
      assetGroupMap: this.createPathMap(
        assetGroups.map((group) => ({
          id: group.id,
          name: group.name,
          parentId: group.parentId,
        })),
      ),
      classificationCategoryMap: this.createPathMap(
        classificationCategories.map((category) => ({
          id: category.id,
          name: category.name,
          parentId: category.parentId,
        })),
      ),
      levelColorMap,
    };
  }

  private normalizeAssetName(value: string) {
    return value
      .trim()
      .replace(/_db$/i, '')
      .replace(/[^\w\u4e00-\u9fa5]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private inferFieldName(dataTypeName: string, index: number) {
    if (/手机|电话/i.test(dataTypeName)) return 'phone_number';
    if (/姓名|名称/i.test(dataTypeName)) return 'user_name';
    if (/身份证/i.test(dataTypeName)) return 'id_card';
    if (/金额|账单|订单/i.test(dataTypeName)) return 'order_amount';
    if (/邮箱/i.test(dataTypeName)) return 'email';
    if (/地址/i.test(dataTypeName)) return 'address';

    const normalized = dataTypeName
      .trim()
      .replace(/[^\w]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();

    return normalized || `field_${index + 1}`;
  }

  private inferSqlType(fieldName: string) {
    if (fieldName.includes('amount')) return 'DECIMAL(10,2)';
    if (fieldName.includes('time') || fieldName.includes('date')) return 'DATETIME';
    if (fieldName.includes('id')) return 'VARCHAR(32)';
    if (fieldName.includes('phone')) return 'VARCHAR(20)';
    if (fieldName.includes('email')) return 'VARCHAR(100)';
    return 'VARCHAR(255)';
  }

  private mapDataLevel(code?: string | null, isSensitive?: boolean, needEncrypt?: boolean): OverviewDataLevel {
    if (code === 'L1') return 'public';
    if (code === 'L2') return 'internal';
    if (code === 'L3') return 'confidential';
    if (code === 'L4' || code === 'L5') return 'secret';
    if (needEncrypt) return 'secret';
    if (isSensitive) return 'confidential';
    return 'internal';
  }

  private mapLevelCode(
    code?: string | null,
    isSensitive?: boolean,
    needEncrypt?: boolean,
  ): OverviewLevelCode {
    if (
      code === 'L1' ||
      code === 'L2' ||
      code === 'L3' ||
      code === 'L4' ||
      code === 'L5'
    ) {
      return code;
    }

    if (needEncrypt) return 'L4';
    if (isSensitive) return 'L3';
    return 'L2';
  }

  private getDefaultLevelColor(levelCode: OverviewLevelCode): string {
    if (levelCode === 'L1') return '#52c41a';
    if (levelCode === 'L2') return '#1677ff';
    if (levelCode === 'L3') return '#fa8c16';
    if (levelCode === 'L4') return '#f5222d';
    return '#722ed1';
  }

  private resolveLevelColor(
    levelCode: OverviewLevelCode | null | undefined,
    levelColor?: string | null,
    levelColorMap?: Map<OverviewLevelCode, string>,
  ): string | null {
    if (!levelCode) {
      return null;
    }

    const normalized = levelColor?.trim() ?? '';
    if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
      return normalized;
    }

    const templateColor = levelColorMap?.get(levelCode);
    if (templateColor) {
      return templateColor;
    }

    return this.getDefaultLevelColor(levelCode);
  }

  private buildSampleData(
    fieldName: string,
    maskingSampleValue?: string,
    encryptionSampleValue?: string,
  ) {
    if (fieldName.includes('phone')) {
      return [maskingSampleValue || '138****1234'];
    }
    if (fieldName.includes('id_card')) {
      return [maskingSampleValue || '110***********1234'];
    }
    if (fieldName.includes('amount')) {
      return ['299.99', '599.50'];
    }
    if (fieldName.includes('email')) {
      return ['demo@example.com'];
    }
    if (fieldName.includes('name')) {
      return ['张三', '李四'];
    }
    if (encryptionSampleValue) {
      return [encryptionSampleValue];
    }

    return ['sample_value'];
  }

  private matchProtectionFeatureValue(value: string, matcher: string, expected: string) {
    const normalizedValue = value.toLowerCase();
    const normalizedExpected = expected.toLowerCase();

    switch (matcher) {
      case 'equals':
        return normalizedValue === normalizedExpected;
      case 'contains':
      case 'enumContains':
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
      default:
        return false;
    }
  }

  private resolveProtectionStatus(
    recommended: boolean,
    sampleData: string[],
    features: FeatureMatcherConfig[],
  ): ProtectionStatus {
    if (!recommended) {
      return 'not_required';
    }

    const normalizedSamples = sampleData
      .map((item) => item.trim())
      .filter(Boolean);

    const bestHitRate = normalizedSamples.length
      ? features.reduce((bestRate, feature) => {
          const matchedCount = normalizedSamples.filter((sample) =>
            this.matchProtectionFeatureValue(sample, feature.matcher, feature.expression),
          ).length;
          const currentRate = (matchedCount / normalizedSamples.length) * 100;

          return currentRate > feature.hitRate && currentRate > bestRate
            ? currentRate
            : bestRate;
        }, 0)
      : 0;

    return bestHitRate > 0 ? 'confirmed' : 'recommended';
  }

  private async getActiveProtectionFeatures() {
    const [maskingFeatures, encryptionFeatures] = await Promise.all([
      this.prisma.protectionFeature.findMany({
        where: {
          featureType: ProtectionFeatureType.MASKING,
          status: 'ACTIVE',
        },
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.protectionFeature.findMany({
        where: {
          featureType: ProtectionFeatureType.ENCRYPTION,
          status: 'ACTIVE',
        },
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      }),
    ]);

    return {
      maskingFeatures,
      encryptionFeatures,
      primaryMaskingFeature: maskingFeatures[0] ?? null,
      primaryEncryptionFeature: encryptionFeatures[0] ?? null,
    };
  }

  private async getOverviewContext() {
    const [assets, templates, scanResults, protectionFeatures] = await Promise.all([
      this.prisma.dataAsset.findMany({
        include: { assetGroup: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.classificationTemplate.findMany({
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
      }),
      this.prisma.autoScanResult.findMany({
        include: { assetGroup: true, dataAsset: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.getActiveProtectionFeatures(),
    ]);

    const template =
      templates.find((item) => item.status === TemplateStatus.ACTIVE) ?? templates[0] ?? null;

    return {
      assets,
      template,
      maskingFeatures: protectionFeatures.maskingFeatures,
      encryptionFeatures: protectionFeatures.encryptionFeatures,
      primaryMaskingFeature: protectionFeatures.primaryMaskingFeature,
      primaryEncryptionFeature: protectionFeatures.primaryEncryptionFeature,
      scanResults,
    };
  }

  private async getImportedAssets() {
    return this.prisma.dataAsset.findMany({
      include: {
        assetGroup: true,
        tables: {
          include: {
            columns: {
              include: {
                classificationDataType: {
                  include: {
                    category: true,
                    levelDefinition: true,
                  },
                },
              },
            },
          },
          orderBy: { tableName: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async buildFullDataRecords(
    referenceData?: OverviewReferenceData,
  ): Promise<OverviewFieldRecord[]> {
    const {
      assets,
      template,
      maskingFeatures,
      encryptionFeatures,
      primaryMaskingFeature,
      primaryEncryptionFeature,
    } = await this.getOverviewContext();
    const resolvedReferenceData =
      referenceData ?? (await this.getOverviewReferenceData());

    const templateDataTypes = template?.dataTypes ?? [];

    return assets.flatMap((asset) => {
      const databaseName = asset.sourceDatabaseName ?? this.normalizeAssetName(asset.name);
      const tableName = `${this.normalizeAssetName(asset.name)}_main`;
      const assetGroupMeta = this.buildAssetGroupMeta(
        asset.assetGroupId,
        asset.assetGroup?.name,
        resolvedReferenceData.assetGroupMap,
      );
      const effectiveDataTypes =
        templateDataTypes.length > 0
          ? templateDataTypes
          : [
              {
                id: `${asset.id}-default`,
                name: asset.name,
                isSensitive: asset.dataLevel !== 'PUBLIC',
                needMask: asset.dataLevel !== 'PUBLIC',
                needEncrypt: asset.dataLevel === 'SECRET',
                category: { name: '未分类' },
                levelDefinition: null,
              },
            ];

      return effectiveDataTypes.map((dataType, index) => {
        const fieldName = this.inferFieldName(dataType.name, index);
        const sampleData = this.buildSampleData(
          fieldName,
          primaryMaskingFeature?.sampleValue ?? undefined,
          primaryEncryptionFeature?.sampleValue ?? undefined,
        );
        const classificationMeta = this.buildClassificationMeta(
          'id' in dataType.category ? dataType.category.id : null,
          dataType.name,
          dataType.category?.name ?? '未分类',
          resolvedReferenceData.classificationCategoryMap,
        );
        const levelCode = this.mapLevelCode(
          dataType.levelDefinition?.code,
          dataType.isSensitive,
          dataType.needEncrypt,
        );
        const status =
          asset.status === CommonStatus.ACTIVE
            ? 'active'
            : asset.status === CommonStatus.INACTIVE
              ? 'processing'
              : 'inactive';

        return {
          id: `${asset.id}-${dataType.id}`,
          databaseName,
          tableName,
          fieldName,
          fieldComment: dataType.name,
          fieldTable: tableName,
          dataType: this.inferSqlType(fieldName),
          dataCategory: classificationMeta.dataCategory,
          dataTypeName: classificationMeta.dataTypeName,
          classificationPathNames: classificationMeta.classificationPathNames,
          dataLevel: this.mapDataLevel(
            dataType.levelDefinition?.code,
            dataType.isSensitive,
            dataType.needEncrypt,
          ),
          levelCode,
          levelColor: this.resolveLevelColor(
            levelCode,
            dataType.levelDefinition?.color,
            resolvedReferenceData.levelColorMap,
          ),
          isSensitive: dataType.isSensitive,
          maskingStatus: this.resolveProtectionStatus(
            dataType.needMask,
            sampleData,
            maskingFeatures,
          ),
          encryptionStatus: this.resolveProtectionStatus(
            dataType.needEncrypt,
            sampleData,
            encryptionFeatures,
          ),
          groupName: assetGroupMeta.groupName,
          rootGroupName: assetGroupMeta.rootGroupName,
          assetGroupPathNames: assetGroupMeta.assetGroupPathNames,
          sampleData,
          updateTime: this.formatDateTime(asset.updatedAt),
          status,
        } satisfies OverviewFieldRecord;
      });
    });
  }

  async listFullData() {
    const [referenceData, protectionFeatures, importedAssets] = await Promise.all([
      this.getOverviewReferenceData(),
      this.getActiveProtectionFeatures(),
      this.getImportedAssets(),
    ]);
    const { maskingFeatures, encryptionFeatures } = protectionFeatures;
    const importedColumns = importedAssets.flatMap((asset) =>
      asset.tables.flatMap((table) => {
        const databaseName = asset.sourceDatabaseName ?? this.normalizeAssetName(asset.name);
        const assetGroupMeta = this.buildAssetGroupMeta(
          asset.assetGroupId,
          asset.assetGroup?.name,
          referenceData.assetGroupMap,
        );

        return table.columns.map((column) => {
          const sampleData = Array.isArray(column.sampleData) ? (column.sampleData as string[]) : [];
          const classificationMeta = this.buildClassificationMeta(
            column.classificationDataType?.categoryId ?? null,
            column.classificationDataType?.name ?? null,
            column.dataCategory ?? '未分类',
            referenceData.classificationCategoryMap,
          );
          const dataLevel = this.mapPersistedLevel(column.dataLevel);
          const levelCode = this.mapPersistedLevelCode(
            column.dataLevel,
            column.classificationDataType?.levelDefinition?.code,
          );

          return {
            id: column.id,
            databaseName,
            tableName: table.tableName,
            fieldName: column.columnName,
            fieldComment: column.columnComment ?? '',
            fieldTable: table.tableName,
            dataType: column.columnType,
            dataCategory: classificationMeta.dataCategory,
            dataTypeName: classificationMeta.dataTypeName,
            classificationPathNames: classificationMeta.classificationPathNames,
            dataLevel,
            levelCode,
            levelColor: this.resolveLevelColor(
              levelCode,
              column.classificationDataType?.levelDefinition?.color,
              referenceData.levelColorMap,
            ),
            isSensitive: column.isSensitive,
            maskingStatus: this.resolveProtectionStatus(
              column.needMask,
              sampleData,
              maskingFeatures,
            ),
            encryptionStatus: this.resolveProtectionStatus(
              column.needEncrypt,
              sampleData,
              encryptionFeatures,
            ),
            groupName: assetGroupMeta.groupName,
            rootGroupName: assetGroupMeta.rootGroupName,
            assetGroupPathNames: assetGroupMeta.assetGroupPathNames,
            sampleData,
            updateTime: this.formatDateTime(column.updatedAt),
            status:
              asset.status === CommonStatus.ACTIVE
                ? 'active'
                : asset.status === CommonStatus.INACTIVE
                  ? 'processing'
                  : 'inactive',
          } satisfies OverviewFieldRecord;
        });
      }),
    );

    if (importedColumns.length > 0) {
      return importedColumns;
    }

    return this.buildFullDataRecords(referenceData);
  }

  async listMissedData() {
    const [referenceData, protectionFeatures, importedAssets] = await Promise.all([
      this.getOverviewReferenceData(),
      this.getActiveProtectionFeatures(),
      this.getImportedAssets(),
    ]);
    const { maskingFeatures, encryptionFeatures } = protectionFeatures;
    const importedMissedColumns = importedAssets.flatMap((asset) =>
      asset.tables.flatMap((table) => {
        const databaseName = asset.sourceDatabaseName ?? this.normalizeAssetName(asset.name);
        const assetGroupMeta = this.buildAssetGroupMeta(
          asset.assetGroupId,
          asset.assetGroup?.name,
          referenceData.assetGroupMap,
        );

        return table.columns
          .filter((column) => !column.classificationDataTypeId)
          .map((column, index) => {
            const priority = index % 3 === 0 ? 'high' : index % 3 === 1 ? 'medium' : 'low';
            const missRate = Math.min(95, 25 + index * 6);
            const sampleData = Array.isArray(column.sampleData) ? (column.sampleData as string[]) : [];
            const classificationMeta = this.buildClassificationMeta(
              column.classificationDataType?.categoryId ?? null,
              column.classificationDataType?.name ?? null,
              column.dataCategory ?? '未分类',
              referenceData.classificationCategoryMap,
            );
            const dataLevel = this.mapPersistedLevel(column.dataLevel);
            const levelCode = this.mapPersistedLevelCode(
              column.dataLevel,
              column.classificationDataType?.levelDefinition?.code,
            );
            return {
              id: column.id,
              databaseName,
              tableName: table.tableName,
              fieldName: column.columnName,
              fieldComment: column.columnComment ?? '',
              fieldTable: table.tableName,
              dataType: column.columnType,
              dataCategory: classificationMeta.dataCategory,
              dataTypeName: classificationMeta.dataTypeName,
              classificationPathNames: classificationMeta.classificationPathNames,
              dataLevel,
              levelCode,
              levelColor: this.resolveLevelColor(
                levelCode,
                column.classificationDataType?.levelDefinition?.color,
                referenceData.levelColorMap,
              ),
              isSensitive: column.isSensitive,
              maskingStatus: this.resolveProtectionStatus(
                column.needMask,
                sampleData,
                maskingFeatures,
              ),
              encryptionStatus: this.resolveProtectionStatus(
                column.needEncrypt,
                sampleData,
                encryptionFeatures,
              ),
              groupName: assetGroupMeta.groupName,
              rootGroupName: assetGroupMeta.rootGroupName,
              assetGroupPathNames: assetGroupMeta.assetGroupPathNames,
              key: `${asset.ipAddress}:${asset.port}:${table.tableName}:${column.columnName}`,
              missCount: 10 + index * 3,
              missRate,
              lastCheckTime: this.formatDateTime(column.updatedAt),
              status: priority,
              source: '真实导入',
              priority,
              sampleData,
              updateTime: this.formatDateTime(column.updatedAt),
            } satisfies MissedDataRecord;
          });
      }),
    );

    if (importedMissedColumns.length > 0) {
      return importedMissedColumns;
    }

    const { scanResults } = await this.getOverviewContext();

    return scanResults
      .filter((item) => !item.dataAsset && !item.ignoredAt)
      .map((item, index) => {
        const priority = index % 3 === 0 ? 'high' : index % 3 === 1 ? 'medium' : 'low';
        const missRate = Math.min(95, 20 + index * 7);
        const assetGroupMeta = this.buildAssetGroupMeta(
          item.assetGroupId,
          item.assetGroup?.name ?? '未分组',
          referenceData.assetGroupMap,
        );
        const classificationMeta = this.buildClassificationMeta(
          null,
          '待治理资产',
          '待治理资产',
          referenceData.classificationCategoryMap,
        );

        return {
          id: item.id,
          databaseName: item.databaseName ?? item.sourceName,
          tableName: item.databaseName ?? 'auto_scan',
          fieldName: item.databaseName ?? item.sourceName,
          fieldComment: `${item.sourceName} 未认领资产`,
          fieldTable: item.databaseName ?? 'auto_scan',
          dataType: item.sourceType.toUpperCase(),
          dataCategory: classificationMeta.dataCategory,
          dataTypeName: classificationMeta.dataTypeName,
          classificationPathNames: classificationMeta.classificationPathNames,
          dataLevel: 'internal',
          levelCode: 'L2',
          levelColor: this.resolveLevelColor('L2', null, referenceData.levelColorMap),
          isSensitive: false,
          maskingStatus: 'not_required',
          encryptionStatus: 'not_required',
          groupName: assetGroupMeta.groupName,
          rootGroupName: assetGroupMeta.rootGroupName,
          assetGroupPathNames: assetGroupMeta.assetGroupPathNames,
          key: `${item.ipAddress}:${item.port}`,
          missCount: 10 + index * 5,
          missRate,
          lastCheckTime: this.formatDateTime(item.updatedAt),
          status: priority,
          source: '自动扫描',
          priority,
          sampleData: [item.ipAddress, item.databaseName ?? item.sourceName],
          updateTime: this.formatDateTime(item.updatedAt),
        } satisfies MissedDataRecord;
      });
  }

  async listTableData() {
    const [referenceData, protectionFeatures, importedAssets] = await Promise.all([
      this.getOverviewReferenceData(),
      this.getActiveProtectionFeatures(),
      this.getImportedAssets(),
    ]);
    const { maskingFeatures, encryptionFeatures } = protectionFeatures;
    const importedDatabases = importedAssets.filter((asset) => asset.tables.length > 0);
    if (importedDatabases.length > 0) {
      const groupedByIp = new Map<string, typeof importedDatabases>();
      importedDatabases.forEach((asset) => {
        const current = groupedByIp.get(asset.ipAddress) ?? [];
        current.push(asset);
        groupedByIp.set(asset.ipAddress, current);
      });

      return Array.from(groupedByIp.entries()).map(([ip, ipAssets]) => ({
        ip,
        status: ipAssets.some((asset) => asset.status === CommonStatus.ACTIVE) ? 'online' : 'offline',
        databases: ipAssets.map((asset) => {
          const assetGroupMeta = this.buildAssetGroupMeta(
            asset.assetGroupId,
            asset.assetGroup?.name,
            referenceData.assetGroupMap,
          );

          return {
            id: asset.id,
            assetId: asset.id,
            assetName: asset.name,
            name: asset.sourceDatabaseName ?? this.normalizeAssetName(asset.name),
            type: asset.sourceType,
            status: asset.status === CommonStatus.ACTIVE ? 'online' : 'offline',
            tables: asset.tables.map((table) => ({
              id: table.id,
              name: table.tableName,
              databaseId: asset.id,
              rowCount: table.rowCount,
              size: table.sizeBytes,
              status:
                asset.status === CommonStatus.ARCHIVED
                  ? 'maintenance'
                  : asset.status === CommonStatus.ACTIVE
                ? 'online'
                : 'offline',
              lastSyncTime: this.formatDateTime(table.updatedAt),
              syncStatus: 'success',
              fields: table.columns.map((column) => {
                const sampleData = Array.isArray(column.sampleData)
                  ? (column.sampleData as string[])
                  : [];
                const classificationMeta = this.buildClassificationMeta(
                  column.classificationDataType?.categoryId ?? null,
                  column.classificationDataType?.name ?? null,
                  column.dataCategory ?? '未分类',
                  referenceData.classificationCategoryMap,
                );
                const dataLevel = this.mapPersistedLevel(column.dataLevel);
                const levelCode = this.mapPersistedLevelCode(
                  column.dataLevel,
                  column.classificationDataType?.levelDefinition?.code,
                );

                return {
                  id: column.id,
                  fieldName: column.columnName,
                  fieldComment: column.columnComment ?? '',
                  fieldTable: table.tableName,
                  dataType: column.columnType,
                  dataCategory: classificationMeta.dataCategory,
                  dataTypeName: classificationMeta.dataTypeName,
                  classificationPathNames:
                    classificationMeta.classificationPathNames,
                  dataLevel,
                  levelCode,
                  levelColor: this.resolveLevelColor(
                    levelCode,
                    column.classificationDataType?.levelDefinition?.color,
                    referenceData.levelColorMap,
                  ),
                  isSensitive: column.isSensitive,
                  maskingStatus: this.resolveProtectionStatus(
                    column.needMask,
                    sampleData,
                    maskingFeatures,
                  ),
                  encryptionStatus: this.resolveProtectionStatus(
                    column.needEncrypt,
                    sampleData,
                    encryptionFeatures,
                  ),
                  groupName: assetGroupMeta.groupName,
                  rootGroupName: assetGroupMeta.rootGroupName,
                  assetGroupPathNames: assetGroupMeta.assetGroupPathNames,
                  sampleData,
                  updateTime: this.formatDateTime(column.updatedAt),
                };
              }),
            })),
          } satisfies DatabaseRecord;
        }),
      } satisfies DatabaseInstanceRecord));
    }

    const fields = await this.buildFullDataRecords(referenceData);
    const { assets } = await this.getOverviewContext();

    const fieldsByAssetId = new Map<string, TableFieldRecord[]>();
    fields.forEach((field) => {
      const [assetId] = field.id.split('-');
      const current = fieldsByAssetId.get(assetId) ?? [];
      current.push({
        id: field.id,
        fieldName: field.fieldName,
        fieldComment: field.fieldComment,
        fieldTable: field.fieldTable,
        dataType: field.dataType,
        dataCategory: field.dataCategory,
        dataTypeName: field.dataTypeName,
        classificationPathNames: field.classificationPathNames,
        dataLevel: field.dataLevel,
        levelCode: field.levelCode,
        levelColor: field.levelColor,
        isSensitive: field.isSensitive,
        maskingStatus: field.maskingStatus,
        encryptionStatus: field.encryptionStatus,
        groupName: field.groupName,
        rootGroupName: field.rootGroupName,
        assetGroupPathNames: field.assetGroupPathNames,
        sampleData: field.sampleData,
        updateTime: field.updateTime,
      });
      fieldsByAssetId.set(assetId, current);
    });

    const groupedByIp = new Map<string, typeof assets>();
    assets.forEach((asset) => {
      const current = groupedByIp.get(asset.ipAddress) ?? [];
      current.push(asset);
      groupedByIp.set(asset.ipAddress, current);
    });

    return Array.from(groupedByIp.entries()).map(([ip, ipAssets]) => ({
      ip,
      status: ipAssets.some((asset) => asset.status === CommonStatus.ACTIVE) ? 'online' : 'offline',
      databases: ipAssets.map((asset) => {
        const tableName = `${this.normalizeAssetName(asset.name)}_main`;
        const fields = fieldsByAssetId.get(asset.id) ?? [];

        return {
          id: asset.id,
          assetId: asset.id,
          assetName: asset.name,
          name: this.normalizeAssetName(asset.name),
          type: asset.sourceType,
          status: asset.status === CommonStatus.ACTIVE ? 'online' : 'offline',
          tables: [
            {
              id: `${asset.id}-table-main`,
              name: tableName,
              databaseId: asset.id,
              rowCount: Math.max(1, fields.length * 100),
              size: Math.max(1024 * 1024, fields.length * 512000),
              status: asset.status === CommonStatus.ARCHIVED ? 'maintenance' : asset.status === CommonStatus.ACTIVE ? 'online' : 'offline',
              lastSyncTime: this.formatDateTime(asset.updatedAt),
              syncStatus: 'success',
              fields,
            },
          ],
        } satisfies DatabaseRecord;
      }),
    } satisfies DatabaseInstanceRecord));
  }
}
