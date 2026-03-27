// 自动扫描数据资产的本地仓库。包含扫描规则与扫描结果，方便页面直接模拟完整流程。

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

interface AutoScanStoreState {
  rules: AutoScanRule[];
  results: AutoScanResult[];
}

const STORAGE_KEY = 'data-asset-auto-scan-store-v2';

let memoryStore: AutoScanStoreState | null = null;

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

const parseDateTime = (value: string) => {
  const [datePart, timePart = '00:00:00'] = value.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute, second] = timePart.split(':').map(Number);
  return new Date(year, (month || 1) - 1, day || 1, hour || 0, minute || 0, second || 0);
};

const getScheduleLabel = (
  scheduleMode: AutoScanScheduleMode,
  firstScanTime: string,
) => {
  const date = parseDateTime(firstScanTime);
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const day = date.getDate();
  const weekday = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];

  switch (scheduleMode) {
    case 'daily':
      return `每天 ${hour}:${minute}`;
    case 'weekly':
      return `每周${weekday} ${hour}:${minute}`;
    case 'monthly':
      return `每月 ${day}日 ${hour}:${minute}`;
    default:
      return `每天 ${hour}:${minute}`;
  }
};

const buildSignature = (result: Pick<AutoScanResult, 'ipAddress' | 'port'>) =>
  `${result.ipAddress}:${result.port}`;

const INITIAL_RULES: AutoScanRule[] = [
  {
    id: 'scan-rule-1',
    ipRange: '10.23.16.0/24',
    portRange: '3306',
    scheduleMode: 'daily',
    firstScanTime: '2026-03-20 02:00:00',
    scheduleLabel: '每天 02:00',
    status: 'enabled',
    lastScanTime: '2026-03-27 02:00:00',
    hitCount: 2,
  },
  {
    id: 'scan-rule-2',
    ipRange: '10.23.40.0/24',
    portRange: '5432',
    scheduleMode: 'weekly',
    firstScanTime: '2026-03-23 01:30:00',
    scheduleLabel: '每周一 01:30',
    status: 'enabled',
    lastScanTime: '2026-03-25 01:30:00',
    hitCount: 1,
  },
  {
    id: 'scan-rule-3',
    ipRange: '172.16.8.0/24',
    portRange: '0',
    scheduleMode: 'monthly',
    firstScanTime: '2026-03-01 04:00:00',
    scheduleLabel: '每月 1日 04:00',
    status: 'disabled',
    lastScanTime: '2026-03-24 04:00:00',
    hitCount: 1,
  },
];

const INITIAL_RESULTS: AutoScanResult[] = [
  {
    id: 'scan-result-1',
    ipAddress: '10.23.16.18',
    port: 3306,
    databaseType: 'MySQL',
    matchedRuleId: 'scan-rule-1',
    discoveredAt: '2026-03-27 02:08:00',
    lastSeenAt: '2026-03-27 02:08:00',
    status: 'pending',
  },
  {
    id: 'scan-result-2',
    ipAddress: '10.23.16.42',
    port: 3306,
    databaseType: 'MySQL',
    matchedRuleId: 'scan-rule-1',
    discoveredAt: '2026-03-26 22:41:00',
    lastSeenAt: '2026-03-27 02:00:00',
    status: 'pending',
  },
  {
    id: 'scan-result-3',
    ipAddress: '10.23.40.21',
    port: 5432,
    databaseType: 'PostgreSQL',
    matchedRuleId: 'scan-rule-2',
    discoveredAt: '2026-03-25 01:36:00',
    lastSeenAt: '2026-03-25 01:36:00',
    status: 'ignored',
    ignoreReason: '测试归档实例，预计两周后下线。',
    ignoredAt: '2026-03-25 10:20:00',
  },
  {
    id: 'scan-result-4',
    ipAddress: '172.16.8.31',
    port: 8443,
    databaseType: '未知',
    matchedRuleId: 'scan-rule-3',
    discoveredAt: '2026-03-24 04:06:00',
    lastSeenAt: '2026-03-24 04:06:00',
    status: 'claimed',
    claimedAssetId: 'asset-api-1',
    claimedAssetName: 'billing_event_api',
    claimedAt: '2026-03-24 11:15:00',
  },
];

