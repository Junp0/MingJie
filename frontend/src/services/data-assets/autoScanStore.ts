import { request } from '@/services/request';
import { formatBeijingDateTime, parseBeijingDateTime } from '@/utils/datetime';

export type AutoScanRuleStatus = 'enabled' | 'disabled';
export type AutoScanResultStatus = 'pending' | 'ignored' | 'claimed';
export type AutoScanScheduleMode = 'daily' | 'weekly' | 'monthly';

export interface AutoScanRule {
  id: string;
  ipRange: string;
  portRange: string;
  scheduleMode: AutoScanScheduleMode;
  firstScanTime: string;
  scheduleLabel: string;
  status: AutoScanRuleStatus;
  lastScanTime: string;
  hitCount: number;
}

export interface AutoScanRuleFormValues {
  ipRange: string;
  portRange: string;
  scheduleMode: AutoScanScheduleMode;
  firstScanTime: string;
  scheduleLabel: string;
  status: AutoScanRuleStatus;
}

export interface AutoScanResult {
  id: string;
  ipAddress: string;
  port: number;
  databaseType: string;
  matchedRuleId: string;
  discoveredAt: string;
  lastSeenAt: string;
  status: AutoScanResultStatus;
  ignoreReason?: string;
  ignoredAt?: string;
  claimedAssetId?: string;
  claimedAssetName?: string;
  claimedAt?: string;
}

type BackendRule = {
  id: string;
  name: string;
  cronExpression?: string | null;
  sourceType?: string | null;
  status: 'DRAFT' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  updatedAt: string;
  results?: Array<{ id: string }>;
};

type BackendResult = {
  id: string;
  sourceName: string;
  sourceType: string;
  ipAddress: string;
  port: number;
  status: 'DRAFT' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  claimed: boolean;
  ignoreReason?: string | null;
  ignoredAt?: string | null;
  createdAt: string;
  updatedAt: string;
  scanRule?: { id: string; name: string } | null;
  dataAsset?: { id: string; name: string } | null;
};

const getScheduleLabel = (scheduleMode: AutoScanScheduleMode, firstScanTime: string) => {
  const date = parseBeijingDateTime(firstScanTime);
  const hour = String(date?.hour() ?? 0).padStart(2, '0');
  const minute = String(date?.minute() ?? 0).padStart(2, '0');
  const day = date?.date() ?? 1;
  const weekday = ['日', '一', '二', '三', '四', '五', '六'][date?.day() ?? 0];
  switch (scheduleMode) {
    case 'daily':
      return `每天 ${hour}:${minute}`;
    case 'weekly':
      return `每周${weekday} ${hour}:${minute}`;
    case 'monthly':
      return `每月 ${day}日 ${hour}:${minute}`;
  }
};

const statusMap = (status: BackendRule['status']): AutoScanRuleStatus => (status === 'RUNNING' ? 'enabled' : 'disabled');
const resultStatusMap = (item: BackendResult): AutoScanResultStatus => {
  if (item.claimed) return 'claimed';
  if (item.ignoredAt || item.ignoreReason) return 'ignored';
  return 'pending';
};

const parseScheduleMode = (cronExpression?: string | null): AutoScanScheduleMode => {
  if (!cronExpression) return 'daily';
  if (cronExpression.includes('* * *')) return 'daily';
  if (cronExpression.split(' ').length >= 5) return 'weekly';
  return 'monthly';
};

const mapRule = (item: BackendRule): AutoScanRule => {
  const firstScanTime = formatBeijingDateTime(item.createdAt);
  const scheduleMode = parseScheduleMode(item.cronExpression);
  return {
    id: item.id,
    ipRange: item.name,
    portRange: item.sourceType ?? '3306',
    scheduleMode,
    firstScanTime,
    scheduleLabel: getScheduleLabel(scheduleMode, firstScanTime || '2026-03-27 02:00:00'),
    status: statusMap(item.status),
    lastScanTime: formatBeijingDateTime(item.updatedAt),
    hitCount: item.results?.length ?? 0,
  };
};

