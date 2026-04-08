import { listDataAssets } from "@/services/data-assets/dataAssetStore";
import { request } from "@/services/request";
import { formatBeijingDateTime } from "@/utils/datetime";

export type ClassificationTaskDataType = "database" | "file" | "api";
export type ClassificationType = "automatic" | "manual" | "hybrid";
export type ClassificationTaskScheduleMode = "single";
export type ClassificationTaskStatus =
  | "waiting_import"
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "stopped";
export type ClassificationTaskPriority = "high" | "medium" | "low";
export type ClassificationTaskSource = "classification-center" | "asset-import";

export interface ClassificationTaskRecord {
  id: string;
  taskName: string;
  dataSource: string;
  dataType: ClassificationTaskDataType;
  scheduleMode: ClassificationTaskScheduleMode;
  dataAssetIds: string[];
  dataAssetNames: string[];
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
  executeAt?: string;
}

export interface ClassificationTaskFormValues {
  taskName: string;
  dataType: ClassificationTaskDataType;
  scheduleMode?: ClassificationTaskScheduleMode;
  dataAssetIds: string[];
  templateId?: string;
  templateName?: string;
  executeAt?: string;
  dataSource?: string;
  classificationType?: ClassificationType;
  priority?: ClassificationTaskPriority;
  description?: string;
}

type BackendClassificationTask = {
  id: string;
  taskName: string;
  dataSource: string;
  dataAssetIds?: unknown;
  dataType: string;
  scheduleMode?: string | null;
  classificationType: string;
  priority: string;
  description?: string | null;
  source: "CLASSIFICATION_CENTER" | "ASSET_IMPORT";
  sourceLabel?: string | null;
  status: "WAITING_IMPORT" | "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  templateId?: string | null;
  creatorId?: string | null;
  executeAt?: string | null;
  createdAt: string;
  template?: { id: string; templateName: string } | null;
  creator?: { id: string; name: string } | null;
};

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
};

const normalizeScheduleMode = (
  value?: string | null
): ClassificationTaskScheduleMode => {
  if (value === "daily" || value === "weekly" || value === "monthly") {
    return value;
  }
  return "single";
};

const statusMap: Record<
  BackendClassificationTask["status"],
  ClassificationTaskStatus
> = {
  WAITING_IMPORT: "waiting_import",
  PENDING: "pending",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
};

const reverseStatusMap: Record<
  Exclude<ClassificationTaskStatus, "stopped">,
  BackendClassificationTask["status"]
> = {
  waiting_import: "WAITING_IMPORT",
  pending: "PENDING",
  running: "RUNNING",
  completed: "COMPLETED",
  failed: "FAILED",
};

const sourceMap: Record<
  BackendClassificationTask["source"],
  ClassificationTaskSource
> = {
  CLASSIFICATION_CENTER: "classification-center",
  ASSET_IMPORT: "asset-import",
};

const buildProgress = (item: BackendClassificationTask) => {
  if (item.status === "COMPLETED") return 100;
  if (item.status === "RUNNING") return 60;
  return 0;
};

const mapTask = (
  item: BackendClassificationTask,
  assetNameMap: Map<string, string>
): ClassificationTaskRecord => {
  const dataAssetIds = normalizeStringArray(item.dataAssetIds);
  const mappedAssetNames = dataAssetIds
    .map((assetId) => assetNameMap.get(assetId))
    .filter((assetName): assetName is string => Boolean(assetName));
  const fallbackAssetNames = item.dataSource
    ? item.dataSource
        .split("、")
        .map((assetName) => assetName.trim())
        .filter(Boolean)
    : [];
  const dataAssetNames = mappedAssetNames.length
    ? mappedAssetNames
    : fallbackAssetNames;
  const progress = buildProgress(item);

  return {
    id: item.id,
    taskName: item.taskName,
    dataSource:
      dataAssetNames.join("、") || item.dataSource || "未关联数据资产",
    dataType: (item.dataType || "database") as ClassificationTaskDataType,
    scheduleMode: normalizeScheduleMode(item.scheduleMode),
    dataAssetIds,
    dataAssetNames,
    classificationType: (item.classificationType ||
      "automatic") as ClassificationType,
    status: statusMap[item.status],
    progress,
    totalRecords:
      item.status === "PENDING" || item.status === "WAITING_IMPORT"
        ? 0
        : 10000,
    processedRecords:
      item.status === "COMPLETED"
        ? 10000
        : item.status === "RUNNING"
        ? 6000
        : 0,
    classifiedRecords:
      item.status === "COMPLETED" ? 9400 : item.status === "RUNNING" ? 5600 : 0,
    accuracy:
      item.status === "PENDING" || item.status === "WAITING_IMPORT"
        ? 0
        : item.status === "RUNNING"
        ? 92
        : 95,
    creator: item.creator?.name ?? "当前用户",
    createTime: formatBeijingDateTime(item.createdAt),
    priority: (item.priority || "medium") as ClassificationTaskPriority,
    description: item.description ?? "",
    taskSource: sourceMap[item.source],
    sourceLabel: item.sourceLabel ?? "任务中心",
    templateId: item.templateId ?? undefined,
    templateName: item.template?.templateName ?? undefined,
    executeAt: formatBeijingDateTime(item.executeAt ?? undefined) || undefined,
  };
};