const EXECUTION_RESULT_TEMPLATES: Array<Omit<AutoScanResult, 'id' | 'discoveredAt' | 'lastSeenAt'>> = [
  {
    ipAddress: '10.23.16.66',
    port: 3306,
    databaseType: 'MySQL',
    matchedRuleId: 'scan-rule-1',
    status: 'pending',
  },
  {
    ipAddress: '10.23.40.33',
    port: 5432,
    databaseType: 'PostgreSQL',
    matchedRuleId: 'scan-rule-2',
    status: 'pending',
  },
  {
    ipAddress: '172.16.8.53',
    port: 443,
    databaseType: '未知',
    matchedRuleId: 'scan-rule-3',
    status: 'pending',
  },
];

const INITIAL_STATE: AutoScanStoreState = {
  rules: INITIAL_RULES,
  results: INITIAL_RESULTS,
};

const readStore = (): AutoScanStoreState => {
  if (typeof window === 'undefined') {
    if (!memoryStore) {
      memoryStore = deepCopy(INITIAL_STATE);
    }
    return deepCopy(memoryStore);
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_STATE));
    return deepCopy(INITIAL_STATE);
  }

  try {
    return deepCopy(JSON.parse(raw) as AutoScanStoreState);
  } catch (error) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_STATE));
    return deepCopy(INITIAL_STATE);
  }
};

