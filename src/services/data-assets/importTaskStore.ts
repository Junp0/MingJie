// 数据资产导入任务的本地仓库。当前使用 localStorage，后续接入后端时只需要替换这些方法。
import {
  getClassificationTaskById,
  updateClassificationTaskStatus,
} from '@/services/data-classification/classificationTaskStore';

export type ImportSourceType = 'database' | 'file' | 'api' | 'message_queue';
export type ImportTaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'stopped';
export type ImportScheduleMode = 'single' | 'daily' | 'weekly' | 'monthly';

export interface DataAssetImportRecord {
  id: string;
  sourceType: ImportSourceType;
  sourceName: string;
  databaseType: string;
  sourceConfig: string;
  ipAddress: string;
  port: number;
  username: string;
  password: string;
  status: ImportTaskStatus;
  progress: number;
  assetGroupId: string;
  assetGroupName: string;
  createTime: string;
  updateTime: string;
  startTime: string;
  endTime: string;
  lastSyncTime: string;
  scheduleMode: ImportScheduleMode;
  scheduleLabel: string;
  executeAt?: string;
  description: string;
  classificationTaskEnabled: boolean;
  classificationTaskId?: string;
  creator: string;
}

export interface DataAssetImportFormValues {
  sourceName: string;
  sourceType: ImportSourceType;
  databaseType: string;
  ipAddress: string;
  port: number;
  username: string;
  password: string;
  assetGroupId: string;
  assetGroupName: string;
  scheduleMode: ImportScheduleMode;
  executeAt?: string;
  description?: string;
}

const STORAGE_KEY = 'data-asset-import-store-v1';

let memoryStore: DataAssetImportRecord[] | null = null;

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

const getScheduleLabel = (
  scheduleMode: ImportScheduleMode,
  executeAt?: string,
): string => {
  switch (scheduleMode) {
    case 'single':
      return executeAt ? `单次同步 ${executeAt}` : '单次同步';
    case 'daily':
      return executeAt ? `每日（首次：${executeAt}）` : '每日';
    case 'weekly':
      return executeAt ? `每周（首次：${executeAt}）` : '每周';
    case 'monthly':
      return executeAt ? `每月（首次：${executeAt}）` : '每月';
    default:
      return '单次同步';
  }
};

const createInitialImports = (): DataAssetImportRecord[] => [
  {
    id: 'import-1',
    sourceType: 'database',
    sourceName: 'user_management_db',
    databaseType: 'MySQL',
    sourceConfig: 'MySQL://192.168.1.100:3306',
    ipAddress: '192.168.1.100',
    port: 3306,
    username: 'root',
    password: '******',
    status: 'completed',
    progress: 100,
    assetGroupId: 'user-domain',
    assetGroupName: '用户数据域',
    createTime: '2026-03-15 10:00:00',
    updateTime: '2026-03-21 16:30:00',
    startTime: '2026-03-15 10:30:00',
    endTime: '2026-03-15 11:30:00',
    lastSyncTime: '2026-03-21 16:30:00',
    scheduleMode: 'daily',
    scheduleLabel: '每日（首次：2026-03-15 10:30:00）',
    executeAt: '2026-03-15 10:30:00',
    description: '用户基础数据导入任务',
    classificationTaskEnabled: true,
    classificationTaskId: 'task-1',
    creator: '李四',
  },
  {
    id: 'import-2',
    sourceType: 'database',
    sourceName: 'ecommerce_db',
    databaseType: 'MySQL',
    sourceConfig: 'MySQL://192.168.1.101:3306',
    ipAddress: '192.168.1.101',
    port: 3306,
    username: 'sync_user',
    password: '******',
    status: 'running',
    progress: 65,
    assetGroupId: 'trade-domain',
    assetGroupName: '交易经营域',
    createTime: '2026-03-20 14:30:00',
    updateTime: '2026-03-21 15:45:00',
    startTime: '2026-03-21 02:00:00',
    endTime: '',
    lastSyncTime: '2026-03-21 15:45:00',
    scheduleMode: 'monthly',
    scheduleLabel: '每月（首次：2026-03-21 02:00:00）',
    executeAt: '2026-03-21 02:00:00',
    description: '订单数据增量导入任务',
    classificationTaskEnabled: false,
    creator: '李四',
  },
  {
    id: 'import-3',
    sourceType: 'file',
    sourceName: 'access_logs.csv',
    databaseType: 'CSV文件',
    sourceConfig: '/data/logs/access_logs.csv',
    ipAddress: '192.168.1.102',
    port: 22,
    username: 'ops_reader',
    password: '******',
    status: 'pending',
    progress: 0,
    assetGroupId: 'infra-log',
    assetGroupName: '日志监控组',
    createTime: '2026-03-21 09:15:00',
    updateTime: '2026-03-21 09:15:00',
    startTime: '',
    endTime: '',
    lastSyncTime: '',
    scheduleMode: 'single',
    scheduleLabel: '单次同步 2026-03-26 09:00:00',
    executeAt: '2026-03-26 09:00:00',
    description: '访问日志文件导入任务',
    classificationTaskEnabled: false,
    creator: '王五',
  },
];

