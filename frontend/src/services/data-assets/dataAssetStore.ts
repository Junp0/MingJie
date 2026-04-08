import { request } from '@/services/request';
import { formatBeijingDateTime } from '@/utils/datetime';

export type DataAssetType = 'database' | 'table' | 'file' | 'api' | 'message_queue';
export type DataAssetStatus = 'active' | 'inactive' | 'archived';
export type DataAssetLevel = 'public' | 'internal' | 'confidential' | 'secret';
export type DataAssetSyncStatus = 'success' | 'failed' | 'syncing';
export type DataAssetSourceType =
  | 'MySQL'
  | 'PostgreSQL'
  | 'Oracle'
  | 'SQLServer'
  | 'MongoDB'
  | 'CSV'
  | 'JSON'
  | 'XML'
  | 'REST'
  | 'Kafka'
  | 'RabbitMQ';

export interface DataAssetRecord {
  id: string;
  name: string;
  isDeleted: boolean;
  deletedAt?: string;
  assetType: DataAssetType;
  ipAddress: string;
  port: number;
  sourceType: DataAssetSourceType;
  status: DataAssetStatus;
  dataLevel: DataAssetLevel;
  assetGroupId: string;
  assetGroupName: string;
  createTime: string;
  updateTime: string;
  lastSyncTime: string;
  syncStatus: DataAssetSyncStatus;
  tableCount: number;
  fieldCount: number;
  size: number;
  recordCount: number;
  description: string;
  tags: string[];
  owner: string;
  department: string;
  sourceFrom: 'manual' | 'import' | 'scan';
  scanResultId?: string;
}

export interface CreateDataAssetValues {
  name: string;
  assetType: DataAssetType;
  ipAddress: string;
  port: number;
  sourceType: DataAssetSourceType;
  dataLevel: DataAssetLevel;
  assetGroupId: string;
  assetGroupName: string;
  description?: string;
  tags?: string[];
  owner: string;
  department: string;
  tableCount?: number;
  fieldCount?: number;
  size?: number;
  recordCount?: number;
  sourceFrom?: DataAssetRecord['sourceFrom'];
  scanResultId?: string;
}

export interface UpdateDataAssetValues {
  name: string;
  ipAddress: string;
  port: number;
  sourceType: DataAssetSourceType;
  status: DataAssetStatus;
  dataLevel: DataAssetLevel;
  assetGroupId: string;
  assetGroupName: string;
  description?: string;
  tags?: string[];
  owner: string;
  department: string;
}

export const DATA_ASSET_SOURCE_TYPE_OPTIONS: Array<{ label: string; value: DataAssetSourceType }> = [
  { label: 'MySQL', value: 'MySQL' },
  { label: 'PostgreSQL', value: 'PostgreSQL' },
  { label: 'Oracle', value: 'Oracle' },
  { label: 'SQL Server', value: 'SQLServer' },
  { label: 'MongoDB', value: 'MongoDB' },
  { label: 'CSV', value: 'CSV' },
  { label: 'JSON', value: 'JSON' },
  { label: 'XML', value: 'XML' },
  { label: 'REST API', value: 'REST' },
  { label: 'Kafka', value: 'Kafka' },
  { label: 'RabbitMQ', value: 'RabbitMQ' },
];

type BackendAsset = {
  id: string;
  name: string;
  isDeleted?: boolean;
  deletedAt?: string | null;
  sourceType: string;
  ipAddress: string;
  port: number;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  dataLevel: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'SECRET';
  owner: string;
  department: string;
  tags?: string[];
  description?: string | null;
  tableCount?: number;
  fieldCount?: number;
  sizeBytes?: number;
  recordCount?: number;
  assetGroupId: string;
  scanResultId?: string | null;
  createdAt: string;
  updatedAt: string;
  assetGroup?: { id: string; name: string };
  importTasks?: Array<{ id: string; updatedAt: string }>;
};

const statusMap: Record<BackendAsset['status'], DataAssetStatus> = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived',
};

const reverseStatusMap: Record<DataAssetStatus, BackendAsset['status']> = {
  active: 'ACTIVE',
  inactive: 'INACTIVE',
  archived: 'ARCHIVED',
};

const levelMap: Record<BackendAsset['dataLevel'], DataAssetLevel> = {
  PUBLIC: 'public',
  INTERNAL: 'internal',
  CONFIDENTIAL: 'confidential',
  SECRET: 'secret',
};

