import { request } from '@/services/request';

export type ClassificationTaskDataType = 'database' | 'file' | 'api';
export type ClassificationType = 'automatic' | 'manual' | 'hybrid';
export type ClassificationTaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'stopped';
export type ClassificationTaskPriority = 'high' | 'medium' | 'low';
export type ClassificationTaskSource = 'classification-center' | 'asset-import';

export interface ClassificationTaskRecord {
  id: string;
  taskName: string;
  dataSource: string;
  dataType: ClassificationTaskDataType;
  classificationType: ClassificationType;
  status: ClassificationTaskStatus;
  progress: number;
  totalRecords: number;
  processedRecords: number;
  classifiedRecords: number;
  accuracy: number;
  creator: string;
  createTime: string;
  priority: ClassificationTaskPriority;
  description: string;
  taskSource: ClassificationTaskSource;
  sourceLabel: string;
  templateId?: string;
  templateName?: string;
  importTaskId?: string;
}

export interface ClassificationTaskFormValues {
  taskName: string;
  dataSource: string;
  dataType: ClassificationTaskDataType;
  classificationType: ClassificationType;
  priority: ClassificationTaskPriority;
  description: string;
  templateId?: string;
  templateName?: string;
}

type BackendClassificationTask = {
  id: string;
  taskName: string;
  dataSource: string;
  dataType: string;
  classificationType: string;
  priority: string;
  description?: string | null;
  source: 'CLASSIFICATION_CENTER' | 'ASSET_IMPORT';
  sourceLabel?: string | null;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  templateId?: string | null;
  creatorId?: string | null;
  importTaskId?: string | null;
  createdAt: string;
  template?: { id: string; templateName: string } | null;
  creator?: { id: string; name: string } | null;
};

const formatDateTime = (value?: string) => (value ? value.replace('T', ' ').replace(/\.\d{3}Z$/, '').replace('Z', '') : '');

const statusMap: Record<BackendClassificationTask['status'], ClassificationTaskStatus> = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

const reverseStatusMap: Record<Exclude<ClassificationTaskStatus, 'stopped'>, BackendClassificationTask['status']> = {
  pending: 'PENDING',
  running: 'RUNNING',
  completed: 'COMPLETED',
  failed: 'FAILED',
};

const sourceMap: Record<BackendClassificationTask['source'], ClassificationTaskSource> = {
  CLASSIFICATION_CENTER: 'classification-center',
  ASSET_IMPORT: 'asset-import',
};

const mapTask = (item: BackendClassificationTask): ClassificationTaskRecord => ({
  id: item.id,
  taskName: item.taskName,
  dataSource: item.dataSource,
  dataType: (item.dataType || 'database') as ClassificationTaskDataType,
  classificationType: (item.classificationType || 'automatic') as ClassificationType,
  status: statusMap[item.status],
  progress: item.status === 'COMPLETED' ? 100 : item.status === 'RUNNING' ? 60 : 0,
  totalRecords: item.status === 'PENDING' ? 0 : 10000,
  processedRecords: item.status === 'COMPLETED' ? 10000 : item.status === 'RUNNING' ? 6000 : 0,
  classifiedRecords: item.status === 'COMPLETED' ? 9400 : item.status === 'RUNNING' ? 5600 : 0,
  accuracy: item.status === 'PENDING' ? 0 : item.status === 'RUNNING' ? 92 : 95,
  creator: item.creator?.name ?? '当前用户',
  createTime: formatDateTime(item.createdAt),
  priority: (item.priority || 'medium') as ClassificationTaskPriority,
  description: item.description ?? '',
  taskSource: sourceMap[item.source],
  sourceLabel: item.sourceLabel ?? '任务中心',
  templateId: item.templateId ?? undefined,
  templateName: item.template?.templateName ?? undefined,
  importTaskId: item.importTaskId ?? undefined,
});

export const listClassificationTasks = async (): Promise<ClassificationTaskRecord[]> => {
  const data = await request<BackendClassificationTask[]>('/api/classification-tasks');
  return data.map(mapTask).sort((left, right) => right.createTime.localeCompare(left.createTime));
};

export const getClassificationTaskById = async (taskId: string): Promise<ClassificationTaskRecord | null> => {
  const tasks = await listClassificationTasks();
  return tasks.find((item) => item.id === taskId) ?? null;
};

export const createClassificationTask = async (
  values: ClassificationTaskFormValues,
  options?: {
    creator?: string;
    taskSource?: ClassificationTaskSource;
    sourceLabel?: string;
    importTaskId?: string;
  },
): Promise<ClassificationTaskRecord> => {
  const data = await request<BackendClassificationTask>('/api/classification-tasks', {
    method: 'POST',
    data: {
      taskName: values.taskName.trim(),
      dataSource: values.dataSource.trim(),
      dataType: values.dataType,
      classificationType: values.classificationType,
      priority: values.priority,
      description: values.description.trim(),
      templateId: values.templateId,
      source: options?.taskSource === 'asset-import' ? 'ASSET_IMPORT' : 'CLASSIFICATION_CENTER',
      sourceLabel: options?.sourceLabel ?? '任务中心',
      importTaskId: options?.importTaskId,
    },
  });

  return mapTask(data);
};

export const updateClassificationTaskStatus = async (
  taskId: string,
  status: ClassificationTaskStatus,
): Promise<ClassificationTaskRecord | null> => {
  if (status === 'stopped') return getClassificationTaskById(taskId);
  const data = await request<BackendClassificationTask>(`/api/classification-tasks/${taskId}`, {
    method: 'PATCH',
    data: {
      status: reverseStatusMap[status as Exclude<ClassificationTaskStatus, 'stopped'>],
    },
  });
  return mapTask(data);
};
