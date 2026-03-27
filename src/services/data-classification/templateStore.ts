// 当前先使用本地仓库实现模板管理，后续接入后端时只需要将这些方法替换为 API 调用。

export type TemplateStatus = 'active' | 'inactive' | 'draft';
export type LevelCode = string;
export type RuleMatchMode = 'any' | 'all';
export type RuleMatchTarget =
  | 'fieldName'
  | 'fieldComment'
  | 'fieldType'
  | 'tableName'
  | 'tableComment';
export type RuleMatcher =
  | 'regex'
  | 'equals'
  | 'contains'
  | 'prefix'
  | 'suffix'
  | 'enumContains';

export interface RuleCondition {
  id?: string;
  target: RuleMatchTarget;
  matcher: RuleMatcher;
  value: string;
  hitRate: number;
}

export interface RuleConfig {
  matchMode: RuleMatchMode;
  conditions: RuleCondition[];
}

export interface DataTypeItem {
  id: string;
  name: string;
  levelCode: LevelCode;
  levelName: string;
  isSensitive: boolean;
  needMask: boolean;
  needEncrypt: boolean;
  ruleConfig: RuleConfig;
}

export interface CategoryNode {
  id: string;
  name: string;
  children?: CategoryNode[];
  dataTypes?: DataTypeItem[];
}

export interface LevelDefinitionItem {
  id: string;
  code: LevelCode;
  name: string;
  description: string;
  color: string;
  isSensitive: boolean;
  needMask: boolean;
  needEncrypt: boolean;
  note: string;
}

export interface ClassificationTemplateRecord {
  id: string;
  templateName: string;
  status: TemplateStatus;
  templateType: string;
  creator: string;
  createdAt: string;
  updatedAt: string;
  description: string;
  categories: CategoryNode[];
  levelDefinitions: LevelDefinitionItem[];
}

export interface ClassificationTemplateSummary {
  id: string;
  templateName: string;
  status: TemplateStatus;
  creator: string;
  createTime: string;
  updatedAt: string;
  ruleCount: number;
  description: string;
  templateType: string;
}

export interface TemplateFormValues {
  templateName: string;
  status: TemplateStatus;
  description: string;
}

export interface CategoryFormValues {
  name: string;
}

export interface DataTypeFormValues {
  name: string;
  levelCode: LevelCode;
  isSensitive: boolean;
  needMask: boolean;
  needEncrypt: boolean;
  ruleConfig: RuleConfig;
}

export interface LevelDefinitionFormValues {
  code: LevelCode;
  name: string;
  description: string;
  color: string;
  isSensitive: boolean;
  needMask: boolean;
  needEncrypt: boolean;
  note: string;
}

const STORAGE_KEY = 'classification-template-store-v1';

export const RULE_MATCH_MODE_OPTIONS: Array<{ value: RuleMatchMode; label: string }> = [
  { value: 'any', label: '任一满足' },
  { value: 'all', label: '全部满足' },
];

export const RULE_MATCH_TARGET_OPTIONS: Array<{ value: RuleMatchTarget; label: string }> = [
  { value: 'fieldName', label: '字段名' },
  { value: 'fieldComment', label: '字段注释' },
  { value: 'fieldType', label: '字段类型' },
  { value: 'tableName', label: '表名' },
  { value: 'tableComment', label: '表注释' },
];

export const RULE_MATCHER_OPTIONS: Array<{ value: RuleMatcher; label: string }> = [
  { value: 'regex', label: '正则匹配' },
  { value: 'equals', label: '等于' },
  { value: 'contains', label: '包含' },
  { value: 'prefix', label: '前缀匹配' },
  { value: 'suffix', label: '后缀匹配' },
  { value: 'enumContains', label: '枚举包含' },
];

const LEVEL_NAME_MAP: Record<string, string> = {
  L1: '公开级',
  L2: '内部级',
  L3: '敏感级',
  L4: '高敏级',
  L5: '监管级',
};

const DEFAULT_LEVEL_COLOR_MAP: Record<string, string> = {
  L1: '#f5222d',
  L2: '#fa8c16',
  L3: '#fadb14',
  L4: '#52c41a',
  L5: '#13c2c2',
};

export const LEVEL_COLOR_PRESET_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '#f5222d', label: '赤红' },
  { value: '#fa541c', label: '朱橙' },
  { value: '#fa8c16', label: '橙色' },
  { value: '#fadb14', label: '明黄' },
  { value: '#52c41a', label: '绿色' },
  { value: '#13c2c2', label: '青色' },
  { value: '#1677ff', label: '蓝色' },
  { value: '#2f54eb', label: '靛蓝' },
  { value: '#722ed1', label: '紫色' },
  { value: '#eb2f96', label: '洋红' },
];

const RULE_MATCH_MODE_LABEL_MAP: Record<RuleMatchMode, string> = {
  any: '任一满足',
  all: '全部满足',
};

const RULE_MATCH_TARGET_LABEL_MAP: Record<RuleMatchTarget, string> = {
  fieldName: '字段名',
  fieldComment: '字段注释',
  fieldType: '字段类型',
  tableName: '表名',
  tableComment: '表注释',
};

const RULE_MATCHER_LABEL_MAP: Record<RuleMatcher, string> = {
  regex: '正则匹配',
  equals: '等于',
  contains: '包含',
  prefix: '前缀匹配',
  suffix: '后缀匹配',
  enumContains: '枚举包含',
};

