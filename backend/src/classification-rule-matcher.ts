const splitExpectedValues = (expected: string) =>
  expected
    .toLowerCase()
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const containsExpectedValue = (value: string, expected: string) => {
  if (!/^[a-z0-9_]+$/i.test(expected)) {
    return value.includes(expected);
  }

  return new RegExp(
    `(^|[^a-z0-9])${escapeRegExp(expected)}($|[^a-z0-9])`,
    'i',
  ).test(value);
};

export const matchClassificationRuleValue = (
  value: string,
  matcher: string,
  expected: string,
) => {
  const normalizedValue = value.toLowerCase();
  const normalizedExpected = expected.toLowerCase();

  switch (matcher) {
    case 'equals':
      return normalizedValue === normalizedExpected;
    case 'contains':
    case 'enumContains':
      return splitExpectedValues(expected).some((item) =>
        containsExpectedValue(normalizedValue, item),
      );
    case 'prefix':
      return normalizedValue.startsWith(normalizedExpected);
    case 'suffix':
      return normalizedValue.endsWith(normalizedExpected);
    case 'regex':
      try {
        return new RegExp(expected, 'i').test(value);
      } catch {
        return false;
      }
    default:
      return false;
  }
};

export type ClassificationRuleInput = {
  target: string;
  matcher: string;
  value: string;
  hitRate?: number | null;
};

export type ClassificationRuleTarget = {
  fieldName: string;
  fieldComment?: string | null;
  fieldType: string;
  tableName: string;
  tableComment?: string | null;
  sampleData?: string[];
};

const metadataMatcherWeight: Record<string, number> = {
  equals: 300,
  prefix: 260,
  suffix: 260,
  contains: 240,
  enumContains: 240,
  regex: 220,
};

const metadataTargetWeight: Record<string, number> = {
  fieldType: 260,
  fieldName: 200,
  fieldComment: 180,
  tableName: 50,
  tableComment: 40,
};

const getMetadataValue = (
  target: ClassificationRuleTarget,
  ruleTarget: string,
) => {
  if (ruleTarget === 'fieldComment') return target.fieldComment ?? '';
  if (ruleTarget === 'fieldType') return target.fieldType;
  if (ruleTarget === 'tableName') return target.tableName;
  if (ruleTarget === 'tableComment') return target.tableComment ?? '';
  return target.fieldName;
};

const getMatchedSpecificity = (
  value: string,
  matcher: string,
  expected: string,
) => {
  if (matcher === 'contains' || matcher === 'enumContains') {
    return splitExpectedValues(expected)
      .filter((item) => containsExpectedValue(value.toLowerCase(), item))
      .reduce((longest, item) => Math.max(longest, item.length), 0);
  }
  if (matcher === 'regex') return 0;
  return expected.trim().length;
};

export const evaluateClassificationRule = (
  target: ClassificationRuleTarget,
  rule: ClassificationRuleInput,
) => {
  if (rule.target === 'sampleData') {
    const samples = (target.sampleData ?? [])
      .map((sample) => sample.trim())
      .filter(Boolean);
    const matchedCount = samples.filter((sample) =>
      matchClassificationRuleValue(sample, rule.matcher, rule.value),
    ).length;
    const hitRate = samples.length ? (matchedCount / samples.length) * 100 : 0;
    const threshold = Number(rule.hitRate ?? 100);
    const matched = samples.length > 0 && hitRate >= threshold;
    return {
      matched,
      score: matched ? 2000 + hitRate : 0,
      hitRate,
    };
  }

  const value = getMetadataValue(target, rule.target);
  const matched = matchClassificationRuleValue(value, rule.matcher, rule.value);
  const specificity = Math.min(
    100,
    getMatchedSpecificity(value, rule.matcher, rule.value),
  );
  return {
    matched,
    score: matched
      ? 1000 +
        (metadataMatcherWeight[rule.matcher] ?? 0) +
        (metadataTargetWeight[rule.target] ?? 0) +
        specificity
      : 0,
    hitRate: null,
  };
};

export const evaluateClassificationRules = (
  target: ClassificationRuleTarget,
  rules: ClassificationRuleInput[],
) => {
  const evaluations = rules.map((rule) => ({
    rule,
    evaluation: evaluateClassificationRule(target, rule),
  }));
  const bestContent = evaluations
    .filter(({ rule }) => rule.target === 'sampleData')
    .reduce(
      (best, current) =>
        current.evaluation.score > best.score ? current.evaluation : best,
      { matched: false, score: 0, hitRate: null as number | null },
    );
  const bestMetadata = evaluations
    .filter(({ rule }) => rule.target !== 'sampleData')
    .reduce(
      (best, current) =>
        current.evaluation.score > best.score ? current.evaluation : best,
      { matched: false, score: 0, hitRate: null as number | null },
    );

  if (bestContent.score > 0) {
    return {
      ...bestContent,
      score: bestContent.score + bestMetadata.score / 10_000,
    };
  }

  return bestMetadata;
};
