// 正式数据资产的本地仓库。认领自动扫描结果后会写入这里，数据资产列表直接读取该仓库。

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

export const DATA_ASSET_SOURCE_TYPE_OPTIONS: Array<{
  label: string;
  value: DataAssetSourceType;
}> = [
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

const STORAGE_KEY = 'data-asset-store-v1';

let memoryStore: DataAssetRecord[] | null = null;

const deepCopy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const getNowText = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const INITIAL_DATA_ASSETS: DataAssetRecord[] = [
  {
    id: 'asset-1',
    name: 'user_management_db',
    assetType: 'database',
    ipAddress: '192.168.1.100',
    port: 3306,
    sourceType: 'MySQL',
    status: 'active',
    dataLevel: 'confidential',
    assetGroupId: 'user-domain',
    assetGroupName: '用户数据域',
    createTime: '2026-03-15 10:00:00',
    updateTime: '2026-03-21 16:30:00',
    lastSyncTime: '2026-03-21 16:30:00',
    syncStatus: 'success',
    tableCount: 25,
    fieldCount: 1890,
    size: 2048576,
    recordCount: 150000,
    description: '用户基础信息管理数据库',
    tags: ['用户数据', '核心业务', '高敏感'],
    owner: '张三',
    department: '数据平台部',
    sourceFrom: 'import',
  },
  {
    id: 'asset-2',
    name: 'order_management_db',
    assetType: 'database',
    ipAddress: '192.168.1.101',
    port: 3306,
    sourceType: 'MySQL',
    status: 'active',
    dataLevel: 'internal',
    assetGroupId: 'trade-domain',
    assetGroupName: '交易经营域',
    createTime: '2026-03-20 14:30:00',
    updateTime: '2026-03-21 15:45:00',
    lastSyncTime: '2026-03-21 15:45:00',
    syncStatus: 'success',
    tableCount: 15,
    fieldCount: 320,
    size: 512000,
    recordCount: 50000,
    description: '电商订单管理数据库',
    tags: ['订单数据', '业务数据', '中等敏感'],
    owner: '吴九',
    department: '交易平台部',
    sourceFrom: 'import',
  },
  {
    id: 'asset-3',
    name: 'log_analysis_db',
    assetType: 'database',
    ipAddress: '192.168.1.102',
    port: 5432,
    sourceType: 'PostgreSQL',
    status: 'active',
    dataLevel: 'public',
    assetGroupId: 'infra-log',
    assetGroupName: '日志监控组',
    createTime: '2026-03-21 09:15:00',
    updateTime: '2026-03-21 12:20:00',
    lastSyncTime: '2026-03-21 12:20:00',
    syncStatus: 'syncing',
    tableCount: 8,
    fieldCount: 156,
    size: 1024000,
    recordCount: 100000,
    description: '系统日志分析数据库',
    tags: ['日志数据', '系统数据', '低敏感'],
    owner: '卫十四',
    department: '基础架构部',
    sourceFrom: 'import',
  },
  {
    id: 'asset-4',
    name: 'weather_data_db',
    assetType: 'database',
    ipAddress: '203.208.60.1',
    port: 27017,
    sourceType: 'MongoDB',
    status: 'inactive',
    dataLevel: 'public',
    assetGroupId: 'infra-domain',
    assetGroupName: '基础设施域',
    createTime: '2026-03-18 16:45:00',
    updateTime: '2026-03-21 12:05:00',
    lastSyncTime: '2026-03-21 12:05:00',
    syncStatus: 'failed',
    tableCount: 3,
    fieldCount: 24,
    size: 0,
    recordCount: 0,
    description: '第三方天气数据数据库',
    tags: ['天气数据', '外部数据', '低敏感'],
    owner: '褚十三',
    department: '基础架构部',
    sourceFrom: 'manual',
  },
];

const readStore = (): DataAssetRecord[] => {
  if (typeof window === 'undefined') {
    if (!memoryStore) {
      memoryStore = deepCopy(INITIAL_DATA_ASSETS);
    }
    return deepCopy(memoryStore);
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATA_ASSETS));
    return deepCopy(INITIAL_DATA_ASSETS);
  }

  try {
    return deepCopy(JSON.parse(raw) as DataAssetRecord[]);
  } catch (error) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATA_ASSETS));
    return deepCopy(INITIAL_DATA_ASSETS);
  }
};

