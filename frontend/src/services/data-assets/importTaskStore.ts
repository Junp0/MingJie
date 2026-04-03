import { request } from "@/services/request";
import { formatBeijingDateTime } from "@/utils/datetime";

export type ImportSourceType = "database" | "file" | "api" | "message_queue";
export type ImportTaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "stopped";
export type ImportScheduleMode = "single" | "daily" | "weekly" | "monthly";
export type ImportSampleStrategy = "latest" | "random";
export type ImportSampleStorageMode = "replace" | "incremental";

export interface DataAssetImportRecord {
  id: string;
  sourceType: ImportSourceType;
  sourceName: string;
  databaseType: string;
  databaseName: string;
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
  dataAssetId?: string;
  importedTableCount: number;
  importedFieldCount: number;
  importedRecordCount: number;
  classificationTriggeredAt?: string;
  errorMessage?: string;
  creator: string;
}

export interface DataAssetImportFormValues {
  sourceName: string;
  sourceType: ImportSourceType;
  databaseType: string;
  databaseName: string;
  ipAddress: string;
  port: number;
  username: string;
  password: string;
  assetGroupId: string;
  assetGroupName: string;
  scheduleMode: ImportScheduleMode;
  executeAt?: string;
  sampleCount: number;
  sampleStrategy: ImportSampleStrategy;
  sampleStorageMode: ImportSampleStorageMode;
  description?: string;
}

export interface DiscoverImportDatabasesValues {
  databaseType: string;
  ipAddress: string;
  port: number;
  username: string;
  password: string;
}

type BackendImportTask = {
  id: string;
  sourceName: string;
  sourceType: string;
  ipAddress: string;
  port: number;
  databaseName?: string | null;
  sourceUsername?: string | null;
  scheduleMode?: string | null;
  executeAt?: string | null;
  classificationTriggeredAt?: string | null;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
  progress: number;
  importedTableCount?: number;
  importedFieldCount?: number;
  importedRecordCount?: number;
  errorMessage?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  assetGroupId: string;
  creatorId?: string | null;
  assetGroup?: { id: string; name: string };
  creator?: { id: string; name: string } | null;
  classificationTask?: { id: string } | null;
  dataAsset?: { id: string } | null;
};

const statusMap: Record<BackendImportTask["status"], ImportTaskStatus> = {
  PENDING: "pending",
  RUNNING: "running",
  SUCCESS: "completed",
  FAILED: "failed",
};

const reverseStatusMap: Record<
  Exclude<ImportTaskStatus, "stopped">,
  BackendImportTask["status"]
> = {
  pending: "PENDING",
  running: "RUNNING",
  completed: "SUCCESS",
  failed: "FAILED",
};

const buildScheduleLabel = (
  scheduleMode: ImportScheduleMode,
  executeAt?: string
) => {
  switch (scheduleMode) {
    case "single":
      return executeAt ? `单次同步 ${executeAt}` : "单次同步";
    case "daily":
      return executeAt ? `每日（首次：${executeAt}）` : "每日";
    case "weekly":
      return executeAt ? `每周（首次：${executeAt}）` : "每周";
    case "monthly":
      return executeAt ? `每月（首次：${executeAt}）` : "每月";
    default:
      return "单次同步";
  }
};

const normalizeScheduleMode = (value?: string | null): ImportScheduleMode => {
  if (value === "daily" || value === "weekly" || value === "monthly") {
    return value;
  }
  return "single";
};

const mapImportTask = (item: BackendImportTask): DataAssetImportRecord => {
  const scheduleMode = normalizeScheduleMode(item.scheduleMode);
  const executeAt = formatBeijingDateTime(item.executeAt ?? undefined);

  return {
    id: item.id,
    sourceType: "database",
    sourceName: item.sourceName,
    databaseType: item.sourceType?.toUpperCase?.() || "DATABASE",
    databaseName: item.databaseName ?? item.sourceName,
    sourceConfig: `${item.sourceType}://${item.ipAddress}:${item.port}`,
    ipAddress: item.ipAddress,
    port: item.port,
    username: item.sourceUsername ?? item.creator?.name ?? "app",
    password: "******",
    status: statusMap[item.status],
    progress: item.progress,
    assetGroupId: item.assetGroupId,
    assetGroupName: item.assetGroup?.name ?? "",
    createTime: formatBeijingDateTime(item.createdAt),
    updateTime: formatBeijingDateTime(item.updatedAt),
    startTime:
      item.status === "RUNNING" || item.status === "SUCCESS"
        ? formatBeijingDateTime(item.createdAt)
        : "",
    endTime:
      item.status === "SUCCESS" || item.status === "FAILED"
        ? formatBeijingDateTime(item.updatedAt)
        : "",
    lastSyncTime:
      item.status === "SUCCESS" ? formatBeijingDateTime(item.updatedAt) : "",
    scheduleMode,
    scheduleLabel: buildScheduleLabel(scheduleMode, executeAt),
    executeAt,
    description: item.description ?? "",
    classificationTaskEnabled: Boolean(item.classificationTask?.id),
    classificationTaskId: item.classificationTask?.id ?? undefined,
    dataAssetId: item.dataAsset?.id ?? undefined,
    importedTableCount: item.importedTableCount ?? 0,
    importedFieldCount: item.importedFieldCount ?? 0,
    importedRecordCount: item.importedRecordCount ?? 0,
    classificationTriggeredAt:
      formatBeijingDateTime(item.classificationTriggeredAt ?? undefined) ||
      undefined,
    errorMessage: item.errorMessage ?? undefined,
    creator: item.creator?.name ?? "当前用户",
  };
};

