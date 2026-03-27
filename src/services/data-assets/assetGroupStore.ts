// 资产分组的本地仓库。当前使用 localStorage，后续接入后端时只需要替换这些方法。

export type AssetGroupStatus = 'active' | 'inactive' | 'archived';

export interface AssetGroup {
  id: string;
  name: string;
  parentId: string | null;
  level: number;
  description: string;
  owner: string;
  department: string;
  status: AssetGroupStatus;
  createTime: string;
  updateTime: string;
  databaseCount: number;
  tableCount: number;
  fieldCount: number;
}

export interface AssetGroupFormValues {
  name: string;
  description: string;
  owner: string;
  department: string;
  status: AssetGroupStatus;
}

const STORAGE_KEY = 'asset-group-store-v1';

let memoryStore: AssetGroup[] | null = null;

const deepCopy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

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

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const INITIAL_GROUPS: AssetGroup[] = [
  {
    id: 'user-domain',
    name: '用户数据域',
    parentId: null,
    level: 1,
    description: '统一承载用户身份、画像、行为与账户基础信息的一级分组。',
    owner: '张三',
    department: '数据平台部',
    status: 'active',
    createTime: '2025-03-15 10:00:00',
    updateTime: '2026-03-18 16:20:00',
    databaseCount: 3,
    tableCount: 28,
    fieldCount: 462,
  },
  {
    id: 'user-identity',
    name: '用户身份组',
    parentId: 'user-domain',
    level: 2,
    description: '用户实名、证件、联系信息相关资产。',
    owner: '李四',
    department: '数据平台部',
    status: 'active',
    createTime: '2025-04-03 11:20:00',
    updateTime: '2026-03-19 10:30:00',
    databaseCount: 1,
    tableCount: 9,
    fieldCount: 136,
  },
  {
    id: 'user-account',
    name: '用户账户组',
    parentId: 'user-domain',
    level: 2,
    description: '账户注册、登录、认证与绑定关系数据。',
    owner: '王五',
    department: '账号中台部',
    status: 'active',
    createTime: '2025-04-10 14:10:00',
    updateTime: '2026-03-19 09:12:00',
    databaseCount: 1,
    tableCount: 7,
    fieldCount: 98,
  },
  {
    id: 'user-behavior',
    name: '用户行为组',
    parentId: 'user-domain',
    level: 2,
    description: '行为埋点、访问日志、用户偏好与活跃数据。',
    owner: '赵六',
    department: '增长分析部',
    status: 'active',
    createTime: '2025-04-18 09:50:00',
    updateTime: '2026-03-20 13:45:00',
    databaseCount: 1,
    tableCount: 12,
    fieldCount: 228,
  },
  {
    id: 'user-login-audit',
    name: '登录审计组',
    parentId: 'user-behavior',
    level: 3,
    description: '登录行为、设备指纹、风控审计链路数据。',
    owner: '孙七',
    department: '安全风控部',
    status: 'active',
    createTime: '2025-05-06 15:00:00',
    updateTime: '2026-03-20 17:40:00',
    databaseCount: 1,
    tableCount: 4,
    fieldCount: 84,
  },
  {
    id: 'user-profile-tag',
    name: '画像标签组',
    parentId: 'user-behavior',
    level: 3,
    description: '用户标签、画像快照和推荐偏好聚合结果。',
    owner: '周八',
    department: '增长分析部',
    status: 'active',
    createTime: '2025-05-08 13:40:00',
    updateTime: '2026-03-20 11:55:00',
    databaseCount: 1,
    tableCount: 3,
    fieldCount: 57,
  },
  {
    id: 'trade-domain',
    name: '交易经营域',
    parentId: null,
    level: 1,
    description: '覆盖订单、支付、履约和结算的业务资产分组。',
    owner: '吴九',
    department: '交易平台部',
    status: 'active',
    createTime: '2025-03-20 16:00:00',
    updateTime: '2026-03-18 18:00:00',
    databaseCount: 4,
    tableCount: 36,
    fieldCount: 518,
  },
  {
    id: 'trade-order',
    name: '订单履约组',
    parentId: 'trade-domain',
    level: 2,
    description: '订单主链路、履约状态、物流节点数据。',
    owner: '郑十',
    department: '交易平台部',
    status: 'active',
    createTime: '2025-04-12 10:10:00',
    updateTime: '2026-03-18 17:05:00',
    databaseCount: 2,
    tableCount: 16,
    fieldCount: 235,
  },
  {
    id: 'trade-payment',
    name: '支付结算组',
    parentId: 'trade-domain',
    level: 2,
    description: '支付流水、退款、对账和结算明细数据。',
    owner: '钱十一',
    department: '财务科技部',
    status: 'active',
    createTime: '2025-04-18 11:25:00',
    updateTime: '2026-03-17 20:18:00',
    databaseCount: 2,
    tableCount: 14,
    fieldCount: 211,
  },
  {
    id: 'trade-billing',
    name: '账单汇总组',
    parentId: 'trade-payment',
    level: 3,
    description: '账单汇总口径、日清月结与经营报表底表数据。',
    owner: '冯十二',
    department: '财务科技部',
    status: 'inactive',
    createTime: '2025-05-11 09:45:00',
    updateTime: '2026-03-16 19:15:00',
    databaseCount: 1,
    tableCount: 5,
    fieldCount: 72,
  },
  {
    id: 'infra-domain',
    name: '基础设施域',
    parentId: null,
    level: 1,
    description: '面向平台运行、配置中心、日志与监控资产的分组。',
    owner: '褚十三',
    department: '基础架构部',
    status: 'active',
    createTime: '2025-03-25 08:30:00',
    updateTime: '2026-03-15 12:40:00',
    databaseCount: 2,
    tableCount: 18,
    fieldCount: 194,
  },
  {
    id: 'infra-log',
    name: '日志监控组',
    parentId: 'infra-domain',
    level: 2,
    description: '平台日志、链路追踪、监控指标与告警配置数据。',
    owner: '卫十四',
    department: '基础架构部',
    status: 'active',
    createTime: '2025-04-22 13:15:00',
    updateTime: '2026-03-15 18:30:00',
    databaseCount: 1,
    tableCount: 11,
    fieldCount: 124,
  },
  {
    id: 'infra-config',
    name: '配置中心组',
    parentId: 'infra-domain',
    level: 2,
    description: '应用配置、发布策略、租户隔离配置等资产。',
    owner: '蒋十五',
    department: '基础架构部',
    status: 'archived',
    createTime: '2025-04-25 16:20:00',
    updateTime: '2026-03-12 11:42:00',
    databaseCount: 1,
    tableCount: 7,
    fieldCount: 70,
  },
];