const writeStore = (state: AutoScanStoreState) => {
  if (typeof window === 'undefined') {
    memoryStore = deepCopy(state);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const mutateStore = (
  updater: (state: AutoScanStoreState) => AutoScanStoreState,
): AutoScanStoreState => {
  const state = readStore();
  const nextState = updater(state);
  writeStore(nextState);
  return deepCopy(nextState);
};

export const listAutoScanRules = (): AutoScanRule[] =>
  readStore().rules.sort((left, right) => right.firstScanTime.localeCompare(left.firstScanTime));

export const listAutoScanResults = (): AutoScanResult[] =>
  readStore().results.sort((left, right) => right.discoveredAt.localeCompare(left.discoveredAt));

export const createAutoScanRule = (values: AutoScanRuleFormValues): AutoScanRule => {
  const rule: AutoScanRule = {
    id: createId('scan-rule'),
    ipRange: values.ipRange.trim(),
    portRange: values.portRange.trim(),
    scheduleMode: values.scheduleMode,
    firstScanTime: values.firstScanTime,
    scheduleLabel: values.scheduleLabel.trim(),
    status: values.status,
    lastScanTime: '',
    hitCount: 0,
  };

  mutateStore((state) => ({
    ...state,
    rules: [rule, ...state.rules],
  }));

  return deepCopy(rule);
};

export const updateAutoScanRule = (
  ruleId: string,
  values: AutoScanRuleFormValues,
): AutoScanRule | null => {
  let updatedRule: AutoScanRule | null = null;

  mutateStore((state) => ({
    ...state,
    rules: state.rules.map((rule) => {
      if (rule.id !== ruleId) {
        return rule;
      }

      updatedRule = {
        ...rule,
        ipRange: values.ipRange.trim(),
        portRange: values.portRange.trim(),
        scheduleMode: values.scheduleMode,
        firstScanTime: values.firstScanTime,
        scheduleLabel: values.scheduleLabel.trim(),
        status: values.status,
      };

      return updatedRule;
    }),
  }));

  return updatedRule ? deepCopy(updatedRule) : null;
};

export const buildAutoScanRuleFormValues = (
  values: Omit<AutoScanRuleFormValues, 'scheduleLabel'>,
): AutoScanRuleFormValues => ({
  ...values,
  scheduleLabel: getScheduleLabel(values.scheduleMode, values.firstScanTime),
});

export const toggleAutoScanRuleStatus = (
  ruleId: string,
  status: AutoScanRuleStatus,
): AutoScanRule | null => {
  let updatedRule: AutoScanRule | null = null;

  mutateStore((state) => ({
    ...state,
    rules: state.rules.map((rule) => {
      if (rule.id !== ruleId) {
        return rule;
      }

      updatedRule = {
        ...rule,
        status,
      };

      return updatedRule;
    }),
  }));

  return updatedRule ? deepCopy(updatedRule) : null;
};

export const executeAutoScan = (): {
  touchedRuleCount: number;
  createdResultCount: number;
  matchedResultCount: number;
} => {
  const now = getNowText();
  let touchedRuleCount = 0;
  let createdResultCount = 0;
  let matchedResultCount = 0;

  mutateStore((state) => {
    const activeRules = state.rules.filter((rule) => rule.status === 'enabled');
    touchedRuleCount = activeRules.length;

    const existingSignatures = new Set(state.results.map((item) => buildSignature(item)));
    let nextResults = [...state.results];

    activeRules.forEach((rule) => {
      const candidate = EXECUTION_RESULT_TEMPLATES.find(
        (item) =>
          item.matchedRuleId === rule.id &&
          !existingSignatures.has(buildSignature(item)),
      );

      if (candidate) {
        nextResults = [
          {
            ...candidate,
            id: createId('scan-result'),
            discoveredAt: now,
            lastSeenAt: now,
          },
          ...nextResults,
        ];
        existingSignatures.add(buildSignature(candidate));
        createdResultCount += 1;
      } else {
        nextResults = nextResults.map((result) =>
          result.matchedRuleId === rule.id && result.status !== 'claimed'
            ? { ...result, lastSeenAt: now }
            : result,
        );
      }
    });

    const nextRules = state.rules.map((rule) => {
      if (rule.status !== 'enabled') {
        return rule;
      }

      const currentHits = nextResults.filter(
        (result) => result.matchedRuleId === rule.id && result.status !== 'claimed',
      ).length;
      matchedResultCount += currentHits;

      return {
        ...rule,
        lastScanTime: now,
        hitCount: currentHits,
      };
    });

    return {
      rules: nextRules,
      results: nextResults,
    };
  });

  return {
    touchedRuleCount,
    createdResultCount,
    matchedResultCount,
  };
};

export const getAutoScanResultById = (resultId: string): AutoScanResult | null => {
  const record = readStore().results.find((item) => item.id === resultId);
  return record ? deepCopy(record) : null;
};

export const ignoreAutoScanResult = (
  resultId: string,
  reason: string,
): AutoScanResult | null => {
  let updatedResult: AutoScanResult | null = null;
  const now = getNowText();

  mutateStore((state) => ({
    ...state,
    results: state.results.map((result) => {
      if (result.id !== resultId) {
        return result;
      }

      updatedResult = {
        ...result,
        status: 'ignored',
        ignoreReason: reason.trim(),
        ignoredAt: now,
      };

      return updatedResult;
    }),
  }));

  return updatedResult ? deepCopy(updatedResult) : null;
};

export const cancelIgnoreAutoScanResult = (resultId: string): AutoScanResult | null => {
  let updatedResult: AutoScanResult | null = null;

  mutateStore((state) => ({
    ...state,
    results: state.results.map((result) => {
      if (result.id !== resultId) {
        return result;
      }

      updatedResult = {
        ...result,
        status: 'pending',
        ignoreReason: undefined,
        ignoredAt: undefined,
      };

      return updatedResult;
    }),
  }));

  return updatedResult ? deepCopy(updatedResult) : null;
};

export const claimAutoScanResult = (
  resultId: string,
  values: { assetId: string; assetName: string },
): AutoScanResult | null => {
  let updatedResult: AutoScanResult | null = null;
  const now = getNowText();

  mutateStore((state) => ({
    ...state,
    results: state.results.map((result) => {
      if (result.id !== resultId) {
        return result;
      }

      updatedResult = {
        ...result,
        status: 'claimed',
        claimedAssetId: values.assetId,
        claimedAssetName: values.assetName,
        claimedAt: now,
        ignoreReason: undefined,
        ignoredAt: undefined,
      };

      return updatedResult;
    }),
  }));

  return updatedResult ? deepCopy(updatedResult) : null;
};
