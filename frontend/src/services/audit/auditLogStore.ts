import { request } from "@/services/request";
import { formatBeijingDateTime } from "@/utils/datetime";

export type AuditLogCategory =
  | "AUTH"
  | "ASSET_GROUP"
  | "IMPORT_TASK"
  | "CLASSIFICATION_TASK"
  | "AUTO_SCAN"
  | "TEMPLATE"
  | "PROTECTION_FEATURE";

export type AuditLogResult = "SUCCESS" | "FAILED" | "RUNNING" | "INFO";

export interface AuditLogRecord {
  id: string;
  category: AuditLogCategory;
  action: string;
  result: AuditLogResult;
  actorId?: string;
  actorName?: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  detail?: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLogListParams {
  current?: number;
  pageSize?: number;
  category?: AuditLogCategory;
  result?: AuditLogResult;
  keyword?: string;
}

type BackendAuditLogRecord = Omit<AuditLogRecord, "createdAt"> & {
  createdAt: string;
};

type BackendAuditLogListResponse = {
  items: BackendAuditLogRecord[];
  total: number;
  current: number;
  pageSize: number;
};

const mapAuditLog = (item: BackendAuditLogRecord): AuditLogRecord => ({
  ...item,
  createdAt: formatBeijingDateTime(item.createdAt),
});

export const listAuditLogs = async (params: AuditLogListParams) => {
  const sanitizedParams = Object.fromEntries(
    Object.entries(params).filter(([, value]) => {
      if (value === undefined || value === null) return false;
      if (typeof value === "string" && value.trim() === "") return false;
      return true;
    })
  );

  const data = await request<BackendAuditLogListResponse>("/api/audit-logs", {
    params: sanitizedParams,
  });

  return {
    ...data,
    items: data.items.map(mapAuditLog),
  };
};
