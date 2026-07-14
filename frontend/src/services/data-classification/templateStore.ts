import { request } from '@/services/request';
import { formatBeijingDateTime } from '@/utils/datetime';

export type TemplateStatus = 'active' | 'inactive' | 'draft';
export type LevelCode = string;
export type RuleMatchMode = 'any' | 'all';
export type RuleMatchTarget = 'fieldName' | 'fieldComment' | 'fieldType' | 'tableName' | 'tableComment' | 'sampleData';
export type RuleMatcher = 'regex' | 'equals' | 'contains' | 'prefix' | 'suffix' | 'enumContains';

export interface RuleCondition {
  id?: string;
  target: RuleMatchTarget;
  matcher: RuleMatcher;
  value: string;
  hitRate?: number | null;
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
  { value: 'sampleData', label: '样本数据' },
];

export const RULE_MATCHER_OPTIONS: Array<{ value: RuleMatcher; label: string }> = [
  { value: 'regex', label: '正则匹配' },
  { value: 'equals', label: '等于' },
  { value: 'contains', label: '包含' },
  { value: 'prefix', label: '前缀匹配' },
  { value: 'suffix', label: '后缀匹配' },
  { value: 'enumContains', label: '枚举包含' },
];

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

const STANDARD_DEFAULT_LEVEL_DEFINITIONS: LevelDefinitionItem[] = [
  { id: 'level-l1-standard', code: 'L1', name: '公开数据', description: '已公开发布或可面向公众提供的数据，泄露后通常不会造成明显损害。', color: '#52c41a', isSensitive: false, needMask: false, needEncrypt: false, note: '适用于公告、公示信息、公开产品目录、匿名统计结果等。' },
  { id: 'level-l2-standard', code: 'L2', name: '内部数据', description: '仅限组织内部使用的一般业务与管理数据，外泄会造成有限运营影响。', color: '#1677ff', isSensitive: false, needMask: false, needEncrypt: false, note: '适用于内部台账、一般运营数据、组织通讯录等。' },
  { id: 'level-l3-standard', code: 'L3', name: '敏感数据', description: '涉及敏感个人信息或重要业务明细，需强化访问控制与最小化暴露。', color: '#fa8c16', isSensitive: true, needMask: false, needEncrypt: false, note: '适用于手机号、姓名与证件组合、交易流水、客户身份信息等。' },
  { id: 'level-l4-standard', code: 'L4', name: '重要数据', description: '可能对公共利益、行业运行或组织关键业务造成严重危害，需结合规模、场景和行业目录复核。', color: '#f5222d', isSensitive: true, needMask: true, needEncrypt: true, note: '重要数据认定仍需结合行业主管部门目录和人工复核。' },
  { id: 'level-l5-standard', code: 'L5', name: '核心数据', description: '一旦泄露、篡改或破坏，可能对国家安全、关键业务或重大公共利益造成严重危害。', color: '#722ed1', isSensitive: true, needMask: true, needEncrypt: true, note: '适用于主密钥材料、核心控制参数、最高敏感认证要素等。' },
];

const STANDARD_LEVEL_NAME_MAP: Record<string, string> = {
  L1: '公开数据',
  L2: '内部数据',
  L3: '敏感数据',
  L4: '重要数据',
  L5: '核心数据',
};

type BackendTemplate = {
  id: string;
  templateName: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT';
  templateType?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  categories?: BackendCategory[];
  levelDefinitions?: BackendLevelDefinition[];
  dataTypes?: BackendDataType[];
};

type BackendCategory = {
  id: string;
  templateId: string;
  parentId?: string | null;
  name: string;
  description?: string | null;
  sortOrder?: number;
};

type BackendLevelDefinition = {
  id: string;
  templateId: string;
  code: string;
  name: string;
  color?: string | null;
  description?: string | null;
  isSensitive: boolean;
  needMask: boolean;
  needEncrypt: boolean;
  note?: string | null;
};

type BackendRule = {
  id: string;
  dataTypeId: string;
  target: string;
  matcher: string;
  value: string;
  hitRate?: number | null;
  sortOrder?: number;
};

type BackendDataType = {
  id: string;
  templateId: string;
  categoryId: string;
  levelDefinitionId?: string | null;
  name: string;
  isSensitive: boolean;
  needMask: boolean;
  needEncrypt: boolean;
  category?: BackendCategory;
  levelDefinition?: BackendLevelDefinition | null;
  rules?: BackendRule[];
};