const DEFAULT_LEVEL_DEFINITIONS: LevelDefinitionItem[] = [
  {
    id: 'level-l1',
    code: 'L1',
    name: '公开级',
    description: '公开传播不会造成风险，可直接对外提供。',
    color: DEFAULT_LEVEL_COLOR_MAP.L1,
    isSensitive: false,
    needMask: false,
    needEncrypt: false,
    note: '公共资料、公开说明文档、匿名统计结果。',
  },
  {
    id: 'level-l2',
    code: 'L2',
    name: '内部级',
    description: '企业内部通用数据，需限制外部传播。',
    color: DEFAULT_LEVEL_COLOR_MAP.L2,
    isSensitive: false,
    needMask: true,
    needEncrypt: false,
    note: '联系方式、基础业务字段、内部分析标签。',
  },
  {
    id: 'level-l3',
    code: 'L3',
    name: '敏感级',
    description: '涉及个人权益或业务安全，需严格控制访问。',
    color: DEFAULT_LEVEL_COLOR_MAP.L3,
    isSensitive: true,
    needMask: true,
    needEncrypt: true,
    note: '身份信息、金融账号、地理轨迹、医疗信息。',
  },
  {
    id: 'level-l4',
    code: 'L4',
    name: '高敏级',
    description: '泄露会引发严重合规或业务风险，应最小化暴露。',
    color: DEFAULT_LEVEL_COLOR_MAP.L4,
    isSensitive: true,
    needMask: true,
    needEncrypt: true,
    note: '认证凭证、生物识别模板、核心风控变量。',
  },
  {
    id: 'level-l5',
    code: 'L5',
    name: '监管级',
    description: '受监管要求约束，需审计留痕并实施更高管控。',
    color: DEFAULT_LEVEL_COLOR_MAP.L5,
    isSensitive: true,
    needMask: true,
    needEncrypt: true,
    note: '跨境管控字段、监管报送数据、特定行业核心数据。',
  },
];

const deepCopy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeColor = (color: unknown, levelCode?: string): string => {
  if (
    typeof color === 'string' &&
    LEVEL_COLOR_PRESET_OPTIONS.some((item) => item.value === color.trim())
  ) {
    return color.trim();
  }

  if (levelCode && DEFAULT_LEVEL_COLOR_MAP[levelCode]) {
    return DEFAULT_LEVEL_COLOR_MAP[levelCode];
  }

  return '#1677ff';
};

const buildRuleConfig = (
  conditions: Array<Pick<RuleCondition, 'target' | 'matcher' | 'value'> & Partial<Pick<RuleCondition, 'hitRate'>>>,
  matchMode: RuleMatchMode = 'any',
): RuleConfig => ({
  matchMode,
  conditions: conditions.map((condition, index) => ({
    id: createId('rule'),
    ...condition,
    hitRate:
      typeof condition.hitRate === 'number' && Number.isFinite(condition.hitRate)
        ? Math.min(100, Math.max(0, condition.hitRate))
        : Math.max(40, 92 - index * 7),
  })),
});