const buildAssetNameMap = async () => {
  const assets = await listDataAssets().catch(() => []);
  return new Map(assets.map((item) => [item.id, item.name]));
};

export const listClassificationTasks = async (): Promise<
  ClassificationTaskRecord[]
> => {
  const [data, assetNameMap] = await Promise.all([
    request<BackendClassificationTask[]>("/api/classification-tasks"),
    buildAssetNameMap(),
  ]);

  return data
    .map((item) => mapTask(item, assetNameMap))
    .sort((left, right) => right.createTime.localeCompare(left.createTime));
};

export const getClassificationTaskById = async (
  taskId: string
): Promise<ClassificationTaskRecord | null> => {
  const tasks = await listClassificationTasks();
  return tasks.find((item) => item.id === taskId) ?? null;
};

export const createClassificationTask = async (
  values: ClassificationTaskFormValues,
  options?: {
    creator?: string;
    taskSource?: ClassificationTaskSource;
    sourceLabel?: string;
  }
): Promise<ClassificationTaskRecord> => {
  const [data, assetNameMap] = await Promise.all([
    request<BackendClassificationTask>("/api/classification-tasks", {
      method: "POST",
      data: {
        taskName: values.taskName.trim(),
        dataSource: values.dataSource?.trim() ?? "",
        dataAssetIds: values.dataAssetIds,
        dataType: values.dataType,
        scheduleMode: values.scheduleMode ?? "single",
        classificationType: values.classificationType ?? "automatic",
        priority: values.priority ?? "medium",
        description: values.description?.trim() ?? "",
        templateId: values.templateId ?? null,
        source:
          options?.taskSource === "asset-import"
            ? "ASSET_IMPORT"
            : "CLASSIFICATION_CENTER",
        sourceLabel: options?.sourceLabel ?? "任务中心",
        executeAt: values.executeAt ?? null,
      },
    }),
    buildAssetNameMap(),
  ]);

  return mapTask(data, assetNameMap);
};

export const updateClassificationTask = async (
  taskId: string,
  values: ClassificationTaskFormValues
): Promise<ClassificationTaskRecord> => {
  const [data, assetNameMap] = await Promise.all([
    request<BackendClassificationTask>(`/api/classification-tasks/${taskId}`, {
      method: "PATCH",
      data: {
        taskName: values.taskName.trim(),
        dataSource: values.dataSource?.trim() ?? "",
        dataAssetIds: values.dataAssetIds,
        dataType: values.dataType,
        scheduleMode: values.scheduleMode ?? "single",
        classificationType: values.classificationType ?? "automatic",
        priority: values.priority ?? "medium",
        description: values.description?.trim() ?? "",
        templateId: values.templateId ?? null,
        executeAt: values.executeAt ?? null,
      },
    }),
    buildAssetNameMap(),
  ]);

  return mapTask(data, assetNameMap);
};

export const updateClassificationTaskStatus = async (
  taskId: string,
  status: ClassificationTaskStatus
): Promise<ClassificationTaskRecord | null> => {
  if (status === "stopped") return getClassificationTaskById(taskId);

  const [data, assetNameMap] = await Promise.all([
    request<BackendClassificationTask>(`/api/classification-tasks/${taskId}`, {
      method: "PATCH",
      data: {
        status:
          reverseStatusMap[
            status as Exclude<ClassificationTaskStatus, "stopped">
          ],
      },
    }),
    buildAssetNameMap(),
  ]);

  return mapTask(data, assetNameMap);
};

export const deleteClassificationTask = async (
  taskId: string
): Promise<boolean> => {
  await request(`/api/classification-tasks/${taskId}`, {
    method: "DELETE",
  });
  return true;
};
