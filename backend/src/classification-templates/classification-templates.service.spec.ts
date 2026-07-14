import { ClassificationTemplatesService } from './classification-templates.service';
import { evaluateClassificationRule } from '../classification-rule-matcher';

describe('ClassificationTemplatesService default baseline', () => {
  const service = new ClassificationTemplatesService(
    null as never,
    null as never,
    null as never,
  );

  const getDefinitions = () => {
    const levels = service['buildDefaultLevels']();
    const categories = service['buildDefaultCategories']();
    const dataTypes = service['buildDefaultDataTypes']();
    return { levels, categories, dataTypes };
  };

  it('defaults L3 masking and encryption recommendations to false', () => {
    const { levels } = getDefinitions();
    const level = levels.find((item) => item.code === 'L3');

    expect(level).toMatchObject({
      isSensitive: true,
      needMask: false,
      needEncrypt: false,
    });
  });

  it('covers every leaf category with executable rules', () => {
    const { categories, dataTypes } = getDefinitions();
    const parentKeys = new Set(
      categories
        .map((category) => category.parentKey)
        .filter((key): key is string => Boolean(key)),
    );
    const leafKeys = categories
      .filter((category) => !parentKeys.has(category.key))
      .map((category) => category.key);
    const coveredKeys = new Set(
      dataTypes.map((dataType) => dataType.categoryKey),
    );

    expect(leafKeys.filter((key) => !coveredKeys.has(key))).toEqual([]);
    expect(dataTypes).toHaveLength(95);
    expect(
      dataTypes.reduce((total, dataType) => total + dataType.rules.length, 0),
    ).toBe(286);
    expect(
      dataTypes.every((dataType) =>
        dataType.rules.some((rule) => rule.target === 'sampleData'),
      ),
    ).toBe(true);
  });

  it('keeps category, level and rule references valid and unique', () => {
    const { levels, categories, dataTypes } = getDefinitions();
    const categoryKeys = new Set(categories.map((category) => category.key));
    const levelCodes = new Set(levels.map((level) => level.code));
    const dataTypeNames = dataTypes.map((dataType) => dataType.name);
    const supportedTargets = new Set([
      'fieldName',
      'fieldComment',
      'fieldType',
      'tableName',
      'tableComment',
      'sampleData',
    ]);
    const supportedMatchers = new Set([
      'regex',
      'equals',
      'contains',
      'prefix',
      'suffix',
      'enumContains',
    ]);

    expect(new Set(dataTypeNames).size).toBe(dataTypeNames.length);
    for (const dataType of dataTypes) {
      expect(categoryKeys.has(dataType.categoryKey)).toBe(true);
      expect(levelCodes.has(dataType.levelCode)).toBe(true);
      expect(dataType.rules.length).toBeGreaterThan(0);
      for (const rule of dataType.rules) {
        expect(supportedTargets.has(rule.target)).toBe(true);
        expect(supportedMatchers.has(rule.matcher)).toBe(true);
        expect(rule.value.trim()).not.toBe('');
        if (rule.target === 'sampleData') {
          expect(rule.matcher).toBe('regex');
          expect(rule.hitRate).toBeGreaterThanOrEqual(0);
          expect(rule.hitRate).toBeLessThanOrEqual(100);
          expect(() => new RegExp(rule.value, 'i')).not.toThrow();
        } else {
          expect(rule.hitRate).toBeUndefined();
        }
      }
    }
  });

  it('classifies distinctive content formats before metadata fallbacks', () => {
    const { dataTypes } = getDefinitions();
    const classifySamples = (
      sampleData: string[],
      fieldName = 'arbitrary_value',
      fieldType = 'varchar',
    ) =>
      dataTypes
        .map((dataType, index) => ({
          name: dataType.name,
          index,
          score: dataType.rules.reduce(
            (bestScore, rule) =>
              Math.max(
                bestScore,
                evaluateClassificationRule(
                  {
                    fieldName,
                    fieldType,
                    tableName: 'business_table',
                    sampleData,
                  },
                  rule,
                ).score,
              ),
            0,
          ),
        }))
        .filter((item) => item.score > 0)
        .sort(
          (left, right) => right.score - left.score || left.index - right.index,
        )[0]?.name;

    expect(classifySamples(['张三', '李明', '王芳'])).toBe('姓名');
    expect(classifySamples(['11010519491231002X', '440524188001010014'])).toBe(
      '身份证号',
    );
    expect(classifySamples(['13800138000', '13900139000'])).toBe('手机号');
    expect(classifySamples(['alice@example.com', 'bob@example.org'])).toBe(
      '电子邮箱',
    );
    expect(classifySamples(['6222020200000000', '6217000012345678901'])).toBe(
      '银行卡号',
    );
    expect(classifySamples(['10.1.2.3', '192.168.10.25'])).toBe('IP 地址');
    expect(
      classifySamples([
        'mysql://db.example.com:3306/main',
        'jdbc:mysql://db.example.com:3306/audit',
      ]),
    ).toBe('数据库连接地址');
    expect(
      classifySamples([
        'mysql://app:secret@db.example.com:3306/main',
        'postgresql://audit:secret@db.example.com:5432/audit',
      ]),
    ).toBe('数据库访问凭据');
    expect(classifySamples(['CVE-2025-12345', 'CWE-79'])).toBe('漏洞攻击信息');
    expect(classifySamples(['TRADE202603280001', 'TRADE202603280002'])).toBe(
      '交易流水号',
    );
  });

  it('classifies every formatted time value as the unified time type', () => {
    const { dataTypes } = getDefinitions();
    const classify = (sampleData: string[]) =>
      dataTypes
        .map((dataType, index) => ({
          name: dataType.name,
          index,
          score: dataType.rules.reduce(
            (bestScore, rule) =>
              Math.max(
                bestScore,
                evaluateClassificationRule(
                  {
                    fieldName: 'birth_date',
                    fieldType: 'varchar',
                    tableName: 'customer_profile',
                    sampleData,
                  },
                  rule,
                ).score,
              ),
            0,
          ),
        }))
        .filter((item) => item.score > 0)
        .sort(
          (left, right) => right.score - left.score || left.index - right.index,
        )[0]?.name;

    expect(classify(['1990-01-02', '1988-12-31'])).toBe('时间信息');
    expect(classify(['2026-07', '2026/08'])).toBe('时间信息');
    expect(classify(['12/28', '01/2030'])).toBe('时间信息');
    expect(classify(['2026-07-13 18:20:30', '2026-07-14T09:10:11Z'])).toBe(
      '时间信息',
    );
    expect(
      classify([
        'Sat Mar 28 2026 08:42:00 GMT+0000 (Coordinated Universal Time)',
        'Fri Mar 27 2026 21:15:00 GMT+0000 (Coordinated Universal Time)',
      ]),
    ).toBe('时间信息');
  });

  it('keeps ambiguous free-form samples unclassified', () => {
    const { dataTypes } = getDefinitions();
    const classify = (
      fieldName: string,
      fieldComment: string,
      sampleData: string[],
    ) =>
      dataTypes
        .map((dataType, index) => ({
          name: dataType.name,
          index,
          score: dataType.rules.reduce(
            (bestScore, rule) =>
              Math.max(
                bestScore,
                evaluateClassificationRule(
                  {
                    fieldName,
                    fieldComment,
                    fieldType: 'varchar(255)',
                    tableName: 'unclassified_misc_notes',
                    sampleData,
                  },
                  rule,
                ).score,
              ),
            0,
          ),
        }))
        .filter((item) => item.score > 0)
        .sort(
          (left, right) => right.score - left.score || left.index - right.index,
        )[0]?.name;

    expect(
      classify('case_label', '样例分组', ['mask-case-042']),
    ).toBeUndefined();
    expect(
      classify('misc_code', '杂项编码', ['MISC331000051']),
    ).toBeUndefined();
    expect(
      classify('owner_alias', '责任人别名', ['alias_0001']),
    ).toBeUndefined();
    expect(
      classify('stage_flag', '阶段标识', ['review', 'draft']),
    ).toBeUndefined();
    expect(
      classify('note_body', '内容', [
        '这是一条故意保留未分类字段的样例内容，用于验证展示行为。',
      ]),
    ).toBeUndefined();
  });

  it('does not equate high-sensitivity credentials with core data', () => {
    const { levels, dataTypes } = getDefinitions();
    const byName = new Map(
      dataTypes.map((dataType) => [dataType.name, dataType]),
    );

    expect(levels.find((level) => level.code === 'L4')?.name).toBe('重要数据');
    expect(byName.get('登录密码')?.levelCode).toBe('L4');
    expect(byName.get('私钥')?.levelCode).toBe('L4');
    expect(byName.get('生物识别模板')?.levelCode).toBe('L4');
    expect(byName.get('主密钥材料')?.levelCode).toBe('L5');
    expect(
      byName
        .get('主密钥材料')
        ?.rules.some((rule) => rule.value.includes('private_key')),
    ).toBe(false);
  });

  it('keeps split baseline types atomic and independently graded', () => {
    const { categories, dataTypes } = getDefinitions();
    const byName = new Map(
      dataTypes.map((dataType) => [dataType.name, dataType]),
    );
    const legacyMergedNames = [
      '护照与驾驶证',
      '访问令牌与密钥',
      '宗教民族与政治面貌',
      '车辆与行程信息',
      '供应商与采购明细',
      '考勤绩效与薪酬',
      '数据库连接配置',
      '云账号与网络拓扑',
    ];

    expect(legacyMergedNames.filter((name) => byName.has(name))).toEqual([]);
    expect(
      dataTypes
        .filter(
          (dataType) =>
            dataType.name.includes('与') && dataType.name !== '公开公告与公示',
        )
        .map((dataType) => dataType.name),
    ).toEqual([]);
    expect(
      categories.find((category) => category.key === 'religion_ethnicity')
        ?.name,
    ).toBe('敏感身份与社会属性');
    expect(byName.get('宗教信仰')?.levelCode).toBe('L4');
    expect(byName.get('民族信息')?.levelCode).toBe('L3');
    expect(byName.get('国籍信息')?.levelCode).toBe('L2');
    expect(byName.get('车辆标识')?.levelCode).toBe('L3');
    expect(byName.get('出行轨迹')?.levelCode).toBe('L4');
    expect(byName.get('供应商信息')?.levelCode).toBe('L2');
    expect(byName.get('采购明细')?.levelCode).toBe('L3');
    expect(byName.get('数据库连接地址')?.levelCode).toBe('L3');
    expect(byName.get('数据库访问凭据')?.levelCode).toBe('L4');
    expect(
      byName
        .get('国籍信息')
        ?.rules.some((rule) => rule.value.includes('nationality_code')),
    ).toBe(true);
    expect(
      byName
        .get('数据库访问凭据')
        ?.rules.some((rule) => rule.value.includes('database_password')),
    ).toBe(true);
  });

  it('removes legacy merged types while synchronizing built-in templates', async () => {
    const prisma = {
      classificationLevelDefinition: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(async ({ data }) => ({
          id: `level-${data.code}`,
          ...data,
        })),
        update: jest.fn(),
      },
      classificationCategory: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'legacy-sensitive-identity-category',
            name: '宗教信仰与民族',
          },
        ]),
        create: jest.fn(async ({ data }) => ({
          id: `category-${data.name}`,
          ...data,
        })),
        update: jest.fn(async ({ data }) => ({
          id: 'legacy-sensitive-identity-category',
          ...data,
        })),
      },
      classificationDataType: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: 'legacy-merged-type', name: '宗教民族与政治面貌' },
          ]),
        create: jest.fn(async ({ data }) => ({
          id: `type-${data.name}`,
          ...data,
        })),
        update: jest.fn(),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      classificationRule: {
        create: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      dataAssetColumn: {
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      classificationTemplate: {
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const syncService = new ClassificationTemplatesService(
      prisma as never,
      null as never,
      null as never,
    );

    await syncService['synchronizeBuiltInTemplate']('template-1');

    expect(prisma.classificationCategory.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'legacy-sensitive-identity-category' },
        data: expect.objectContaining({ name: '敏感身份与社会属性' }),
      }),
    );
    expect(prisma.dataAssetColumn.updateMany).toHaveBeenCalledWith({
      where: { classificationDataTypeId: { in: ['legacy-merged-type'] } },
      data: {
        classificationDataTypeId: null,
        dataCategory: null,
        dataLevel: null,
        isSensitive: false,
        needMask: false,
        needEncrypt: false,
      },
    });
    expect(prisma.classificationDataType.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['legacy-merged-type'] } },
    });
  });

  it('keeps gender separate while routing birth dates to time information', () => {
    const { dataTypes } = getDefinitions();
    const byName = new Map(
      dataTypes.map((dataType) => [dataType.name, dataType]),
    );
    const gender = byName.get('性别');

    expect(gender).toBeDefined();
    expect(byName.has('出生日期与性别')).toBe(false);
    expect(
      gender?.rules.some((rule) =>
        /birth|birthday|出生日期|出生年月/.test(rule.value),
      ),
    ).toBe(false);
  });

  it('covers stable metadata semantics without forcing weak fields', () => {
    const { dataTypes } = getDefinitions();
    const classify = (
      fieldName: string,
      tableName = 'business_table',
      fieldType = 'varchar',
    ) =>
      dataTypes
        .map((dataType, index) => ({
          name: dataType.name,
          index,
          score: dataType.rules.reduce(
            (bestScore, rule) =>
              Math.max(
                bestScore,
                evaluateClassificationRule(
                  {
                    fieldName,
                    fieldType,
                    tableName,
                  },
                  rule,
                ).score,
              ),
            0,
          ),
        }))
        .filter((item) => item.score > 0)
        .sort(
          (left, right) => right.score - left.score || left.index - right.index,
        )[0]?.name;

    expect(classify('customer_id')).toBe('自然人主体标识');
    expect(classify('updated_at')).toBe('时间信息');
    expect(classify('order_time')).toBe('时间信息');
    expect(classify('birth_date', 'business_table', 'date')).toBe('时间信息');
    expect(classify('arbitrary_field', 'business_table', 'datetime')).toBe(
      '时间信息',
    );
    expect(classify('operation_type', 'audit_operation_logbook')).toBe(
      '审计日志',
    );
    expect(classify('remark_text')).toBeUndefined();
    expect(classify('stage_flag')).toBeUndefined();
    expect(classify('case_label')).toBeUndefined();
  });
});