const DEFAULT_CATEGORY_TREE: CategoryNode[] = [
  {
    id: 'personal-info',
    name: '个人信息',
    children: [
      {
        id: 'basic-info',
        name: '基本信息',
        dataTypes: [
          {
            id: 'name',
            name: '姓名',
            levelCode: 'L2',
            levelName: '内部级',
            isSensitive: false,
            needMask: true,
            needEncrypt: false,
            ruleConfig: buildRuleConfig([
              { target: 'fieldName', matcher: 'regex', value: '^name|user_name|real_name|full_name' },
            ]),
          },
          {
            id: 'mobile',
            name: '手机号码',
            levelCode: 'L2',
            levelName: '内部级',
            isSensitive: false,
            needMask: true,
            needEncrypt: false,
            ruleConfig: buildRuleConfig([
              { target: 'fieldName', matcher: 'regex', value: '^_|(mobile|cell(phone)?|phone|tel)' },
              { target: 'fieldComment', matcher: 'contains', value: '手机号' },
            ], 'any'),
          },
          {
            id: 'email',
            name: '邮箱地址',
            levelCode: 'L2',
            levelName: '内部级',
            isSensitive: false,
            needMask: true,
            needEncrypt: false,
            ruleConfig: buildRuleConfig([
              { target: 'fieldName', matcher: 'contains', value: 'email' },
              { target: 'fieldComment', matcher: 'contains', value: '邮箱' },
            ], 'any'),
          },
        ],
      },
      {
        id: 'identity-info',
        name: '身份信息',
        dataTypes: [
          {
            id: 'id-card',
            name: '身份证号',
            levelCode: 'L3',
            levelName: '敏感级',
            isSensitive: true,
            needMask: true,
            needEncrypt: true,
            ruleConfig: buildRuleConfig([
              { target: 'fieldName', matcher: 'regex', value: '^id_card|id_card_number|identity_card_no|cert_no' },
              { target: 'fieldComment', matcher: 'contains', value: '身份证' },
            ], 'any'),
          },
          {
            id: 'passport',
            name: '护照号码',
            levelCode: 'L3',
            levelName: '敏感级',
            isSensitive: true,
            needMask: true,
            needEncrypt: true,
            ruleConfig: buildRuleConfig([
              { target: 'fieldName', matcher: 'contains', value: 'passport' },
              { target: 'fieldComment', matcher: 'contains', value: '护照' },
            ], 'any'),
          },
          {
            id: 'driver-license',
            name: '驾驶证号',
            levelCode: 'L3',
            levelName: '敏感级',
            isSensitive: true,
            needMask: true,
            needEncrypt: true,
            ruleConfig: buildRuleConfig([
              { target: 'fieldName', matcher: 'regex', value: '^_|(driver(_?license)?|licence)(?:_?number)?' },
            ]),
          },
        ],
      },
      {
        id: 'contact-info',
        name: '联系方式',
        dataTypes: [
          {
            id: 'contact-address',
            name: '联系地址',
            levelCode: 'L2',
            levelName: '内部级',
            isSensitive: false,
            needMask: true,
            needEncrypt: false,
            ruleConfig: buildRuleConfig([
              { target: 'fieldName', matcher: 'contains', value: 'address' },
              { target: 'fieldComment', matcher: 'contains', value: '联系地址' },
            ], 'any'),
          },
        ],
      },
      {
        id: 'location-address',
        name: '位置与地址',
        dataTypes: [
          {
            id: 'precise-location',
            name: '精确位置',
            levelCode: 'L3',
            levelName: '敏感级',
            isSensitive: true,
            needMask: true,
            needEncrypt: true,
            ruleConfig: buildRuleConfig([
              { target: 'fieldName', matcher: 'enumContains', value: 'latitude,longitude,lat,lng,lon,gps' },
            ]),
          },
          {
            id: 'trajectory',
            name: '行踪轨迹',
            levelCode: 'L3',
            levelName: '敏感级',
            isSensitive: true,
            needMask: true,
            needEncrypt: true,
            ruleConfig: buildRuleConfig([
              { target: 'fieldName', matcher: 'enumContains', value: 'trajectory,track_points,route,path' },
            ]),
          },
        ],
      },
      {
        id: 'biometric',
        name: '生物识别',
        dataTypes: [
          {
            id: 'biometric-data',
            name: '生物识别信息',
            levelCode: 'L3',
            levelName: '敏感级',
            isSensitive: true,
            needMask: true,
            needEncrypt: true,
            ruleConfig: buildRuleConfig([
              { target: 'fieldName', matcher: 'enumContains', value: 'face_image,face_id,fingerprint,iris,voiceprint' },
            ]),
          },
        ],
      },
      {
        id: 'special-identity-faith',
        name: '特定身份与信仰',
        dataTypes: [
          {
            id: 'religion',
            name: '宗教信仰信息',
            levelCode: 'L3',
            levelName: '敏感级',
            isSensitive: true,
            needMask: true,
            needEncrypt: true,
            ruleConfig: { matchMode: 'any', conditions: [] },
          },
        ],
      },
      {
        id: 'health-info',
        name: '健康信息',
        dataTypes: [
          {
            id: 'medical-record',
            name: '医疗信息',
            levelCode: 'L3',
            levelName: '敏感级',
            isSensitive: true,
            needMask: true,
            needEncrypt: true,
            ruleConfig: buildRuleConfig([
              { target: 'fieldName', matcher: 'enumContains', value: 'medical_record,diagnosis,illness,health_data' },
            ]),
          },
        ],
      },
      {
        id: 'minor-info',
        name: '未成年人信息',
        dataTypes: [
          {
            id: 'minor-data',
            name: '未成年人信息',
            levelCode: 'L3',
            levelName: '敏感级',
            isSensitive: true,
            needMask: true,
            needEncrypt: true,
            ruleConfig: buildRuleConfig([
              { target: 'fieldName', matcher: 'enumContains', value: 'minor,child,children,kid,guardian' },
            ]),
          },
        ],
      },
    ],
  },
  {
    id: 'financial-info',
    name: '金融信息',
    children: [
      {
        id: 'account-info',
        name: '账户信息',
        dataTypes: [
          {
            id: 'bank-account',
            name: '银行账号',
            levelCode: 'L3',
            levelName: '敏感级',
            isSensitive: true,
            needMask: true,
            needEncrypt: true,
            ruleConfig: buildRuleConfig([
              { target: 'fieldName', matcher: 'enumContains', value: 'bank_account,account_no,acct_no,iban' },
            ]),
          },
        ],
      },
      {
        id: 'transaction-info',
        name: '交易信息',
        dataTypes: [
          {
            id: 'transaction-record',
            name: '交易记录',
            levelCode: 'L2',
            levelName: '内部级',
            isSensitive: false,
            needMask: true,
            needEncrypt: false,
            ruleConfig: buildRuleConfig([
              { target: 'fieldName', matcher: 'enumContains', value: 'transaction,trade,payment,pay_record' },
              { target: 'tableComment', matcher: 'contains', value: '交易' },
            ], 'any'),
          },
        ],
      },
      {
        id: 'credit-info',
        name: '征信信息',
        dataTypes: [
          {
            id: 'credit-score',
            name: '信用评分',
            levelCode: 'L3',
            levelName: '敏感级',
            isSensitive: true,
            needMask: true,
            needEncrypt: true,
            ruleConfig: buildRuleConfig([
              { target: 'fieldName', matcher: 'enumContains', value: 'credit_score,credit_rating,risk_score' },
            ]),
          },
        ],
      },
      {
        id: 'account-credential',
        name: '账号凭证',
        dataTypes: [
          {
            id: 'payment-password',
            name: '支付凭证',
            levelCode: 'L4',
            levelName: '高敏级',
            isSensitive: true,
            needMask: true,
            needEncrypt: true,
            ruleConfig: { matchMode: 'any', conditions: [] },
          },
        ],
      },
    ],
  },
  {
    id: 'device-network-id',
    name: '设备网络标识',
    children: [
      { id: 'device-identifier', name: '设备标识' },
      { id: 'network-identifier', name: '网络标识' },
      { id: 'application-identifier', name: '应用标识' },
      { id: 'behavior-log', name: '行为日志' },
    ],
  },
  {
    id: 'business-data',
    name: '业务数据',
    children: [
      { id: 'customer-profile', name: '客户画像' },
      { id: 'contract-document', name: '合同文档' },
      { id: 'order-detail', name: '订单明细' },
      { id: 'billing-data', name: '账单数据' },
    ],
  },
  {
    id: 'traffic-geo',
    name: '交通地理信息',
    children: [
      { id: 'route-track', name: '路径轨迹' },
      { id: 'vehicle-identity', name: '车辆标识' },
      { id: 'travel-certificate', name: '出行凭证' },
      { id: 'exact-coordinate', name: '坐标位置' },
    ],
  },
  {
    id: 'organization-data',
    name: '组织机构数据',
    children: [
      { id: 'employee-identity', name: '员工身份' },
      { id: 'organizational-structure', name: '组织架构' },
      { id: 'access-control', name: '门禁权限' },
    ],
  },
];

