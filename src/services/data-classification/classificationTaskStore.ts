// 分类分级任务的本地仓库。当前使用 localStorage，后续接后端时只需要替换这些方法。

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

const STORAGE_KEY = 'classification-task-store-v1';

let memoryStore: ClassificationTaskRecord[] | null = null;

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

const createInitialTasks = (): ClassificationTaskRecord[] => [
  {
    id: 'task-1',
    taskName: '用户数据分类分级任务',
    dataSource: 'user_management_db',
    dataType: 'database',
    classificationType: 'automatic',
    status: 'running',
    progress: 65,
    totalRecords: 10000,
    processedRecords: 6500,
    classifiedRecords: 6200,
    accuracy: 95.4,
    creator: '张三',
    createTime: '2026-03-15 10:00:00',
    priority: 'high',
    description: '对用户基础数据进行自动分类分级',
    taskSource: 'classification-center',
    sourceLabel: '任务中心',
    templateId: '1',
    templateName: '标准分类分级模板',
  },
  {
    id: 'task-2',
    taskName: '订单数据分类分级任务',
    dataSource: 'order_system_db',
    dataType: 'database',
    classificationType: 'hybrid',
    status: 'completed',
    progress: 100,
    totalRecords: 5000,
    processedRecords: 5000,
    classifiedRecords: 4800,
    accuracy: 96,
    creator: '李四',
    createTime: '2026-03-14 14:00:00',
    priority: 'medium',
    description: '对订单数据进行混合分类分级',
    taskSource: 'classification-center',
    sourceLabel: '任务中心',
    templateId: '2',
    templateName: '金融行业扩展模板',
  },
];

const readStore = (): ClassificationTaskRecord[] => {
  if (typeof window === 'undefined') {
    if (!memoryStore) {
      memoryStore = createInitialTasks();
    }
    return deepCopy(memoryStore);
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = createInitialTasks();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return deepCopy(initial);
  }

  try {
    return deepCopy(JSON.parse(raw) as ClassificationTaskRecord[]);
  } catch (error) {
    const initial = createInitialTasks();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return deepCopy(initial);
  }
};

const writeStore = (tasks: ClassificationTaskRecord[]) => {
  if (typeof window === 'undefined') {
    memoryStore = deepCopy(tasks);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
};

const mutateStore = (
  updater: (tasks: ClassificationTaskRecord[]) => ClassificationTaskRecord[],
): ClassificationTaskRecord[] => {
  const tasks = readStore();
  const nextTasks = updater(tasks);
  writeStore(nextTasks);
  return deepCopy(nextTasks);
};

export const listClassificationTasks = (): ClassificationTaskRecord[] =>
  readStore().sort((left, right) => right.createTime.localeCompare(left.createTime));

export const getClassificationTaskById = (taskId: string): ClassificationTaskRecord | null => {
  const task = readStore().find((item) => item.id === taskId);
  return task ? deepCopy(task) : null;
};

export const createClassificationTask = (
  values: ClassificationTaskFormValues,
  options?: {
    creator?: string;
    taskSource?: ClassificationTaskSource;
    sourceLabel?: string;
    importTaskId?: string;
  },
): ClassificationTaskRecord => {
  const task: ClassificationTaskRecord = {
    id: createId('task'),
    taskName: values.taskName.trim(),
    dataSource: values.dataSource.trim(),
    dataType: values.dataType,
    classificationType: values.classificationType,
    status: 'pending',
    progress: 0,
    totalRecords: 0,
    processedRecords: 0,
    classifiedRecords: 0,
    accuracy: 0,
    creator: options?.creator ?? '当前用户',
    createTime: getNowText(),
    priority: values.priority,
    description: values.description.trim(),
    taskSource: options?.taskSource ?? 'classification-center',
    sourceLabel: options?.sourceLabel ?? '任务中心',
    templateId: values.templateId,
    templateName: values.templateName,
    importTaskId: options?.importTaskId,
  };

  mutateStore((tasks) => [task, ...tasks]);
  return deepCopy(task);
};

export const updateClassificationTaskStatus = (
  taskId: string,
  status: ClassificationTaskStatus,
): ClassificationTaskRecord | null => {
  let updatedTask: ClassificationTaskRecord | null = null;

  mutateStore((tasks) =>
    tasks.map((task) => {
      if (task.id !== taskId) {
        return task;
      }

      updatedTask = {
        ...task,
        status,
        progress:
          status === 'running'
            ? Math.max(task.progress, 10)
            : status === 'completed'
              ? 100
              : task.progress,
        totalRecords: task.totalRecords || 10000,
        processedRecords:
          status === 'completed'
            ? task.totalRecords || 10000
            : status === 'running'
              ? Math.max(task.processedRecords, 1000)
              : task.processedRecords,
        classifiedRecords:
          status === 'completed'
            ? Math.max(task.classifiedRecords, Math.round((task.totalRecords || 10000) * 0.94))
            : status === 'running'
              ? Math.max(task.classifiedRecords, 800)
              : task.classifiedRecords,
        accuracy:
          status === 'completed'
            ? Math.max(task.accuracy, 94.5)
            : status === 'running'
              ? Math.max(task.accuracy, 90)
              : task.accuracy,
      };

      return updatedTask;
    }),
  );

  return updatedTask ? deepCopy(updatedTask) : null;
};
