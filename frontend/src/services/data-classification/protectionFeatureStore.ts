import { request } from '@/services/request';

export type ProtectionFeatureType = 'masking' | 'encryption';
export type ProtectionFeatureStatus = 'active' | 'inactive';
export type ProtectionFeatureMatcher = 'regex' | 'equals' | 'contains' | 'prefix' | 'suffix' | 'enumContains';

export interface ProtectionFeatureRecord {
  id: string;
  type: ProtectionFeatureType;
  featureName: string;
  featureCode: string;
  scene: string;
  featurePoint: string;
  matcher: ProtectionFeatureMatcher;
  expression: string;
  sampleValue: string;
  confidence: number;
  priority: number;
  status: ProtectionFeatureStatus;
  description: string;
  updatedAt: string;
}

export interface ProtectionFeatureFormValues {
  featureName: string;
  featureCode: string;
  scene: string;
  featurePoint: string;
  matcher: ProtectionFeatureMatcher;
  expression: string;
  sampleValue: string;
  confidence: number;
  priority: number;
  status: ProtectionFeatureStatus;
  description: string;
}

export const PROTECTION_FEATURE_MATCHER_OPTIONS: Array<{ value: ProtectionFeatureMatcher; label: string }> = [
  { value: 'regex', label: '正则匹配' },
  { value: 'equals', label: '等于' },
  { value: 'contains', label: '包含' },
  { value: 'prefix', label: '前缀匹配' },
  { value: 'suffix', label: '后缀匹配' },
  { value: 'enumContains', label: '枚举包含' },
];

const MATCHER_LABEL_MAP: Record<ProtectionFeatureMatcher, string> = {
  regex: '正则匹配',
  equals: '等于',
  contains: '包含',
  prefix: '前缀匹配',
  suffix: '后缀匹配',
  enumContains: '枚举包含',
};

type BackendFeature = {
  id: string;
  featureType: 'MASKING' | 'ENCRYPTION';
  featureName: string;
  featureCode?: string | null;
  scene?: string | null;
  featurePoint: string;
  matcher: string;
  expression: string;
  sampleValue: string;
  confidence: number;
  priority?: number | null;
  status: 'ACTIVE' | 'INACTIVE';
  description?: string | null;
  updatedAt: string;
};

const formatDateTime = (value?: string) => (value ? value.replace('T', ' ').replace(/\.\d{3}Z$/, '').replace('Z', '') : '');

const mapFeature = (item: BackendFeature): ProtectionFeatureRecord => ({
  id: item.id,
  type: item.featureType === 'MASKING' ? 'masking' : 'encryption',
  featureName: item.featureName,
  featureCode: item.featureCode ?? '',
  scene: item.scene ?? '',
  featurePoint: item.featurePoint,
  matcher: (item.matcher || 'regex') as ProtectionFeatureMatcher,
  expression: item.expression,
  sampleValue: item.sampleValue,
  confidence: item.confidence,
  priority: item.priority ?? 0,
  status: item.status === 'ACTIVE' ? 'active' : 'inactive',
  description: item.description ?? '',
  updatedAt: formatDateTime(item.updatedAt),
});

export const getProtectionFeatureMatcherLabel = (matcher: ProtectionFeatureMatcher): string => MATCHER_LABEL_MAP[matcher];

export const listProtectionFeatures = async (type: ProtectionFeatureType): Promise<ProtectionFeatureRecord[]> => {
  const data = await request<BackendFeature[]>('/api/protection-features', {
    params: {
      type: type === 'masking' ? 'MASKING' : 'ENCRYPTION',
    },
  });
  return data.map(mapFeature).sort((left, right) => right.priority - left.priority);
};

export const createProtectionFeature = async (
  type: ProtectionFeatureType,
  values: ProtectionFeatureFormValues,
): Promise<ProtectionFeatureRecord> => {
  const data = await request<BackendFeature>('/api/protection-features', {
    method: 'POST',
    data: {
      featureType: type === 'masking' ? 'MASKING' : 'ENCRYPTION',
      featureName: values.featureName.trim(),
      featureCode: values.featureCode.trim(),
      scene: values.scene.trim(),
      featurePoint: values.featurePoint.trim(),
      matcher: values.matcher,
      expression: values.expression.trim(),
      sampleValue: values.sampleValue.trim(),
      confidence: values.confidence,
      priority: values.priority,
      status: values.status === 'active' ? 'ACTIVE' : 'INACTIVE',
      description: values.description.trim(),
    },
  });
  return mapFeature(data);
};

export const updateProtectionFeature = async (
  featureId: string,
  values: ProtectionFeatureFormValues,
): Promise<ProtectionFeatureRecord | null> => {
  const features = await Promise.all([listProtectionFeatures('masking'), listProtectionFeatures('encryption')]);
  const current = [...features[0], ...features[1]].find((item) => item.id === featureId);
  const data = await request<BackendFeature>(`/api/protection-features/${featureId}`, {
    method: 'PATCH',
    data: {
      featureName: values.featureName.trim(),
      featureCode: values.featureCode.trim(),
      scene: values.scene.trim(),
      featurePoint: values.featurePoint.trim(),
      matcher: values.matcher,
      expression: values.expression.trim(),
      sampleValue: values.sampleValue.trim(),
      confidence: values.confidence,
      priority: values.priority,
      status: values.status === 'active' ? 'ACTIVE' : 'INACTIVE',
      description: values.description.trim(),
      featureType: current?.type === 'masking' ? 'MASKING' : 'ENCRYPTION',
    },
  });
  return mapFeature(data);
};

export const deleteProtectionFeature = async (featureId: string): Promise<boolean> => {
  await request(`/api/protection-features/${featureId}`, { method: 'DELETE' });
  return true;
};

export const updateProtectionFeatureStatus = async (
  featureId: string,
  status: ProtectionFeatureStatus,
): Promise<ProtectionFeatureRecord | null> => {
  const features = await Promise.all([listProtectionFeatures('masking'), listProtectionFeatures('encryption')]);
  const current = [...features[0], ...features[1]].find((item) => item.id === featureId);
  if (!current) return null;
  return updateProtectionFeature(featureId, {
    featureName: current.featureName,
    featureCode: current.featureCode,
    scene: current.scene,
    featurePoint: current.featurePoint,
    matcher: current.matcher,
    expression: current.expression,
    sampleValue: current.sampleValue,
    confidence: current.confidence,
    priority: current.priority,
    status,
    description: current.description,
  });
};