let memoryStore: ClassificationTemplateRecord[] | null = null;

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

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normalizeRuleCondition = (value: unknown): RuleCondition | null => {
  if (!isObject(value)) {
    return null;
  }

  const target = value.target;
  const matcher = value.matcher;
  const ruleValue = typeof value.value === 'string' ? value.value : '';

  if (
    !RULE_MATCH_TARGET_OPTIONS.some((item) => item.value === target) ||
    !RULE_MATCHER_OPTIONS.some((item) => item.value === matcher)
  ) {
    return null;
  }

  const normalizedTarget = target as RuleMatchTarget;
  const normalizedMatcher = matcher as RuleMatcher;
  const hitRate =
    typeof value.hitRate === 'number' && Number.isFinite(value.hitRate)
      ? Math.min(100, Math.max(0, value.hitRate))
      : 0;

  return {
    id: typeof value.id === 'string' && value.id ? value.id : createId('rule'),
    target: normalizedTarget,
    matcher: normalizedMatcher,
    value: ruleValue,
    hitRate,
  };
};

const parseLegacyRule = (legacyRule: string): RuleConfig => {
  const trimmedRule = legacyRule.trim();
  if (!trimmedRule) {
    return { matchMode: 'any', conditions: [] };
  }

  const matchedRule = trimmedRule.match(/^字段名匹配\((.*)\)$/);
  const value = matchedRule?.[1] ?? trimmedRule;

  return buildRuleConfig([
    {
      target: 'fieldName',
      matcher: 'regex',
      value,
    },
  ]);
};

const normalizeRuleConfig = (value: unknown, legacyRule?: string): RuleConfig => {
  if (isObject(value)) {
    const matchMode = value.matchMode === 'all' ? 'all' : 'any';
    const conditions = Array.isArray(value.conditions)
      ? value.conditions
          .map((item) => normalizeRuleCondition(item))
          .filter((item): item is RuleCondition => Boolean(item))
      : [];

    if (conditions.length) {
      return {
        matchMode,
        conditions,
      };
    }
  }

  if (typeof legacyRule === 'string' && legacyRule.trim()) {
    return parseLegacyRule(legacyRule);
  }

  return {
    matchMode: 'any',
    conditions: [],
  };
};

const normalizeDataType = (value: unknown, index: number): DataTypeItem | null => {
  if (!isObject(value) || typeof value.name !== 'string') {
    return null;
  }

  const levelCode =
    typeof value.levelCode === 'string' && LEVEL_NAME_MAP[value.levelCode as LevelCode]
      ? (value.levelCode as LevelCode)
      : 'L2';

  return {
    id: typeof value.id === 'string' && value.id ? value.id : `datatype-${index}`,
    name: value.name,
    levelCode,
    levelName: typeof value.levelName === 'string' && value.levelName ? value.levelName : LEVEL_NAME_MAP[levelCode],
    isSensitive: Boolean(value.isSensitive),
    needMask: Boolean(value.needMask),
    needEncrypt: Boolean(value.needEncrypt),
    ruleConfig: normalizeRuleConfig(value.ruleConfig, typeof value.rule === 'string' ? value.rule : ''),
  };
};

const normalizeCategoryNode = (value: unknown, index: number): CategoryNode | null => {
  if (!isObject(value) || typeof value.name !== 'string') {
    return null;
  }

  const dataTypes = Array.isArray(value.dataTypes)
    ? value.dataTypes
        .map((item, dataTypeIndex) => normalizeDataType(item, dataTypeIndex))
        .filter((item): item is DataTypeItem => Boolean(item))
    : [];

  const children = Array.isArray(value.children)
    ? value.children
        .map((item, childIndex) => normalizeCategoryNode(item, childIndex))
        .filter((item): item is CategoryNode => Boolean(item))
    : [];

  return {
    id: typeof value.id === 'string' && value.id ? value.id : `category-${index}`,
    name: value.name,
    dataTypes,
    children,
  };
};

const normalizeLevelDefinition = (value: unknown, index: number): LevelDefinitionItem | null => {
  if (!isObject(value) || typeof value.code !== 'string' || !value.code.trim()) {
    return null;
  }

  const code = value.code.trim();

  return {
    id: typeof value.id === 'string' && value.id ? value.id : `level-${index}`,
    code,
    name: typeof value.name === 'string' && value.name ? value.name : LEVEL_NAME_MAP[code] ?? code,
    description: typeof value.description === 'string' ? value.description : '',
    color: normalizeColor(value.color, code),
    isSensitive:
      typeof value.isSensitive === 'boolean'
        ? value.isSensitive
        : ['L3', 'L4', 'L5'].includes(code),
    needMask: Boolean(value.needMask),
    needEncrypt: Boolean(value.needEncrypt),
    note: typeof value.note === 'string' ? value.note : '',
  };
};

const buildCatalogForTemplateType = (templateType: string): CategoryNode[] => {
  if (templateType === '行业扩展') {
    return deepCopy(
      DEFAULT_CATEGORY_TREE.filter((item) => ['personal-info', 'financial-info', 'business-data'].includes(item.id)),
    );
  }

  if (templateType === '自定义模板') {
    return [];
  }

  return deepCopy(DEFAULT_CATEGORY_TREE);
};