const reverseLevelMap: Record<DataAssetLevel, BackendAsset['dataLevel']> = {
  public: 'PUBLIC',
  internal: 'INTERNAL',
  confidential: 'CONFIDENTIAL',
  secret: 'SECRET',
};

const mapAsset = (item: BackendAsset): DataAssetRecord => {
  const latestSuccessfulImportTime = item.importTasks?.[0]?.updatedAt;

  return {
    id: item.id,
    name: item.name,
    isDeleted: item.isDeleted ?? false,
    deletedAt: formatBeijingDateTime(item.deletedAt ?? undefined) || undefined,
    assetType: 'database',
    ipAddress: item.ipAddress,
    port: item.port,
    sourceType: (item.sourceType || 'MySQL') as DataAssetSourceType,
    status: statusMap[item.status],
    dataLevel: levelMap[item.dataLevel],
    assetGroupId: item.assetGroupId,
    assetGroupName: item.assetGroup?.name ?? '',
    createTime: formatBeijingDateTime(item.createdAt),
    updateTime: formatBeijingDateTime(item.updatedAt),
    lastSyncTime: latestSuccessfulImportTime
      ? formatBeijingDateTime(latestSuccessfulImportTime)
      : '',
    syncStatus: 'success',
    tableCount: item.tableCount ?? 0,
    fieldCount: item.fieldCount ?? 0,
    size: item.sizeBytes ?? 0,
    recordCount: item.recordCount ?? 0,
    description: item.description ?? '',
    tags: Array.isArray(item.tags) ? item.tags : [],
    owner: item.owner,
    department: item.department,
    sourceFrom: item.scanResultId
      ? 'scan'
      : (item.importTasks?.length ?? 0) > 0
      ? 'import'
      : 'manual',
    scanResultId: item.scanResultId ?? undefined,
  };
};

export const listDataAssets = async (): Promise<DataAssetRecord[]> => {
  const data = await request<BackendAsset[]>('/api/data-assets');
  return data.map(mapAsset).sort((left, right) => right.createTime.localeCompare(left.createTime));
};

export const getDataAssetById = async (assetId: string): Promise<DataAssetRecord | null> => {
  const assets = await listDataAssets();
  return assets.find((item) => item.id === assetId) ?? null;
};

export const findDataAssetByScanResultId = async (scanResultId: string): Promise<DataAssetRecord | null> => {
  const assets = await listDataAssets();
  return assets.find((item) => item.scanResultId === scanResultId) ?? null;
};

export const createDataAsset = async (values: CreateDataAssetValues): Promise<DataAssetRecord> => {
  const data = await request<BackendAsset>('/api/data-assets', {
    method: 'POST',
    data: {
      name: values.name.trim(),
      sourceType: values.sourceType.toLowerCase(),
      ipAddress: values.ipAddress.trim(),
      port: values.port,
      status: 'ACTIVE',
      dataLevel: reverseLevelMap[values.dataLevel],
      owner: values.owner.trim(),
      department: values.department.trim(),
      tags: values.tags ?? [],
      description: values.description?.trim() ?? '',
      tableCount: values.tableCount ?? 0,
      fieldCount: values.fieldCount ?? 0,
      sizeBytes: values.size ?? 0,
      recordCount: values.recordCount ?? 0,
      assetGroupId: values.assetGroupId,
    },
  });

  return mapAsset(data);
};

export const syncDataAssetGroupName = async (): Promise<DataAssetRecord[]> => listDataAssets();

export const updateDataAsset = async (
  assetId: string,
  values: UpdateDataAssetValues,
): Promise<DataAssetRecord | null> => {
  const data = await request<BackendAsset>(`/api/data-assets/${assetId}`, {
    method: 'PATCH',
    data: {
      name: values.name.trim(),
      sourceType: values.sourceType.toLowerCase(),
      ipAddress: values.ipAddress.trim(),
      port: values.port,
      status: reverseStatusMap[values.status],
      dataLevel: reverseLevelMap[values.dataLevel],
      owner: values.owner.trim(),
      department: values.department.trim(),
      tags: values.tags ?? [],
      description: values.description?.trim() ?? '',
      assetGroupId: values.assetGroupId,
    },
  });

  return mapAsset(data);
};

export const deleteDataAsset = async (id: string) => {
  return request<{ success: boolean }>(`/api/data-assets/${id}`, {
    method: 'DELETE',
  });
};
