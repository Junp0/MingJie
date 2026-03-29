import { useEffect, useState } from 'react';
import {
  listImportTasks,
  type DataAssetImportRecord,
} from '@/services/data-assets/importTaskStore';
import {
  listAssetGroups,
  type AssetGroup,
} from '@/services/data-assets/assetGroupStore';
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

export interface DashboardData {
  importTasks: DataAssetImportRecord[];
  assetGroups: AssetGroup[];
  classificationTasks: ClassificationTaskRecord[];
  templateSummaries: ClassificationTemplateSummary[];
  templates: ClassificationTemplateRecord[];
  maskingFeatures: ProtectionFeatureRecord[];
  encryptionFeatures: ProtectionFeatureRecord[];
}

const EMPTY_DASHBOARD_DATA: DashboardData = {
  importTasks: [],
  assetGroups: [],
  classificationTasks: [],
  templateSummaries: [],
  templates: [],
  maskingFeatures: [],
  encryptionFeatures: [],
};

const loadDashboardData = async (): Promise<DashboardData> => {
  const [
    importTasks,
    assetGroups,
    classificationTasks,
    templateSummaries,
    maskingFeatures,
    encryptionFeatures,
  ] = await Promise.all([
    listImportTasks(),
    listAssetGroups(),
    listClassificationTasks(),
    listClassificationTemplates(),
    listProtectionFeatures('masking'),
    listProtectionFeatures('encryption'),
  ]);

  const templates = (
    await Promise.all(
      templateSummaries.map((template) => getClassificationTemplateById(template.id)),
    )
  ).filter(
    (template): template is ClassificationTemplateRecord => Boolean(template),
  );

  return {
    importTasks,
    assetGroups,
    classificationTasks,
    templateSummaries,
    templates,
    maskingFeatures,
    encryptionFeatures,
  };
};

export const useDashboardData = (): DashboardData => {
  const [data, setData] = useState<DashboardData>(EMPTY_DASHBOARD_DATA);

  useEffect(() => {
    let cancelled = false;

    const fetchDashboardData = async () => {
      try {
        const nextData = await loadDashboardData();
        if (!cancelled) {
          setData(nextData);
        }
      } catch (error) {
        console.error('Failed to load dashboard data', error);
        if (!cancelled) {
          setData(EMPTY_DASHBOARD_DATA);
        }
      }
    };

    void fetchDashboardData();

    return () => {
      cancelled = true;
    };
  }, []);

  return data;
};