export const listImportTasks = async (): Promise<DataAssetImportRecord[]> => {
  const data = await request<BackendImportTask[]>("/api/import-tasks");
  return data
    .map(mapImportTask)
    .sort((left, right) => right.createTime.localeCompare(left.createTime));
};

export const getImportTaskById = async (
  taskId: string
): Promise<DataAssetImportRecord | null> => {
  const tasks = await listImportTasks();
  return tasks.find((item) => item.id === taskId) ?? null;
};

export const createImportTask = async (
  values: DataAssetImportFormValues,
  options?: {
    classificationTaskId?: string;
    creator?: string;
    runImmediately?: boolean;
    runClassificationImmediatelyAfterImport?: boolean;
  }
): Promise<DataAssetImportRecord> => {
  const data = await request<BackendImportTask>("/api/import-tasks", {
    method: "POST",
    data: {
      sourceName: values.sourceName.trim(),
      sourceType: values.databaseType.toLowerCase(),
      ipAddress: values.ipAddress.trim(),
      port: values.port,
      databaseName: values.databaseName.trim(),
      sourceUsername: values.username.trim(),
      sourcePassword: values.password,
      assetGroupId: values.assetGroupId,
      classificationTaskId: options?.classificationTaskId,
      scheduleMode: values.scheduleMode,
      executeAt: values.executeAt ?? null,
      sampleCount: values.sampleCount,
      sampleStrategy: values.sampleStrategy,
      sampleStorageMode: values.sampleStorageMode,
      description: values.description?.trim() ?? "",
      progress: 0,
      status: "PENDING",
      runImmediately: options?.runImmediately ?? true,
      runClassificationImmediatelyAfterImport:
        options?.runClassificationImmediatelyAfterImport ?? false,
    },
  });

  return mapImportTask(data);
};

export const discoverImportDatabases = async (
  values: DiscoverImportDatabasesValues
): Promise<string[]> => {
  const data = await request<{ success: boolean; databases: string[] }>(
    "/api/import-tasks/discover-databases",
    {
      method: "POST",
      data: {
        sourceType: values.databaseType.toLowerCase(),
        databaseType: values.databaseType,
        ipAddress: values.ipAddress.trim(),
        port: values.port,
        sourceUsername: values.username.trim(),
        sourcePassword: values.password,
      },
    }
  );

  return data.databases ?? [];
};

export const updateImportTaskStatus = async (
  taskId: string,
  status: ImportTaskStatus
): Promise<DataAssetImportRecord | null> => {
  if (status === "stopped") return getImportTaskById(taskId);
  const data = await request<BackendImportTask>(`/api/import-tasks/${taskId}`, {
    method: "PATCH",
    data: {
      status: reverseStatusMap[status as Exclude<ImportTaskStatus, "stopped">],
      progress: status === "completed" ? 100 : status === "running" ? 50 : 0,
    },
  });
  return mapImportTask(data);
};

export const linkClassificationTaskToImport = async (
  importTaskId: string,
  classificationTaskId: string
): Promise<DataAssetImportRecord | null> => {
  const data = await request<BackendImportTask>(
    `/api/import-tasks/${importTaskId}`,
    {
      method: "PATCH",
      data: {
        classificationTaskId,
      },
    }
  );

  return mapImportTask(data);
};

export const deleteImportTask = async (taskId: string): Promise<boolean> => {
  await request(`/api/import-tasks/${taskId}`, {
    method: "DELETE",
  });
  return true;
};
