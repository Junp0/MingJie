import { request } from '@/services/request';

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

type BackendImportTask = {
  id: string;
  sourceName: string;
  sourceType: string;
  ipAddress: string;
  port: number;
  databaseName?: string | null;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  progress: number;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  assetGroupId: string;
  creatorId?: string | null;
  assetGroup?: { id: string; name: string };
  creator?: { id: string; name: string } | null;
  classificationTask?: { id: string } | null;
};

const formatDateTime = (value?: string) => (value ? value.replace('T', ' ').replace(/\.\d{3}Z$/, '').replace('Z', '') : '');

const statusMap: Record<BackendImportTask['status'], ImportTaskStatus> = {
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCESS: 'completed',
  FAILED: 'failed',
};

const reverseStatusMap: Record<Exclude<ImportTaskStatus, 'stopped'>, BackendImportTask['status']> = {
  pending: 'PENDING',
  running: 'RUNNING',
  completed: 'SUCCESS',
  failed: 'FAILED',
};

const buildScheduleLabel = (scheduleMode: ImportScheduleMode, executeAt?: string) => {
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

const mapImportTask = (item: BackendImportTask): DataAssetImportRecord => ({
  id: item.id,
  sourceType: 'database',
  sourceName: item.sourceName,
  databaseType: item.sourceType?.toUpperCase?.() || 'DATABASE',
  sourceConfig: `${item.sourceType}://${item.ipAddress}:${item.port}`,
  ipAddress: item.ipAddress,
  port: item.port,
  username: item.creator?.name ?? 'app',
  password: '******',
  status: statusMap[item.status],
  progress: item.progress,
  assetGroupId: item.assetGroupId,
  assetGroupName: item.assetGroup?.name ?? '',
  createTime: formatDateTime(item.createdAt),
  updateTime: formatDateTime(item.updatedAt),
  startTime: item.status === 'RUNNING' || item.status === 'SUCCESS' ? formatDateTime(item.createdAt) : '',
  endTime: item.status === 'SUCCESS' || item.status === 'FAILED' ? formatDateTime(item.updatedAt) : '',
  lastSyncTime: item.status === 'SUCCESS' ? formatDateTime(item.updatedAt) : '',
  scheduleMode: 'single',
  scheduleLabel: buildScheduleLabel('single', formatDateTime(item.createdAt)),
  executeAt: formatDateTime(item.createdAt),
  description: item.description ?? '',
  classificationTaskEnabled: Boolean(item.classificationTask?.id),
  classificationTaskId: item.classificationTask?.id ?? undefined,
  creator: item.creator?.name ?? '当前用户',
});

export const listImportTasks = async (): Promise<DataAssetImportRecord[]> => {
  const data = await request<BackendImportTask[]>('/api/import-tasks');
  return data.map(mapImportTask).sort((left, right) => right.createTime.localeCompare(left.createTime));
};

export const getImportTaskById = async (taskId: string): Promise<DataAssetImportRecord | null> => {
  const tasks = await listImportTasks();
  return tasks.find((item) => item.id === taskId) ?? null;
};

export const createImportTask = async (
  values: DataAssetImportFormValues,
  options?: { classificationTaskId?: string; creator?: string },
): Promise<DataAssetImportRecord> => {
  const data = await request<BackendImportTask>('/api/import-tasks', {
    method: 'POST',
    data: {
      sourceName: values.sourceName.trim(),
      sourceType: values.databaseType.toLowerCase(),
      ipAddress: values.ipAddress.trim(),
      port: values.port,
      databaseName: values.sourceName.trim(),
      assetGroupId: values.assetGroupId,
      description: values.description?.trim() ?? '',
      progress: 0,
      status: 'PENDING',
    },
  });
  return mapImportTask({ ...data, classificationTask: options?.classificationTaskId ? { id: options.classificationTaskId } : data.classificationTask });
};

export const updateImportTaskStatus = async (
  taskId: string,
  status: ImportTaskStatus,
): Promise<DataAssetImportRecord | null> => {
  if (status === 'stopped') return getImportTaskById(taskId);
  const data = await request<BackendImportTask>(`/api/import-tasks/${taskId}`, {
    method: 'PATCH',
    data: {
      status: reverseStatusMap[status as Exclude<ImportTaskStatus, 'stopped'>],
      progress: status === 'completed' ? 100 : status === 'running' ? 50 : 0,
    },
  });
  return mapImportTask(data);
};

export const linkClassificationTaskToImport = async (
  importTaskId: string,
  classificationTaskId: string,
): Promise<DataAssetImportRecord | null> => {
  const task = await getImportTaskById(importTaskId);
  if (!task) return null;
  return {
    ...task,
    classificationTaskEnabled: true,
    classificationTaskId,
  };
};