const readStore = (): DataAssetImportRecord[] => {
  if (typeof window === 'undefined') {
    if (!memoryStore) {
      memoryStore = createInitialImports();
    }
    return deepCopy(memoryStore);
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = createInitialImports();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return deepCopy(initial);
  }

  try {
    return deepCopy(JSON.parse(raw) as DataAssetImportRecord[]);
  } catch (error) {
    const initial = createInitialImports();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return deepCopy(initial);
  }
};

const writeStore = (imports: DataAssetImportRecord[]) => {
  if (typeof window === 'undefined') {
    memoryStore = deepCopy(imports);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(imports));
};

const mutateStore = (
  updater: (imports: DataAssetImportRecord[]) => DataAssetImportRecord[],
): DataAssetImportRecord[] => {
  const imports = readStore();
  const nextImports = updater(imports);
  writeStore(nextImports);
  return deepCopy(nextImports);
};

export const listImportTasks = (): DataAssetImportRecord[] =>
  readStore().sort((left, right) => right.createTime.localeCompare(left.createTime));

export const getImportTaskById = (taskId: string): DataAssetImportRecord | null => {
  const task = readStore().find((item) => item.id === taskId);
  return task ? deepCopy(task) : null;
};

export const createImportTask = (
  values: DataAssetImportFormValues,
  options?: { classificationTaskId?: string; creator?: string },
): DataAssetImportRecord => {
  const now = getNowText();
  const record: DataAssetImportRecord = {
    id: createId('import'),
    sourceType: values.sourceType,
    sourceName: values.sourceName.trim(),
    databaseType: values.databaseType.trim(),
    sourceConfig: `${values.databaseType}://${values.ipAddress}:${values.port}`,
    ipAddress: values.ipAddress.trim(),
    port: values.port,
    username: values.username.trim(),
    password: values.password,
    status: 'pending',
    progress: 0,
    assetGroupId: values.assetGroupId,
    assetGroupName: values.assetGroupName,
    createTime: now,
    updateTime: now,
    startTime: '',
    endTime: '',
    lastSyncTime: '',
    scheduleMode: values.scheduleMode,
    scheduleLabel: getScheduleLabel(values.scheduleMode, values.executeAt),
    executeAt: values.executeAt,
    description: values.description?.trim() ?? '',
    classificationTaskEnabled: Boolean(options?.classificationTaskId),
    classificationTaskId: options?.classificationTaskId,
    creator: options?.creator ?? '当前用户',
  };

  mutateStore((imports) => [record, ...imports]);
  return deepCopy(record);
};

export const updateImportTaskStatus = (
  taskId: string,
  status: ImportTaskStatus,
): DataAssetImportRecord | null => {
  let updatedTask: DataAssetImportRecord | null = null;
  let linkedClassificationTaskId: string | undefined;

  mutateStore((imports) =>
    imports.map((task) => {
      if (task.id !== taskId) {
        return task;
      }

      updatedTask = {
        ...task,
        status,
        progress:
          status === 'running'
            ? Math.max(task.progress, 5)
            : status === 'completed'
              ? 100
              : task.progress,
        startTime: status === 'running' && !task.startTime ? getNowText() : task.startTime,
        endTime: status === 'completed' ? getNowText() : status === 'failed' ? getNowText() : task.endTime,
        lastSyncTime: status === 'completed' ? getNowText() : task.lastSyncTime,
        updateTime: getNowText(),
      };
      linkedClassificationTaskId = updatedTask.classificationTaskId;

      return updatedTask;
    }),
  );

  if (status === 'completed' && linkedClassificationTaskId) {
    const linkedTask = getClassificationTaskById(linkedClassificationTaskId);
    if (linkedTask && ['pending', 'stopped'].includes(linkedTask.status)) {
      updateClassificationTaskStatus(linkedTask.id, 'running');
    }
  }

  return updatedTask ? deepCopy(updatedTask) : null;
};

export const linkClassificationTaskToImport = (
  importTaskId: string,
  classificationTaskId: string,
): DataAssetImportRecord | null => {
  let updatedTask: DataAssetImportRecord | null = null;

  mutateStore((imports) =>
    imports.map((task) => {
      if (task.id !== importTaskId) {
        return task;
      }

      updatedTask = {
        ...task,
        classificationTaskEnabled: true,
        classificationTaskId,
        updateTime: getNowText(),
      };

      return updatedTask;
    }),
  );

  return updatedTask ? deepCopy(updatedTask) : null;
};
