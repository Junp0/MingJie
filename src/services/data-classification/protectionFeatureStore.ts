// 当前先使用本地仓库实现脱敏/加密特征管理，后续接入后端时只需要将这些方法替换为 API 调用。

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

const STORAGE_KEY = 'data-protection-feature-store-v1';

export const PROTECTION_FEATURE_MATCHER_OPTIONS: Array<{
  value: ProtectionFeatureMatcher;
  label: string;
}> = [
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

let memoryStore: ProtectionFeatureRecord[] | null = null;

const deepCopy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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

const createInitialFeatures = (): ProtectionFeatureRecord[] => [
  {
    id: 'mask-1',
    type: 'masking',
    featureName: '连续星号掩码',
    featureCode: 'MASK_CONTINUOUS_STAR',
    scene: '连续*',
    featurePoint: '敏感区间使用连续星号替换，常见于中间位脱敏',
    matcher: 'regex',
    expression: '\\*{2,}',
    sampleValue: '138****5678',
    confidence: 96,
    priority: 100,
    status: 'active',
    description: '识别值中出现连续星号段的脱敏特征，不限定字段类型。',
    updatedAt: '2026-03-20 09:20:00',
  },
  {
    id: 'mask-2',
    type: 'masking',
    featureName: '连续井号掩码',
    featureCode: 'MASK_CONTINUOUS_HASH',
    scene: '连续#',
    featurePoint: '敏感区间使用连续井号替换，可用于任意字符型字段',
    matcher: 'regex',
    expression: '#{2,}',
    sampleValue: '张###三',
    confidence: 92,
    priority: 90,
    status: 'active',
    description: '识别值中包含连续井号的脱敏形态，不再区分手机号、身份证等字段类型。',
    updatedAt: '2026-03-20 10:10:00',
  },
  {
    id: 'mask-3',
    type: 'masking',
    featureName: '前后保留中间替换',
    featureCode: 'MASK_KEEP_BOTH_ENDS',
    scene: '前后保留中间替换',
    featurePoint: '保留前后少量字符，中间主体区间统一掩码化',
    matcher: 'regex',
    expression: '^.{1,4}[\\*#xX]{2,}.+$',
    sampleValue: 'tes***@example.com',
    confidence: 88,
    priority: 80,
    status: 'active',
    description: '识别常见“前后保留、中间掩码”的脱敏结果，可复用于邮箱、姓名、地址等字段。',
    updatedAt: '2026-03-21 11:00:00',
  },
  {
    id: 'enc-1',
    type: 'encryption',
    featureName: 'Base64 编码值',
    featureCode: 'ENC_BASE64',
    scene: '通用密文字段',
    featurePoint: '字符集受限且长度为 4 的倍数，常见以 = 结尾',
    matcher: 'regex',
    expression: '^[A-Za-z0-9+/]+={0,2}$',
    sampleValue: 'U29tZUVuY3J5cHRlZFRleHQ=',
    confidence: 82,
    priority: 70,
    status: 'active',
    description: '识别经过 Base64 编码或封装后的字段值。',
    updatedAt: '2026-03-20 14:10:00',
  },
  {
    id: 'enc-2',
    type: 'encryption',
    featureName: 'Hex 密文块',
    featureCode: 'ENC_HEX_BLOCK',
    scene: '对称加密',
    featurePoint: '值仅由十六进制字符组成，长度较长且偶数',
    matcher: 'regex',
    expression: '^[A-Fa-f0-9]{32,}$',
    sampleValue: '8F2A4D7C8A5B2F1193DDA908C4AE7721',
    confidence: 90,
    priority: 85,
    status: 'active',
    description: '识别常见十六进制密文、摘要或加密块输出。',
    updatedAt: '2026-03-20 15:40:00',
  },
  {
    id: 'enc-3',
    type: 'encryption',
    featureName: 'JWT / Token 字符串',
    featureCode: 'ENC_TOKEN',
    scene: '令牌票据',
    featurePoint: '多段结构，以 . 分隔，包含签名段',
    matcher: 'regex',
    expression: '^[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+$',
    sampleValue: 'eyJhbGciOi...eyJzdWIiOi...SflKxwRJSMeK',
    confidence: 86,
    priority: 75,
    status: 'active',
    description: '识别令牌、签名票据等结构化密文值。',
    updatedAt: '2026-03-21 09:30:00',
  },
];

const migrateBuiltInMaskingFeatures = (features: ProtectionFeatureRecord[]): ProtectionFeatureRecord[] => {
  const builtInMaskingMap = new Map(
    createInitialFeatures()
      .filter((feature) => feature.type === 'masking')
      .map((feature) => [feature.id, feature]),
  );

  return features.map((feature) => {
    if (feature.type !== 'masking') {
      return feature;
    }

    const migrated = builtInMaskingMap.get(feature.id);
    if (!migrated) {
      return feature;
    }

    return {
      ...feature,
      featureName: migrated.featureName,
      featureCode: migrated.featureCode,
      scene: migrated.scene,
      featurePoint: migrated.featurePoint,
      matcher: migrated.matcher,
      expression: migrated.expression,
      sampleValue: migrated.sampleValue,
      description: migrated.description,
    };
  });
};

const readStore = (): ProtectionFeatureRecord[] => {
  if (typeof window === 'undefined') {
    if (!memoryStore) {
      memoryStore = createInitialFeatures();
    }
    return deepCopy(memoryStore);
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = createInitialFeatures();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return deepCopy(initial);
  }

  try {
    const parsed = JSON.parse(raw) as ProtectionFeatureRecord[];
    const migrated = migrateBuiltInMaskingFeatures(parsed);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return deepCopy(migrated);
  } catch (error) {
    const initial = createInitialFeatures();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return deepCopy(initial);
  }
};

const writeStore = (features: ProtectionFeatureRecord[]) => {
  if (typeof window === 'undefined') {
    memoryStore = deepCopy(features);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(features));
};

const mutateStore = (
  updater: (features: ProtectionFeatureRecord[]) => ProtectionFeatureRecord[],
): ProtectionFeatureRecord[] => {
  const features = readStore();
  const nextFeatures = updater(features);
  writeStore(nextFeatures);
  return deepCopy(nextFeatures);
};

export const getProtectionFeatureMatcherLabel = (matcher: ProtectionFeatureMatcher): string =>
  MATCHER_LABEL_MAP[matcher];

export const listProtectionFeatures = (type: ProtectionFeatureType): ProtectionFeatureRecord[] =>
  readStore()
    .filter((item) => item.type === type)
    .sort((left, right) => right.priority - left.priority);

export const createProtectionFeature = (
  type: ProtectionFeatureType,
  values: ProtectionFeatureFormValues,
): ProtectionFeatureRecord => {
  const feature: ProtectionFeatureRecord = {
    id: createId(type === 'masking' ? 'mask' : 'enc'),
    type,
    featureName: values.featureName.trim(),
    featureCode: values.featureCode.trim(),
    scene: values.scene.trim(),
    featurePoint: values.featurePoint.trim(),
    matcher: values.matcher,
    expression: values.expression.trim(),
    sampleValue: values.sampleValue.trim(),
    confidence: Math.min(100, Math.max(0, values.confidence)),
    priority: Math.max(0, values.priority),
    status: values.status,
    description: values.description.trim(),
    updatedAt: getNowText(),
  };

  mutateStore((features) => [feature, ...features]);
  return deepCopy(feature);
};

export const updateProtectionFeature = (
  featureId: string,
  values: ProtectionFeatureFormValues,
): ProtectionFeatureRecord | null => {
  let updatedFeature: ProtectionFeatureRecord | null = null;

  mutateStore((features) =>
    features.map((feature) => {
      if (feature.id !== featureId) {
        return feature;
      }

      updatedFeature = {
        ...feature,
        featureName: values.featureName.trim(),
        featureCode: values.featureCode.trim(),
        scene: values.scene.trim(),
        featurePoint: values.featurePoint.trim(),
        matcher: values.matcher,
        expression: values.expression.trim(),
        sampleValue: values.sampleValue.trim(),
        confidence: Math.min(100, Math.max(0, values.confidence)),
        priority: Math.max(0, values.priority),
        status: values.status,
        description: values.description.trim(),
        updatedAt: getNowText(),
      };

      return updatedFeature;
    }),
  );

  return updatedFeature ? deepCopy(updatedFeature) : null;
};

export const deleteProtectionFeature = (featureId: string): boolean => {
  let deleted = false;

  mutateStore((features) =>
    features.filter((feature) => {
      const keep = feature.id !== featureId;
      if (!keep) {
        deleted = true;
      }
      return keep;
    }),
  );

  return deleted;
};

export const updateProtectionFeatureStatus = (
  featureId: string,
  status: ProtectionFeatureStatus,
): ProtectionFeatureRecord | null => {
  let updatedFeature: ProtectionFeatureRecord | null = null;

  mutateStore((features) =>
    features.map((feature) => {
      if (feature.id !== featureId) {
        return feature;
      }

      updatedFeature = {
        ...feature,
        status,
        updatedAt: getNowText(),
      };

      return updatedFeature;
    }),
  );

  return updatedFeature ? deepCopy(updatedFeature) : null;
};
