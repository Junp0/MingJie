import {
  evaluateClassificationRule,
  evaluateClassificationRules,
  matchClassificationRuleValue,
} from './classification-rule-matcher';

describe('matchClassificationRuleValue', () => {
  it('matches complete identifier terms', () => {
    expect(
      matchClassificationRuleValue(
        'customer_profile_label',
        'contains',
        'profile_label',
      ),
    ).toBe(true);
    expect(
      matchClassificationRuleValue('mobile_phone', 'contains', 'phone'),
    ).toBe(true);
  });

  it('does not match partial English identifier terms', () => {
    expect(matchClassificationRuleValue('stage_flag', 'contains', 'tag')).toBe(
      false,
    );
    expect(matchClassificationRuleValue('email', 'contains', 'mail')).toBe(
      false,
    );
  });

  it('keeps natural-language substring matching', () => {
    expect(
      matchClassificationRuleValue('客户身份证号码', 'contains', '身份证'),
    ).toBe(true);
  });

  it('does not assign hit rates to metadata rules', () => {
    expect(
      evaluateClassificationRule(
        {
          fieldName: 'customer_id',
          fieldType: 'bigint',
          tableName: 'customers',
        },
        {
          target: 'fieldName',
          matcher: 'contains',
          value: 'customer_id',
        },
      ),
    ).toMatchObject({ matched: true, hitRate: null });
  });

  it('uses sample match percentage for data content rules', () => {
    const target = {
      fieldName: 'contact_value',
      fieldType: 'varchar',
      tableName: 'contacts',
      sampleData: ['13800138000', '13900139000', 'invalid'],
    };
    const rule = {
      target: 'sampleData',
      matcher: 'regex',
      value: '^1[3-9]\\d{9}$',
      hitRate: 60,
    };

    const evaluation = evaluateClassificationRule(target, rule);
    expect(evaluation.matched).toBe(true);
    expect(evaluation.hitRate).toBeCloseTo(200 / 3);
    expect(
      evaluateClassificationRule(target, { ...rule, hitRate: 80 }).matched,
    ).toBe(false);
  });

  it('uses metadata only as a tie-breaker after content matching', () => {
    const target = {
      fieldName: 'trade_no',
      fieldType: 'varchar',
      tableName: 'payments',
      sampleData: ['TRADE202603280001', 'TRADE202603280002'],
    };
    const matchingRules = [
      {
        target: 'sampleData',
        matcher: 'regex',
        value: '^TRADE\\d{12}$',
        hitRate: 80,
      },
      {
        target: 'fieldName',
        matcher: 'equals',
        value: 'trade_no',
      },
    ];
    const metadataOnlyRules = [
      {
        target: 'fieldName',
        matcher: 'equals',
        value: 'trade_no',
      },
    ];

    expect(
      evaluateClassificationRules(target, matchingRules).score,
    ).toBeGreaterThan(
      evaluateClassificationRules(target, metadataOnlyRules).score,
    );
    expect(evaluateClassificationRules(target, matchingRules).hitRate).toBe(
      100,
    );
  });
});
