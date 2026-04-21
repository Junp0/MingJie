import { useEffect, useState } from 'react';
import {
  listAuditLogs,
  type AuditLogRecord,
} from '@/services/audit/auditLogStore';
import {
  listAutoScanResults,
  listAutoScanRules,
  type AutoScanResult,
  type AutoScanRule,
} from '@/services/data-assets/autoScanStore';
import {
  listAssetGroups,
  type AssetGroup,
} from '@/services/data-assets/assetGroupStore';
import {
  listDataAssets,
  type DataAssetRecord,
} from '@/services/data-assets/dataAssetStore';
import {
  listImportTasks,
  type DataAssetImportRecord,
} from '@/services/data-assets/importTaskStore';
import {
  listClassificationTasks,
  type ClassificationTaskRecord,
} from '@/services/data-classification/classificationTaskStore';
import {
  getClassificationTemplateById,
  listClassificationTemplates,
  type ClassificationTemplateRecord,
  type ClassificationTemplateSummary,
} from '@/services/data-classification/templateStore';
import {
  listProtectionFeatures,
  type ProtectionFeatureRecord,
} from '@/services/data-classification/protectionFeatureStore';
import {
  listFullDataItems,
  listMissedDataItems,
  listDatabaseInstances,
  type DatabaseInstance,
  type FullDataItem,
  type MissedDataItem,
} from '@/services/data-overview/overviewStore';
import { listRoles, type RoleRecord } from '@/services/system/roleStore';
import { listUsers, type UserRecord } from '@/services/system/userStore';

export interface DashboardData {
  importTasks: DataAssetImportRecord[];
  assetGroups: AssetGroup[];
  dataAssets: DataAssetRecord[];
  classificationTasks: ClassificationTaskRecord[];
  templateSummaries: ClassificationTemplateSummary[];
  templates: ClassificationTemplateRecord[];
  maskingFeatures: ProtectionFeatureRecord[];
  encryptionFeatures: ProtectionFeatureRecord[];
  autoScanRules: AutoScanRule[];
  autoScanResults: AutoScanResult[];
  fullDataItems: FullDataItem[];
  missedDataItems: MissedDataItem[];
  databaseInstances: DatabaseInstance[];
  auditLogs: AuditLogRecord[];
  auditTotal: number;
  users: UserRecord[];
  userTotal: number;
  roles: RoleRecord[];
  lastUpdatedAt: string;
}

interface DashboardHookState extends DashboardData {
  loading: boolean;
  refresh: () => void;
}

const EMPTY_DASHBOARD_DATA: DashboardData = {
  importTasks: [],
  assetGroups: [],
  dataAssets: [],
  classificationTasks: [],
  templateSummaries: [],
  templates: [],
  maskingFeatures: [],
  encryptionFeatures: [],
  autoScanRules: [],
  autoScanResults: [],
  fullDataItems: [],
  missedDataItems: [],
  databaseInstances: [],
  auditLogs: [],
  auditTotal: 0,
  users: [],
  userTotal: 0,
  roles: [],
  lastUpdatedAt: '',
};

const safeLoad = async <T,>(loader: Promise<T>, fallback: T): Promise<T> => {
  try {
    return await loader;
  } catch (error) {
    console.error('Failed to load dashboard fragment', error);
    return fallback;
  }
};

const loadDashboardData = async (): Promise<DashboardData> => {
  const [
    importTasks,
    assetGroups,
    dataAssets,
    classificationTasks,
    templateSummaries,
    maskingFeatures,
    encryptionFeatures,
    autoScanRules,
    autoScanResults,
    fullDataItems,
    missedDataItems,
    databaseInstances,
    auditResponse,
    userResponse,
    roles,
  ] = await Promise.all([
    safeLoad(listImportTasks(), [] as DataAssetImportRecord[]),
    safeLoad(listAssetGroups(), [] as AssetGroup[]),
    safeLoad(listDataAssets(), [] as DataAssetRecord[]),
    safeLoad(listClassificationTasks(), [] as ClassificationTaskRecord[]),
    safeLoad(
      listClassificationTemplates(),
      [] as ClassificationTemplateSummary[],
    ),
    safeLoad(
      listProtectionFeatures('masking'),
      [] as ProtectionFeatureRecord[],
    ),
    safeLoad(
      listProtectionFeatures('encryption'),
      [] as ProtectionFeatureRecord[],
    ),
    safeLoad(listAutoScanRules(), [] as AutoScanRule[]),
    safeLoad(listAutoScanResults(), [] as AutoScanResult[]),
    safeLoad(listFullDataItems(), [] as FullDataItem[]),
    safeLoad(listMissedDataItems(), [] as MissedDataItem[]),
    safeLoad(listDatabaseInstances(), [] as DatabaseInstance[]),
    safeLoad(
      listAuditLogs({ current: 1, pageSize: 8 }),
      { items: [] as AuditLogRecord[], total: 0, current: 1, pageSize: 8 },
    ),
    safeLoad(
      listUsers({ current: 1, pageSize: 50 }),
      { items: [] as UserRecord[], total: 0, current: 1, pageSize: 50 },
    ),
    safeLoad(listRoles(), [] as RoleRecord[]),
  ]);

  const templates = (
    await Promise.all(
      templateSummaries.map((template) =>
        safeLoad(
          getClassificationTemplateById(template.id),
          null as ClassificationTemplateRecord | null,
        ),
      ),
    )
  ).filter(
    (template): template is ClassificationTemplateRecord => Boolean(template),
  );

  return {
    importTasks,
    assetGroups,
    dataAssets,
    classificationTasks,
    templateSummaries,
    templates,
    maskingFeatures,
    encryptionFeatures,
    autoScanRules,
    autoScanResults,
    fullDataItems,
    missedDataItems,
    databaseInstances,
    auditLogs: auditResponse.items,
    auditTotal: auditResponse.total,
    users: userResponse.items,
    userTotal: userResponse.total,
    roles,
    lastUpdatedAt: new Date().toLocaleString('zh-CN', {
      hour12: false,
    }),
  };
};

export const useDashboardData = (): DashboardHookState => {
  const [data, setData] = useState<DashboardData>(EMPTY_DASHBOARD_DATA);
  const [loading, setLoading] = useState(true);
  const [reloadSeed, setReloadSeed] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchDashboardData = async () => {
      setLoading(true);
      const nextData = await loadDashboardData();
      if (!cancelled) {
        setData(nextData);
        setLoading(false);
      }
    };

    void fetchDashboardData();

    return () => {
      cancelled = true;
    };
  }, [reloadSeed]);

  return {
    ...data,
    loading,
    refresh: () => setReloadSeed((value) => value + 1),
  };
};