const writeStore = (assets: DataAssetRecord[]) => {
  if (typeof window === 'undefined') {
    memoryStore = deepCopy(assets);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
};

const mutateStore = (
  updater: (assets: DataAssetRecord[]) => DataAssetRecord[],
): DataAssetRecord[] => {
  const assets = readStore();
  const nextAssets = updater(assets);
  writeStore(nextAssets);
  return deepCopy(nextAssets);
};

export const listDataAssets = (): DataAssetRecord[] =>
  readStore().sort((left, right) => right.createTime.localeCompare(left.createTime));

export const getDataAssetById = (assetId: string): DataAssetRecord | null => {
  const record = readStore().find((item) => item.id === assetId);
  return record ? deepCopy(record) : null;
};

export const findDataAssetByScanResultId = (scanResultId: string): DataAssetRecord | null => {
  const record = readStore().find((item) => item.scanResultId === scanResultId);
  return record ? deepCopy(record) : null;
};

export const createDataAsset = (values: CreateDataAssetValues): DataAssetRecord => {
  const now = getNowText();
  const record: DataAssetRecord = {
    id: createId('asset'),
    name: values.name.trim(),
    assetType: values.assetType,
    ipAddress: values.ipAddress.trim(),
    port: values.port,
    sourceType: values.sourceType,
    status: 'active',
    dataLevel: values.dataLevel,
    assetGroupId: values.assetGroupId,
    assetGroupName: values.assetGroupName,
    createTime: now,
    updateTime: now,
    lastSyncTime: now,
    syncStatus: 'success',
    tableCount: values.tableCount ?? 0,
    fieldCount: values.fieldCount ?? 0,
    size: values.size ?? 0,
    recordCount: values.recordCount ?? 0,
    description: values.description?.trim() ?? '',
    tags: values.tags?.filter(Boolean) ?? [],
    owner: values.owner.trim(),
    department: values.department.trim(),
    sourceFrom: values.sourceFrom ?? 'manual',
    scanResultId: values.scanResultId,
  };

  mutateStore((assets) => [record, ...assets]);
  return deepCopy(record);
};

export const syncDataAssetGroupName = (
  groupId: string,
  groupName: string,
): DataAssetRecord[] =>
  mutateStore((assets) =>
    assets.map((asset) =>
      asset.assetGroupId === groupId
        ? {
            ...asset,
            assetGroupName: groupName,
          }
        : asset,
    ),
  );

export const updateDataAsset = (
  assetId: string,
  values: UpdateDataAssetValues,
): DataAssetRecord | null => {
  const now = getNowText();
  let updatedRecord: DataAssetRecord | null = null;

  mutateStore((assets) =>
    assets.map((asset) => {
      if (asset.id !== assetId) {
        return asset;
      }

      updatedRecord = {
        ...asset,
        name: values.name.trim(),
        ipAddress: values.ipAddress.trim(),
        port: values.port,
        sourceType: values.sourceType,
        status: values.status,
        dataLevel: values.dataLevel,
        assetGroupId: values.assetGroupId,
        assetGroupName: values.assetGroupName,
        description: values.description?.trim() ?? '',
        tags: values.tags?.filter(Boolean) ?? [],
        owner: values.owner.trim(),
        department: values.department.trim(),
        updateTime: now,
      };

      return updatedRecord;
    }),
  );

  return updatedRecord ? deepCopy(updatedRecord) : null;
};