const createInitialTemplates = (): ClassificationTemplateRecord[] => [
  {
    id: '1',
    templateName: '标准分类分级模板',
    status: 'active',
    templateType: '标准预置',
    creator: '系统管理员',
    createdAt: '2026-03-20 09:00:00',
    updatedAt: '2026-03-23 11:41:26',
    description: '覆盖通用个人信息、金融、工业、汽车与地理运行场景的标准模板。',
    categories: buildCatalogForTemplateType('标准预置'),
    levelDefinitions: deepCopy(DEFAULT_LEVEL_DEFINITIONS),
  },
  {
    id: '2',
    templateName: '金融行业扩展模板',
    status: 'active',
    templateType: '行业扩展',
    creator: '张三',
    createdAt: '2026-03-18 14:30:00',
    updatedAt: '2026-03-22 10:15:00',
    description: '面向账户、交易、征信等金融场景的扩展分类模板。',
    categories: buildCatalogForTemplateType('行业扩展'),
    levelDefinitions: deepCopy(DEFAULT_LEVEL_DEFINITIONS),
  },
  {
    id: '3',
    templateName: '自定义试运行模板',
    status: 'draft',
    templateType: '自定义模板',
    creator: '王五',
    createdAt: '2026-03-21 16:20:00',
    updatedAt: '2026-03-21 16:20:00',
    description: '用于快速试配分类目录与识别规则的草稿模板。',
    categories: [],
    levelDefinitions: deepCopy(DEFAULT_LEVEL_DEFINITIONS),
  },
];

const normalizeTemplate = (value: unknown, index: number): ClassificationTemplateRecord | null => {
  if (!isObject(value) || typeof value.templateName !== 'string') {
    return null;
  }

  const levelDefinitions = Array.isArray(value.levelDefinitions)
    ? value.levelDefinitions
        .map((item, levelIndex) => normalizeLevelDefinition(item, levelIndex))
        .filter((item): item is LevelDefinitionItem => Boolean(item))
    : deepCopy(DEFAULT_LEVEL_DEFINITIONS);

  const categories = Array.isArray(value.categories)
    ? value.categories
        .map((item, categoryIndex) => normalizeCategoryNode(item, categoryIndex))
        .filter((item): item is CategoryNode => Boolean(item))
    : [];

  const status: TemplateStatus =
    value.status === 'active' || value.status === 'inactive' || value.status === 'draft'
      ? value.status
      : 'draft';

  return {
    id: typeof value.id === 'string' && value.id ? value.id : `template-${index}`,
    templateName: value.templateName,
    status,
    templateType: typeof value.templateType === 'string' && value.templateType ? value.templateType : '自定义模板',
    creator: typeof value.creator === 'string' && value.creator ? value.creator : '当前用户',
    createdAt: typeof value.createdAt === 'string' && value.createdAt ? value.createdAt : getNowText(),
    updatedAt: typeof value.updatedAt === 'string' && value.updatedAt ? value.updatedAt : getNowText(),
    description: typeof value.description === 'string' ? value.description : '',
    categories,
    levelDefinitions: levelDefinitions.length ? levelDefinitions : deepCopy(DEFAULT_LEVEL_DEFINITIONS),
  };
};

const readStore = (): ClassificationTemplateRecord[] => {
  if (typeof window === 'undefined') {
    if (!memoryStore) {
      memoryStore = createInitialTemplates();
    }
    return deepCopy(memoryStore);
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = createInitialTemplates();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return deepCopy(initial);
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error('Invalid template store payload');
    }

    const templates = parsed
      .map((item, index) => normalizeTemplate(item, index))
      .filter((item): item is ClassificationTemplateRecord => Boolean(item));

    if (!templates.length) {
      throw new Error('Template store is empty');
    }

    return deepCopy(templates);
  } catch (error) {
    const initial = createInitialTemplates();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return deepCopy(initial);
  }
};