const readStore = (): AssetGroup[] => {
  if (typeof window === 'undefined') {
    if (!memoryStore) {
      memoryStore = deepCopy(INITIAL_GROUPS);
    }
    return deepCopy(memoryStore);
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_GROUPS));
    return deepCopy(INITIAL_GROUPS);
  }

  try {
    return deepCopy(JSON.parse(raw) as AssetGroup[]);
  } catch (error) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_GROUPS));
    return deepCopy(INITIAL_GROUPS);
  }
};

const writeStore = (groups: AssetGroup[]) => {
  if (typeof window === 'undefined') {
    memoryStore = deepCopy(groups);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
};

export const listAssetGroups = (): AssetGroup[] =>
  readStore().sort((left, right) => left.name.localeCompare(right.name, 'zh-Hans-CN'));

export const saveAssetGroups = (groups: AssetGroup[]): AssetGroup[] => {
  writeStore(groups);
  return deepCopy(groups);
};

export const resetAssetGroups = (): AssetGroup[] => {
  writeStore(INITIAL_GROUPS);
  return deepCopy(INITIAL_GROUPS);
};

export const getAssetGroupById = (groupId: string): AssetGroup | null => {
  const group = readStore().find((item) => item.id === groupId);
  return group ? deepCopy(group) : null;
};

export const createAssetGroup = (
  values: AssetGroupFormValues,
  parent: AssetGroup | null,
): AssetGroup => ({
  id: createId('group'),
  name: values.name.trim(),
  parentId: parent?.id ?? null,
  level: parent ? parent.level + 1 : 1,
  description: values.description.trim(),
  owner: values.owner.trim(),
  department: values.department,
  status: values.status,
  createTime: getNowText(),
  updateTime: getNowText(),
  databaseCount: 0,
  tableCount: 0,
  fieldCount: 0,
});

export const getAssetGroupPathNames = (groups: AssetGroup[], groupId: string): string[] => {
  const map = new Map(groups.map((group) => [group.id, group]));
  const names: string[] = [];
  let current = map.get(groupId) ?? null;

  while (current) {
    names.unshift(current.name);
    current = current.parentId ? map.get(current.parentId) ?? null : null;
  }

  return names;
};

export const listAssetGroupSelectOptions = (): Array<{ value: string; label: string }> => {
  const groups = listAssetGroups();
  return groups
    .filter((group) => group.status !== 'archived')
    .map((group) => ({
      value: group.id,
      label: getAssetGroupPathNames(groups, group.id).join(' / '),
    }));
};