const mapResult = (item: BackendResult): AutoScanResult => ({
  id: item.id,
  ipAddress: item.ipAddress,
  port: item.port,
  databaseType: item.sourceType,
  matchedRuleId: item.scanRule?.id ?? '',
  discoveredAt: formatBeijingDateTime(item.createdAt),
  lastSeenAt: formatBeijingDateTime(item.updatedAt),
  status: resultStatusMap(item),
  ignoreReason: item.ignoreReason ?? undefined,
  ignoredAt: formatBeijingDateTime(item.ignoredAt ?? undefined) || undefined,
  claimedAssetId: item.dataAsset?.id,
  claimedAssetName: item.dataAsset?.name,
  claimedAt: item.claimed ? formatBeijingDateTime(item.updatedAt) : undefined,
});

export const listAutoScanRules = async (): Promise<AutoScanRule[]> => {
  const data = await request<BackendRule[]>('/api/auto-scan/rules');
  return data.map(mapRule).sort((left, right) => right.firstScanTime.localeCompare(left.firstScanTime));
};

export const listAutoScanResults = async (): Promise<AutoScanResult[]> => {
  const data = await request<BackendResult[]>('/api/auto-scan/results');
  return data.map(mapResult).sort((left, right) => right.discoveredAt.localeCompare(left.discoveredAt));
};

export const createAutoScanRule = async (values: AutoScanRuleFormValues): Promise<AutoScanRule> => {
  const data = await request<BackendRule>('/api/auto-scan/rules', {
    method: 'POST',
    data: {
      name: values.ipRange.trim(),
      sourceType: values.portRange.trim(),
      cronExpression: values.firstScanTime,
      status: values.status === 'enabled' ? 'RUNNING' : 'DRAFT',
      description: values.scheduleLabel,
    },
  });
  return mapRule(data);
};

export const updateAutoScanRule = async (ruleId: string, values: AutoScanRuleFormValues): Promise<AutoScanRule | null> => {
  const data = await request<BackendRule>(`/api/auto-scan/rules/${ruleId}`, {
    method: 'PATCH',
    data: {
      name: values.ipRange.trim(),
      sourceType: values.portRange.trim(),
      cronExpression: values.firstScanTime,
      status: values.status === 'enabled' ? 'RUNNING' : 'DRAFT',
      description: values.scheduleLabel,
    },
  });
  return mapRule(data);
};

export const buildAutoScanRuleFormValues = (values: Omit<AutoScanRuleFormValues, 'scheduleLabel'>): AutoScanRuleFormValues => ({
  ...values,
  scheduleLabel: getScheduleLabel(values.scheduleMode, values.firstScanTime),
});

export const toggleAutoScanRuleStatus = async (ruleId: string, status: AutoScanRuleStatus): Promise<AutoScanRule | null> => {
  const rules = await listAutoScanRules();
  const current = rules.find((item) => item.id === ruleId);
  if (!current) return null;
  return updateAutoScanRule(ruleId, { ...current, status });
};

export const executeAutoScan = async (): Promise<{ touchedRuleCount: number; createdResultCount: number; matchedResultCount: number }> => {
  return request<{ touchedRuleCount: number; createdResultCount: number; matchedResultCount: number }>(
    '/api/auto-scan/execute',
    {
      method: 'POST',
    },
  );
};

export const getAutoScanResultById = async (resultId: string): Promise<AutoScanResult | null> => {
  const results = await listAutoScanResults();
  return results.find((item) => item.id === resultId) ?? null;
};

export const ignoreAutoScanResult = async (resultId: string, reason: string): Promise<AutoScanResult | null> => {
  const data = await request<BackendResult>(`/api/auto-scan/results/${resultId}/ignore`, {
    method: 'PATCH',
    data: {
      reason: reason.trim(),
    },
  });
  return mapResult(data);
};

export const cancelIgnoreAutoScanResult = async (resultId: string): Promise<AutoScanResult | null> => {
  const data = await request<BackendResult>(`/api/auto-scan/results/${resultId}/unignore`, {
    method: 'POST',
  });
  return mapResult(data);
};

export const claimAutoScanResult = async (resultId: string, _values: { assetId: string; assetName: string }): Promise<AutoScanResult | null> => {
  const data = await request<BackendResult>(`/api/auto-scan/results/${resultId}/claim`, {
    method: 'POST',
  });
  return mapResult(data);
};