const DEFAULT_LEVEL_DEFINITIONS: LevelDefinitionItem[] = [
  { id: 'level-l1', code: 'L1', name: '公开级', description: '公开传播不会造成风险，可直接对外提供。', color: '#f5222d', isSensitive: false, needMask: false, needEncrypt: false, note: '公共资料、公开说明文档、匿名统计结果。' },
  { id: 'level-l2', code: 'L2', name: '内部级', description: '企业内部通用数据，需限制外部传播。', color: '#fa8c16', isSensitive: false, needMask: true, needEncrypt: false, note: '联系方式、基础业务字段、内部分析标签。' },
  { id: 'level-l3', code: 'L3', name: '敏感级', description: '涉及个人权益或业务安全，需严格控制访问。', color: '#fadb14', isSensitive: true, needMask: true, needEncrypt: true, note: '身份信息、金融账号、地理轨迹、医疗信息。' },
  { id: 'level-l4', code: 'L4', name: '高敏级', description: '泄露会引发严重合规或业务风险，应最小化暴露。', color: '#52c41a', isSensitive: true, needMask: true, needEncrypt: true, note: '认证凭证、生物识别模板、核心风控变量。' },
  { id: 'level-l5', code: 'L5', name: '监管级', description: '受监管要求约束，需审计留痕并实施更高管控。', color: '#13c2c2', isSensitive: true, needMask: true, needEncrypt: true, note: '跨境管控字段、监管报送数据、特定行业核心数据。' },
];

const LEVEL_NAME_MAP: Record<string, string> = { L1: '公开级', L2: '内部级', L3: '敏感级', L4: '高敏级', L5: '监管级' };
const RULE_MATCH_MODE_LABEL_MAP: Record<RuleMatchMode, string> = { any: '任一满足', all: '全部满足' };
const RULE_MATCH_TARGET_LABEL_MAP: Record<RuleMatchTarget, string> = { fieldName: '字段名', fieldComment: '字段注释', fieldType: '字段类型', tableName: '表名', tableComment: '表注释', sampleData: '样本数据' };
const RULE_MATCHER_LABEL_MAP: Record<RuleMatcher, string> = { regex: '正则匹配', equals: '等于', contains: '包含', prefix: '前缀匹配', suffix: '后缀匹配', enumContains: '枚举包含' };
const statusMap: Record<BackendTemplate['status'], TemplateStatus> = { ACTIVE: 'active', INACTIVE: 'inactive', DRAFT: 'draft' };
const reverseStatusMap: Record<TemplateStatus, BackendTemplate['status']> = { active: 'ACTIVE', inactive: 'INACTIVE', draft: 'DRAFT' };

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeColor = (color?: string | null, levelCode?: string) => {
  if (color && LEVEL_COLOR_PRESET_OPTIONS.some((item) => item.value === color.trim())) return color.trim();
  if (levelCode === 'L1') return '#52c41a';
  if (levelCode === 'L2') return '#1677ff';
  if (levelCode === 'L3') return '#fa8c16';
  if (levelCode === 'L4') return '#f5222d';
  if (levelCode === 'L5') return '#722ed1';
  return '#1677ff';
};