const writeStore = (templates: ClassificationTemplateRecord[]) => {
  if (typeof window === 'undefined') {
    memoryStore = deepCopy(templates);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
};

const mutateStore = (
  updater: (templates: ClassificationTemplateRecord[]) => ClassificationTemplateRecord[],
): ClassificationTemplateRecord[] => {
  const templates = readStore();
  const nextTemplates = updater(templates);
  writeStore(nextTemplates);
  return deepCopy(nextTemplates);
};

const countRulesInCategories = (nodes: CategoryNode[]): number =>
  nodes.reduce((total, node) => {
    const dataTypeRules = (node.dataTypes ?? []).reduce((ruleTotal, dataType) => {
      const currentRuleCount = dataType.ruleConfig.conditions.filter((condition) => condition.value.trim()).length;
      return ruleTotal + currentRuleCount;
    }, 0);
    return total + dataTypeRules + countRulesInCategories(node.children ?? []);
  }, 0);

const mapTemplateSummary = (template: ClassificationTemplateRecord): ClassificationTemplateSummary => ({
  id: template.id,
  templateName: template.templateName,
  status: template.status,
  creator: template.creator,
  createTime: template.createdAt,
  updatedAt: template.updatedAt,
  ruleCount: countRulesInCategories(template.categories),
  description: template.description,
  templateType: template.templateType,
});

const updateTemplateById = (
  templateId: string,
  updater: (template: ClassificationTemplateRecord) => ClassificationTemplateRecord,
): ClassificationTemplateRecord | null => {
  let updatedTemplate: ClassificationTemplateRecord | null = null;

  mutateStore((templates) =>
    templates.map((template) => {
      if (template.id !== templateId) {
        return template;
      }

      updatedTemplate = updater(template);
      return updatedTemplate;
    }),
  );

  return updatedTemplate ? deepCopy(updatedTemplate) : null;
};

const appendCategoryToTree = (
  nodes: CategoryNode[],
  parentId: string | null,
  category: CategoryNode,
): { nodes: CategoryNode[]; inserted: boolean } => {
  if (!parentId) {
    return { nodes: [...nodes, category], inserted: true };
  }

  let inserted = false;

  const nextNodes = nodes.map((node) => {
    if (node.id === parentId) {
      inserted = true;
      return {
        ...node,
        children: [...(node.children ?? []), category],
      };
    }

    const childResult = appendCategoryToTree(node.children ?? [], parentId, category);
    if (childResult.inserted) {
      inserted = true;
      return {
        ...node,
        children: childResult.nodes,
      };
    }

    return node;
  });

  return { nodes: nextNodes, inserted };
};

const renameCategoryInTree = (
  nodes: CategoryNode[],
  categoryId: string,
  name: string,
): { nodes: CategoryNode[]; updated: boolean } => {
  let updated = false;

  const nextNodes = nodes.map((node) => {
    if (node.id === categoryId) {
      updated = true;
      return {
        ...node,
        name,
      };
    }

    const childResult = renameCategoryInTree(node.children ?? [], categoryId, name);
    if (childResult.updated) {
      updated = true;
      return {
        ...node,
        children: childResult.nodes,
      };
    }

    return node;
  });

  return { nodes: nextNodes, updated };
};

const removeCategoryFromTree = (
  nodes: CategoryNode[],
  categoryId: string,
): { nodes: CategoryNode[]; removed: boolean } => {
  let removed = false;
  const nextNodes: CategoryNode[] = [];

  nodes.forEach((node) => {
    if (node.id === categoryId) {
      removed = true;
      return;
    }

    const childResult = removeCategoryFromTree(node.children ?? [], categoryId);
    if (childResult.removed) {
      removed = true;
    }

    nextNodes.push({
      ...node,
      children: childResult.nodes,
    });
  });

  return { nodes: nextNodes, removed };
};

const addDataTypeToTree = (
  nodes: CategoryNode[],
  categoryId: string,
  dataType: DataTypeItem,
): { nodes: CategoryNode[]; inserted: boolean } => {
  let inserted = false;

  const nextNodes = nodes.map((node) => {
    if (node.id === categoryId) {
      inserted = true;
      return {
        ...node,
        dataTypes: [...(node.dataTypes ?? []), dataType],
      };
    }

    const childResult = addDataTypeToTree(node.children ?? [], categoryId, dataType);
    if (childResult.inserted) {
      inserted = true;
      return {
        ...node,
        children: childResult.nodes,
      };
    }

    return node;
  });

  return { nodes: nextNodes, inserted };
};

const updateDataTypeInTree = (
  nodes: CategoryNode[],
  dataTypeId: string,
  updater: (dataType: DataTypeItem) => DataTypeItem,
): { nodes: CategoryNode[]; updated: boolean } => {
  let updated = false;

  const nextNodes = nodes.map((node) => {
    const nextDataTypes = (node.dataTypes ?? []).map((item) => {
      if (item.id !== dataTypeId) {
        return item;
      }

      updated = true;
      return updater(item);
    });

    const childResult = updateDataTypeInTree(node.children ?? [], dataTypeId, updater);
    if (childResult.updated) {
      updated = true;
    }

    return {
      ...node,
      dataTypes: nextDataTypes,
      children: childResult.nodes,
    };
  });

  return { nodes: nextNodes, updated };
};

const removeDataTypeFromTree = (
  nodes: CategoryNode[],
  dataTypeId: string,
): { nodes: CategoryNode[]; removed: boolean } => {
  let removed = false;

  const nextNodes = nodes.map((node) => {
    const nextDataTypes = (node.dataTypes ?? []).filter((item) => {
      const shouldKeep = item.id !== dataTypeId;
      if (!shouldKeep) {
        removed = true;
      }
      return shouldKeep;
    });

    const childResult = removeDataTypeFromTree(node.children ?? [], dataTypeId);
    if (childResult.removed) {
      removed = true;
    }

    return {
      ...node,
      dataTypes: nextDataTypes,
      children: childResult.nodes,
    };
  });

  return { nodes: nextNodes, removed };
};

const remapDataTypesForLevel = (
  nodes: CategoryNode[],
  previousLevelCode: string,
  nextLevelDefinition: Pick<LevelDefinitionItem, 'code' | 'name'>,
): CategoryNode[] =>
  nodes.map((node) => ({
    ...node,
    dataTypes: (node.dataTypes ?? []).map((dataType) =>
      dataType.levelCode === previousLevelCode
        ? {
            ...dataType,
            levelCode: nextLevelDefinition.code,
            levelName: nextLevelDefinition.name,
          }
        : dataType,
    ),
    children: remapDataTypesForLevel(node.children ?? [], previousLevelCode, nextLevelDefinition),
  }));

const normalizeRuleFormConfig = (ruleConfig?: RuleConfig): RuleConfig => ({
  matchMode: ruleConfig?.matchMode === 'all' ? 'all' : 'any',
  conditions: (ruleConfig?.conditions ?? [])
    .map((condition) => ({
      id: condition.id,
      target: condition.target,
      matcher: condition.matcher,
      value: condition.value ?? '',
      hitRate: typeof condition.hitRate === 'number' ? condition.hitRate : 0,
    }))
    .filter((condition) => condition.value.trim()),
});

const buildDataTypeFromFormValues = (
  levelDefinitions: LevelDefinitionItem[],
  values: DataTypeFormValues,
  existingDataType?: DataTypeItem,
): DataTypeItem => {
  const levelDefinition = levelDefinitions.find((item) => item.code === values.levelCode);
  const normalizedRuleConfig = normalizeRuleFormConfig(values.ruleConfig);

  return {
    id: existingDataType?.id ?? createId('datatype'),
    name: values.name.trim(),
    levelCode: values.levelCode,
    levelName: levelDefinition?.name ?? LEVEL_NAME_MAP[values.levelCode],
    isSensitive: values.isSensitive,
    needMask: values.needMask,
    needEncrypt: values.needEncrypt,
    ruleConfig: {
      matchMode: normalizedRuleConfig.matchMode,
      conditions: normalizedRuleConfig.conditions.map((condition) => ({
        id: condition.id ?? createId('rule'),
        target: condition.target,
        matcher: condition.matcher,
        value: condition.value.trim(),
        hitRate: Math.min(100, Math.max(0, condition.hitRate)),
      })),
    },
  };
};

export const getDefaultLevelDefinitions = (): LevelDefinitionItem[] => deepCopy(DEFAULT_LEVEL_DEFINITIONS);

export const getLevelNameByCode = (levelCode: LevelCode): string => LEVEL_NAME_MAP[levelCode] ?? levelCode;

export const getRuleMatchModeLabel = (matchMode: RuleMatchMode): string => RULE_MATCH_MODE_LABEL_MAP[matchMode];

export const getRuleMatchTargetLabel = (target: RuleMatchTarget): string => RULE_MATCH_TARGET_LABEL_MAP[target];

export const getRuleMatcherLabel = (matcher: RuleMatcher): string => RULE_MATCHER_LABEL_MAP[matcher];

export const createEmptyRuleConfig = (): RuleConfig => ({
  matchMode: 'any',
  conditions: [],
});

export const createDefaultRuleCondition = (): RuleCondition => ({
  id: createId('rule'),
  target: 'fieldName',
  matcher: 'regex',
  value: '',
  hitRate: 0,
});

export const formatRuleSummary = (ruleConfig?: RuleConfig): string => {
  const conditions = ruleConfig?.conditions.filter((item) => item.value.trim()) ?? [];
  if (!conditions.length) {
    return '';
  }

  const prefix = getRuleMatchModeLabel(ruleConfig?.matchMode === 'all' ? 'all' : 'any');
  const content = conditions
    .map((condition) => {
      const target = getRuleMatchTargetLabel(condition.target);
      const matcher = getRuleMatcherLabel(condition.matcher);
      return `${target}${matcher}${condition.value}`;
    })
    .join('；');

  return `${prefix}：${content}`;
};

export const countCategoryNodes = (nodes: CategoryNode[]): number =>
  nodes.reduce((total, node) => total + 1 + countCategoryNodes(node.children ?? []), 0);

export const findCategoryById = (nodes: CategoryNode[], categoryId: string): CategoryNode | undefined => {
  for (const node of nodes) {
    if (node.id === categoryId) {
      return node;
    }

    const matchedChild = findCategoryById(node.children ?? [], categoryId);
    if (matchedChild) {
      return matchedChild;
    }
  }

  return undefined;
};

export const collectDataTypes = (node: CategoryNode): DataTypeItem[] => {
  const current = node.dataTypes ?? [];
  const children = (node.children ?? []).flatMap((child) => collectDataTypes(child));
  return [...current, ...children];
};

export const listClassificationTemplates = (): ClassificationTemplateSummary[] =>
  readStore().map(mapTemplateSummary);

export const getClassificationTemplateById = (templateId: string): ClassificationTemplateRecord | null => {
  const template = readStore().find((item) => item.id === templateId);
  return template ? deepCopy(template) : null;
};

export const createClassificationTemplate = (
  values: TemplateFormValues,
  creator = '当前用户',
): ClassificationTemplateRecord => {
  const now = getNowText();
  const template: ClassificationTemplateRecord = {
    id: createId('template'),
    templateName: values.templateName.trim(),
    status: values.status,
    templateType: '自定义模板',
    creator,
    createdAt: now,
    updatedAt: now,
    description: values.description.trim(),
    categories: [],
    levelDefinitions: deepCopy(DEFAULT_LEVEL_DEFINITIONS),
  };

  mutateStore((templates) => [template, ...templates]);
  return deepCopy(template);
};

export const updateClassificationTemplate = (
  templateId: string,
  values: TemplateFormValues,
): ClassificationTemplateRecord | null =>
  updateTemplateById(templateId, (template) => ({
    ...template,
    templateName: values.templateName.trim(),
    status: values.status,
    description: values.description.trim(),
    updatedAt: getNowText(),
  }));

export const updateClassificationTemplateStatus = (
  templateId: string,
  status: Exclude<TemplateStatus, 'draft'>,
): ClassificationTemplateRecord | null =>
  updateTemplateById(templateId, (template) => ({
    ...template,
    status,
    updatedAt: getNowText(),
  }));

export const duplicateClassificationTemplate = (templateId: string): ClassificationTemplateRecord | null => {
  const template = getClassificationTemplateById(templateId);
  if (!template) {
    return null;
  }

  const now = getNowText();
  const duplicated: ClassificationTemplateRecord = {
    ...deepCopy(template),
    id: createId('template'),
    templateName: `${template.templateName} - 副本`,
    status: 'draft',
    templateType: '自定义模板',
    creator: '当前用户',
    createdAt: now,
    updatedAt: now,
  };

  mutateStore((templates) => [duplicated, ...templates]);
  return duplicated;
};

export const deleteClassificationTemplate = (templateId: string): boolean => {
  let deleted = false;

  mutateStore((templates) =>
    templates.filter((template) => {
      const keep = template.id !== templateId;
      if (!keep) {
        deleted = true;
      }
      return keep;
    }),
  );

  return deleted;
};

export const initializeClassificationTemplate = (templateId: string): ClassificationTemplateRecord | null =>
  updateTemplateById(templateId, (template) => ({
    ...template,
    categories:
      template.templateType === '自定义模板'
        ? deepCopy(DEFAULT_CATEGORY_TREE)
        : buildCatalogForTemplateType(template.templateType),
    levelDefinitions: deepCopy(DEFAULT_LEVEL_DEFINITIONS),
    updatedAt: getNowText(),
  }));

export const addClassificationLevelDefinition = (
  templateId: string,
  values: LevelDefinitionFormValues,
): ClassificationTemplateRecord | null =>
  updateTemplateById(templateId, (template) => {
    const nextLevelDefinition: LevelDefinitionItem = {
      id: createId('level'),
      code: values.code.trim(),
      name: values.name.trim(),
      description: values.description.trim(),
      color: normalizeColor(values.color, values.code.trim()),
      isSensitive: values.isSensitive,
      needMask: values.needMask,
      needEncrypt: values.needEncrypt,
      note: values.note.trim(),
    };

    return {
      ...template,
      levelDefinitions: [...template.levelDefinitions, nextLevelDefinition],
      updatedAt: getNowText(),
    };
  });

export const updateClassificationLevelDefinition = (
  templateId: string,
  levelId: string,
  values: LevelDefinitionFormValues,
): ClassificationTemplateRecord | null =>
  updateTemplateById(templateId, (template) => {
    const existingLevelDefinition = template.levelDefinitions.find((item) => item.id === levelId);
    if (!existingLevelDefinition) {
      return template;
    }

    const nextLevelDefinition: LevelDefinitionItem = {
      id: existingLevelDefinition.id,
      code: values.code.trim(),
      name: values.name.trim(),
      description: values.description.trim(),
      color: normalizeColor(values.color, values.code.trim()),
      isSensitive: values.isSensitive,
      needMask: values.needMask,
      needEncrypt: values.needEncrypt,
      note: values.note.trim(),
    };

    const nextLevelDefinitions = template.levelDefinitions.map((item) =>
      item.id === levelId ? nextLevelDefinition : item,
    );

    return {
      ...template,
      levelDefinitions: nextLevelDefinitions,
      categories: remapDataTypesForLevel(template.categories, existingLevelDefinition.code, {
        code: nextLevelDefinition.code,
        name: nextLevelDefinition.name,
      }),
      updatedAt: getNowText(),
    };
  });

export const deleteClassificationLevelDefinition = (
  templateId: string,
  levelId: string,
): ClassificationTemplateRecord | null =>
  updateTemplateById(templateId, (template) => ({
    ...template,
    levelDefinitions: template.levelDefinitions.filter((item) => item.id !== levelId),
    updatedAt: getNowText(),
  }));

export const addClassificationCategory = (
  templateId: string,
  values: CategoryFormValues,
  parentId: string | null = null,
): ClassificationTemplateRecord | null =>
  updateTemplateById(templateId, (template) => {
    const category: CategoryNode = {
      id: createId('category'),
      name: values.name.trim(),
      children: [],
      dataTypes: [],
    };

    const result = appendCategoryToTree(template.categories, parentId, category);
    return {
      ...template,
      categories: result.nodes,
      updatedAt: getNowText(),
    };
  });

export const updateClassificationCategory = (
  templateId: string,
  categoryId: string,
  values: CategoryFormValues,
): ClassificationTemplateRecord | null =>
  updateTemplateById(templateId, (template) => {
    const result = renameCategoryInTree(template.categories, categoryId, values.name.trim());
    return {
      ...template,
      categories: result.nodes,
      updatedAt: getNowText(),
    };
  });

export const deleteClassificationCategory = (
  templateId: string,
  categoryId: string,
): ClassificationTemplateRecord | null =>
  updateTemplateById(templateId, (template) => {
    const result = removeCategoryFromTree(template.categories, categoryId);
    return {
      ...template,
      categories: result.nodes,
      updatedAt: getNowText(),
    };
  });

export const addClassificationDataType = (
  templateId: string,
  categoryId: string,
  values: DataTypeFormValues,
): ClassificationTemplateRecord | null =>
  updateTemplateById(templateId, (template) => {
    const dataType = buildDataTypeFromFormValues(template.levelDefinitions, values);
    const result = addDataTypeToTree(template.categories, categoryId, dataType);

    return {
      ...template,
      categories: result.nodes,
      updatedAt: getNowText(),
    };
  });

export const updateClassificationDataType = (
  templateId: string,
  dataTypeId: string,
  values: DataTypeFormValues,
): ClassificationTemplateRecord | null =>
  updateTemplateById(templateId, (template) => {
    const result = updateDataTypeInTree(template.categories, dataTypeId, (dataType) =>
      buildDataTypeFromFormValues(template.levelDefinitions, values, dataType),
    );

    return {
      ...template,
      categories: result.nodes,
      updatedAt: getNowText(),
    };
  });

export const deleteClassificationDataType = (
  templateId: string,
  dataTypeId: string,
): ClassificationTemplateRecord | null =>
  updateTemplateById(templateId, (template) => {
    const result = removeDataTypeFromTree(template.categories, dataTypeId);
    return {
      ...template,
      categories: result.nodes,
      updatedAt: getNowText(),
    };
  });

export const resetClassificationTemplateStore = () => {
  const initial = createInitialTemplates();
  writeStore(initial);
};