const buildTree = (categories: BackendCategory[], dataTypes: BackendDataType[], levels: BackendLevelDefinition[]): CategoryNode[] => {
  const rulesByDataType = new Map<string, BackendRule[]>();
  dataTypes.forEach((item) => {
    rulesByDataType.set(item.id, [...(item.rules ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
  });

  const categoryMap = new Map<string, CategoryNode>();
  categories.forEach((category) => {
    categoryMap.set(category.id, {
      id: category.id,
      name: category.name,
      children: [],
      dataTypes: [],
    });
  });

  dataTypes.forEach((dataType) => {
    const categoryNode = categoryMap.get(dataType.categoryId);
    if (!categoryNode) return;
    const level = levels.find((item) => item.id === dataType.levelDefinitionId) ?? levels.find((item) => item.code === 'L2');
    categoryNode.dataTypes = [
      ...(categoryNode.dataTypes ?? []),
      {
        id: dataType.id,
        name: dataType.name,
        levelCode: level?.code ?? 'L2',
        levelName: level?.name ?? LEVEL_NAME_MAP.L2,
        isSensitive: dataType.isSensitive,
        needMask: dataType.needMask,
        needEncrypt: dataType.needEncrypt,
        ruleConfig: {
          matchMode: 'any',
          conditions: (rulesByDataType.get(dataType.id) ?? []).map((rule) => ({
            id: rule.id,
            target: (rule.target || 'fieldName') as RuleMatchTarget,
            matcher: (rule.matcher || 'regex') as RuleMatcher,
            value: rule.value,
            hitRate: rule.hitRate == null ? null : Number(rule.hitRate),
          })),
        },
      },
    ];
  });

  const roots: CategoryNode[] = [];
  categories
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .forEach((category) => {
      const node = categoryMap.get(category.id)!;
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId);
        if (parent) {
          parent.children = [...(parent.children ?? []), node];
          return;
        }
      }
      roots.push(node);
    });

  return roots;
};

const countRulesInCategories = (nodes: CategoryNode[]): number =>
  nodes.reduce((total, node) => {
    const dataTypeRules = (node.dataTypes ?? []).reduce((ruleTotal, dataType) => ruleTotal + dataType.ruleConfig.conditions.filter((condition) => condition.value.trim()).length, 0);
    return total + dataTypeRules + countRulesInCategories(node.children ?? []);
  }, 0);

const mapTemplateRecord = (item: BackendTemplate): ClassificationTemplateRecord => {
  const levelDefinitions = (item.levelDefinitions ?? []).map((level) => ({
    id: level.id,
    code: level.code,
    name: level.name,
    description: level.description ?? '',
    color: normalizeColor(level.color, level.code),
    isSensitive: level.isSensitive,
    needMask: level.needMask,
    needEncrypt: level.needEncrypt,
    note: level.note ?? '',
  }));

  const normalizedLevels = levelDefinitions.length ? levelDefinitions : STANDARD_DEFAULT_LEVEL_DEFINITIONS;

  return {
    id: item.id,
    templateName: item.templateName,
    status: statusMap[item.status],
    templateType: item.templateType ?? '自定义模板',
    creator: '当前用户',
    createdAt: formatBeijingDateTime(item.createdAt),
    updatedAt: formatBeijingDateTime(item.updatedAt),
    description: item.description ?? '',
    categories: buildTree(item.categories ?? [], item.dataTypes ?? [], item.levelDefinitions ?? []),
    levelDefinitions: normalizedLevels,
  };
};

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

const fetchTemplates = async (): Promise<ClassificationTemplateRecord[]> => {
  const data = await request<BackendTemplate[]>('/api/classification-templates');
  return data.map(mapTemplateRecord);
};

export const getDefaultLevelDefinitions = (): LevelDefinitionItem[] => JSON.parse(JSON.stringify(STANDARD_DEFAULT_LEVEL_DEFINITIONS));
export const getLevelNameByCode = (levelCode: LevelCode): string => STANDARD_LEVEL_NAME_MAP[levelCode] ?? levelCode;
export const getRuleMatchModeLabel = (matchMode: RuleMatchMode): string => RULE_MATCH_MODE_LABEL_MAP[matchMode];
export const getRuleMatchTargetLabel = (target: RuleMatchTarget): string => RULE_MATCH_TARGET_LABEL_MAP[target];
export const getRuleMatcherLabel = (matcher: RuleMatcher): string => RULE_MATCHER_LABEL_MAP[matcher];
export const createEmptyRuleConfig = (): RuleConfig => ({ matchMode: 'any', conditions: [] });
export const createDefaultRuleCondition = (): RuleCondition => ({ id: createId('rule'), target: 'sampleData', matcher: 'regex', value: '', hitRate: 100 });
export const formatRuleSummary = (ruleConfig?: RuleConfig): string => {
  const conditions = ruleConfig?.conditions.filter((item) => item.value.trim()) ?? [];
  if (!conditions.length) return '';
  const prefix = getRuleMatchModeLabel(ruleConfig?.matchMode === 'all' ? 'all' : 'any');
  const content = conditions
    .map(
      (condition) =>
        `${getRuleMatchTargetLabel(condition.target)}${getRuleMatcherLabel(condition.matcher)}${condition.value}${
          condition.target === 'sampleData'
            ? `（样本命中率≥${condition.hitRate ?? 100}%）`
            : ''
        }`,
    )
    .join('；');
  return `${prefix}：${content}`;
};
export const countCategoryNodes = (nodes: CategoryNode[]): number => nodes.reduce((total, node) => total + 1 + countCategoryNodes(node.children ?? []), 0);
export const findCategoryById = (nodes: CategoryNode[], categoryId: string): CategoryNode | undefined => {
  for (const node of nodes) {
    if (node.id === categoryId) return node;
    const matchedChild = findCategoryById(node.children ?? [], categoryId);
    if (matchedChild) return matchedChild;
  }
  return undefined;
};
export const collectDataTypes = (node: CategoryNode): DataTypeItem[] => [...(node.dataTypes ?? []), ...(node.children ?? []).flatMap((child) => collectDataTypes(child))];

export const listClassificationTemplates = async (): Promise<ClassificationTemplateSummary[]> => (await fetchTemplates()).map(mapTemplateSummary);

export const listClassificationTemplateRecords = async (): Promise<ClassificationTemplateRecord[]> =>
  fetchTemplates();

export const getClassificationTemplateById = async (templateId: string): Promise<ClassificationTemplateRecord | null> => {
  const data = await request<BackendTemplate>(`/api/classification-templates/${templateId}`);
  return data ? mapTemplateRecord(data) : null;
};

export const createClassificationTemplate = async (values: TemplateFormValues): Promise<ClassificationTemplateRecord> => {
  const created = await request<BackendTemplate>('/api/classification-templates', {
    method: 'POST',
    data: {
      templateName: values.templateName.trim(),
      status: reverseStatusMap[values.status],
      templateType: '自定义模板',
      description: values.description.trim(),
    },
  });
  return mapTemplateRecord(created);
};

export const updateClassificationTemplate = async (templateId: string, values: TemplateFormValues): Promise<ClassificationTemplateRecord | null> => {
  const updated = await request<BackendTemplate>(`/api/classification-templates/${templateId}`, {
    method: 'PATCH',
    data: {
      templateName: values.templateName.trim(),
      status: reverseStatusMap[values.status],
      description: values.description.trim(),
    },
  });
  return mapTemplateRecord(updated);
};

export const updateClassificationTemplateStatus = async (templateId: string, status: Exclude<TemplateStatus, 'draft'>): Promise<ClassificationTemplateRecord | null> => {
  const template = await getClassificationTemplateById(templateId);
  if (!template) return null;
  return updateClassificationTemplate(templateId, { templateName: template.templateName, status, description: template.description });
};

export const duplicateClassificationTemplate = async (templateId: string): Promise<ClassificationTemplateRecord | null> => {
  const template = await getClassificationTemplateById(templateId);
  if (!template) return null;
  return createClassificationTemplate({ templateName: `${template.templateName} - 副本`, status: 'draft', description: template.description });
};

export const deleteClassificationTemplate = async (templateId: string): Promise<boolean> => {
  await request(`/api/classification-templates/${templateId}`, { method: 'DELETE' });
  return true;
};

export const initializeClassificationTemplate = async (templateId: string): Promise<ClassificationTemplateRecord | null> => {
  const data = await request<BackendTemplate>(`/api/classification-templates/${templateId}/initialize`, {
    method: 'POST',
  });
  return data ? mapTemplateRecord(data) : null;
};

export const addClassificationLevelDefinition = async (templateId: string, values: LevelDefinitionFormValues): Promise<ClassificationTemplateRecord | null> => {
  await request('/api/classification-template-details/level-definitions', {
    method: 'POST',
    data: {
      templateId,
      code: values.code.trim(),
      name: values.name.trim(),
      description: values.description.trim(),
      color: normalizeColor(values.color, values.code.trim()),
      isSensitive: values.isSensitive,
      needMask: values.needMask,
      needEncrypt: values.needEncrypt,
      note: values.note.trim(),
    },
  });
  return getClassificationTemplateById(templateId);
};

export const updateClassificationLevelDefinition = async (templateId: string, levelId: string, values: LevelDefinitionFormValues): Promise<ClassificationTemplateRecord | null> => {
  await request(`/api/classification-template-details/level-definitions/${levelId}`, {
    method: 'PATCH',
    data: {
      templateId,
      code: values.code.trim(),
      name: values.name.trim(),
      description: values.description.trim(),
      color: normalizeColor(values.color, values.code.trim()),
      isSensitive: values.isSensitive,
      needMask: values.needMask,
      needEncrypt: values.needEncrypt,
      note: values.note.trim(),
    },
  });
  return getClassificationTemplateById(templateId);
};

export const deleteClassificationLevelDefinition = async (templateId: string, levelId: string): Promise<ClassificationTemplateRecord | null> => {
  await request(`/api/classification-template-details/level-definitions/${levelId}`, { method: 'DELETE' });
  return getClassificationTemplateById(templateId);
};

export const addClassificationCategory = async (templateId: string, values: CategoryFormValues, parentId: string | null = null): Promise<ClassificationTemplateRecord | null> => {
  await request('/api/classification-template-details/categories', {
    method: 'POST',
    data: {
      templateId,
      name: values.name.trim(),
      parentId,
      sortOrder: 0,
    },
  });
  return getClassificationTemplateById(templateId);
};

export const updateClassificationCategory = async (templateId: string, categoryId: string, values: CategoryFormValues): Promise<ClassificationTemplateRecord | null> => {
  await request(`/api/classification-template-details/categories/${categoryId}`, {
    method: 'PATCH',
    data: { name: values.name.trim() },
  });
  return getClassificationTemplateById(templateId);
};

export const deleteClassificationCategory = async (templateId: string, categoryId: string): Promise<ClassificationTemplateRecord | null> => {
  await request(`/api/classification-template-details/categories/${categoryId}`, { method: 'DELETE' });
  return getClassificationTemplateById(templateId);
};

export const addClassificationDataType = async (templateId: string, categoryId: string, values: DataTypeFormValues): Promise<ClassificationTemplateRecord | null> => {
  const template = await getClassificationTemplateById(templateId);
  const level = template?.levelDefinitions.find((item) => item.code === values.levelCode);
  await request('/api/classification-template-details/data-types', {
    method: 'POST',
    data: {
      templateId,
      categoryId,
      levelDefinitionId: level?.id,
      name: values.name.trim(),
      isSensitive: values.isSensitive,
      needMask: values.needMask,
      needEncrypt: values.needEncrypt,
    },
  });
  return getClassificationTemplateById(templateId);
};

export const updateClassificationDataType = async (templateId: string, dataTypeId: string, values: DataTypeFormValues): Promise<ClassificationTemplateRecord | null> => {
  const template = await getClassificationTemplateById(templateId);
  const level = template?.levelDefinitions.find((item) => item.code === values.levelCode);
  await request(`/api/classification-template-details/data-types/${dataTypeId}`, {
    method: 'PATCH',
    data: {
      levelDefinitionId: level?.id,
      name: values.name.trim(),
      isSensitive: values.isSensitive,
      needMask: values.needMask,
      needEncrypt: values.needEncrypt,
    },
  });
      const refreshed = await getClassificationTemplateById(templateId);
    if (!refreshed) return null;
    return updateDataTypeRuleConfig(templateId, dataTypeId, values.ruleConfig);
};

export const deleteClassificationDataType = async (templateId: string, dataTypeId: string): Promise<ClassificationTemplateRecord | null> => {
  await request(`/api/classification-template-details/data-types/${dataTypeId}`, { method: 'DELETE' });
  return getClassificationTemplateById(templateId);
};


const updateDataTypeRuleConfig = async (templateId: string, dataTypeId: string, ruleConfig: RuleConfig) => {
  const template = await getClassificationTemplateById(templateId);
  if (!template) return null;

  const existingDataType = template.categories
    .flatMap((category) => collectDataTypes(category))
    .find((item) => item.id === dataTypeId);
  if (!existingDataType) return getClassificationTemplateById(templateId);

  const currentRules = existingDataType.ruleConfig.conditions ?? [];
  const nextRules = ruleConfig.conditions ?? [];

  const currentIds = new Set(currentRules.map((item) => item.id).filter(Boolean));
  const nextIds = new Set(nextRules.map((item) => item.id).filter(Boolean));

  for (const rule of currentRules) {
    if (rule.id && !nextIds.has(rule.id)) {
      await request(`/api/classification-template-details/rules/${rule.id}`, {
        method: 'DELETE',
      });
    }
  }

  for (const [index, rule] of nextRules.entries()) {
    const payload = {
      dataTypeId,
      target: rule.target,
      matcher: rule.matcher,
      value: rule.value.trim(),
      hitRate: rule.target === 'sampleData' ? Number(rule.hitRate ?? 100) : undefined,
      sortOrder: index,
    };

    if (rule.id && currentIds.has(rule.id)) {
      await request(`/api/classification-template-details/rules/${rule.id}`, {
        method: 'PATCH',
        data: payload,
      });
    } else {
      await request('/api/classification-template-details/rules', {
        method: 'POST',
        data: payload,
      });
    }
  }

  return getClassificationTemplateById(templateId);
};

export const resetClassificationTemplateStore = async () => listClassificationTemplates();
