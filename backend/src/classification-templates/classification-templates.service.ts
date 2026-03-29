import { Injectable } from '@nestjs/common';
import { TemplateStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassificationTemplateDto } from './dto/create-classification-template.dto';
import { UpdateClassificationTemplateDto } from './dto/update-classification-template.dto';

type DefaultTemplateMeta = {
  templateName?: string;
  templateType?: string;
  description?: string;
  status?: TemplateStatus;
};

type DefaultCategoryDefinition = {
  key: string;
  name: string;
  description: string;
  parentKey?: string;
  sortOrder: number;
};

type DefaultLevelDefinition = {
  code: string;
  name: string;
  color: string;
  description: string;
  isSensitive: boolean;
  needMask: boolean;
  needEncrypt: boolean;
  note: string;
};

type DefaultRuleDefinition = {
  target: string;
  matcher: string;
  value: string;
  hitRate: number;
};

type DefaultDataTypeDefinition = {
  name: string;
  categoryKey: string;
  levelCode: string;
  rules: DefaultRuleDefinition[];
};

@Injectable()
export class ClassificationTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  private getInclude() {
    return {
      categories: true,
      levelDefinitions: true,
      dataTypes: {
        include: {
          category: true,
          levelDefinition: true,
          rules: true,
        },
      },
    } as const;
  }

  private buildDefaultLevels(): DefaultLevelDefinition[] {
    return [
      {
        code: 'L1',
        name: '公开数据',
        color: '#52c41a',
        description: '已公开发布或可面向公众提供的数据，泄露后通常不会对个人权益、组织权益或公共利益造成明显损害。',
        isSensitive: false,
        needMask: false,
        needEncrypt: false,
        note: '适用于对外公告、公开产品信息、匿名统计结果等场景。',
      },
      {
        code: 'L2',
        name: '内部数据',
        color: '#1677ff',
        description: '仅限组织内部使用的一般业务与管理数据，外泄会造成有限的运营影响，但通常不构成重大安全风险。',
        isSensitive: false,
        needMask: false,
        needEncrypt: false,
        note: '适用于内部业务台账、一般运营数据、组织通讯录等场景。',
      },
      {
        code: 'L3',
        name: '敏感数据',
        color: '#fa8c16',
        description: '涉及敏感个人信息或重要业务明细，泄露后可能对个人权益或业务安全造成较明显影响。',
        isSensitive: true,
        needMask: true,
        needEncrypt: true,
        note: '参考《个人信息保护法》关于敏感个人信息处理要求，适用于手机号、证件号、金融交易明细等。',
      },
      {
        code: 'L4',
        name: '重要数据',
        color: '#f5222d',
        description: '对业务连续性、行业监管、公共利益或组织核心竞争力具有较高价值的数据，应实施重点保护。',
        isSensitive: true,
        needMask: true,
        needEncrypt: true,
        note: '参考《数据安全法》第二十一条和 GB/T 43697-2024，适用于风控策略变量、核心经营指标、重要业务清单等。',
      },
      {
        code: 'L5',
        name: '核心数据',
        color: '#722ed1',
        description: '一旦遭到篡改、破坏、泄露或非法利用，可能对国家安全、关键业务、重大公共利益造成严重危害的数据。',
        isSensitive: true,
        needMask: true,
        needEncrypt: true,
        note: '参考《数据安全法》关于核心数据的规定，适用于主密钥材料、核心控制参数、最高敏感认证要素等。',
      },
    ];
  }

  private buildDefaultCategories(): DefaultCategoryDefinition[] {
    return [
      {
        key: 'personal_info',
        name: '个人信息',
        description: '围绕自然人身份、联系、账户、健康、轨迹等维度的数据分类。',
        sortOrder: 1,
      },
      {
        key: 'identity_basic',
        name: '基本身份',
        description: '姓名、证件号码、出生日期等身份识别信息。',
        parentKey: 'personal_info',
        sortOrder: 11,
      },
      {
        key: 'contact_info',
        name: '联系方式',
        description: '手机号、邮箱、地址等联系渠道信息。',
        parentKey: 'personal_info',
        sortOrder: 12,
      },
      {
        key: 'account_auth',
        name: '账号与认证',
        description: '账号、密码、口令、令牌、密保等认证凭据。',
        parentKey: 'personal_info',
        sortOrder: 13,
      },
      {
        key: 'financial_account',
        name: '金融账户',
        description: '银行卡号、支付账户、授信信息等金融账户要素。',
        parentKey: 'personal_info',
        sortOrder: 14,
      },
      {
        key: 'medical_health',
        name: '医疗健康',
        description: '病历、诊断、检验、健康状态等医疗健康相关数据。',
        parentKey: 'personal_info',
        sortOrder: 15,
      },
      {
        key: 'location_track',
        name: '位置轨迹',
        description: '定位、地址、轨迹、出行等空间位置数据。',
        parentKey: 'personal_info',
        sortOrder: 16,
      },
      {
        key: 'biometric',
        name: '生物识别',
        description: '人脸、指纹、虹膜、声纹等生物识别特征数据。',
        parentKey: 'personal_info',
        sortOrder: 17,
      },
      {
        key: 'business_data',
        name: '业务信息',
        description: '围绕交易、客户、经营和风控活动产生的业务数据。',
        sortOrder: 2,
      },
      {
        key: 'transaction_order',
        name: '交易订单',
        description: '订单号、金额、支付流水、退款记录等交易明细。',
        parentKey: 'business_data',
        sortOrder: 21,
      },
      {
        key: 'customer_profile',
        name: '客户画像',
        description: '客户分层、标签、偏好、生命周期等画像信息。',
        parentKey: 'business_data',
        sortOrder: 22,
      },
      {
        key: 'operation_metrics',
        name: '经营分析',
        description: '营收、GMV、转化率、库存周转等经营统计指标。',
        parentKey: 'business_data',
        sortOrder: 23,
      },
      {
        key: 'risk_compliance',
        name: '风控合规',
        description: '风控规则、欺诈识别、黑白名单、合规报送等数据。',
        parentKey: 'business_data',
        sortOrder: 24,
      },
      {
        key: 'management_security',
        name: '管理与安全',
        description: '围绕组织管理、安全运维、审计留痕的支撑类数据。',
        sortOrder: 3,
      },
      {
        key: 'org_hr',
        name: '组织人事',
        description: '员工、岗位、组织架构、考勤、绩效等人事管理数据。',
        parentKey: 'management_security',
        sortOrder: 31,
      },
      {
        key: 'audit_log',
        name: '审计日志',
        description: '登录日志、操作日志、审计事件、访问留痕等。',
        parentKey: 'management_security',
        sortOrder: 32,
      },
      {
        key: 'security_ops',
        name: '安全运维',
        description: '主密钥、私钥、配置凭据、系统控制参数等。',
        parentKey: 'management_security',
        sortOrder: 33,
      },
      {
        key: 'public_data',
        name: '公共信息',
        description: '可向公众开放或对外展示的产品、服务、公告类信息。',
        sortOrder: 4,
      },
      {
        key: 'public_disclosure',
        name: '对外公开',
        description: '公开说明、对外公告、产品公开信息等。',
        parentKey: 'public_data',
        sortOrder: 41,
      },
    ];
  }

  private buildDefaultDataTypes(): DefaultDataTypeDefinition[] {
    return [
      {
        name: '姓名',
        categoryKey: 'identity_basic',
        levelCode: 'L3',
        rules: [
          { target: 'fieldName', matcher: 'contains', value: 'name,real_name,user_name,customer_name', hitRate: 90 },
          { target: 'fieldComment', matcher: 'contains', value: '姓名,真实姓名,客户姓名', hitRate: 88 },
        ],
      },
      {
        name: '身份证号',
        categoryKey: 'identity_basic',
        levelCode: 'L4',
        rules: [
          { target: 'fieldName', matcher: 'contains', value: 'id_card,identity_no,cert_no,id_no', hitRate: 95 },
          { target: 'fieldComment', matcher: 'contains', value: '身份证,证件号码,身份号码', hitRate: 92 },
        ],
      },
      {
        name: '手机号',
        categoryKey: 'contact_info',
        levelCode: 'L3',
        rules: [
          { target: 'fieldName', matcher: 'contains', value: 'phone,mobile,cellphone,telephone', hitRate: 92 },
          { target: 'fieldComment', matcher: 'contains', value: '手机号,联系电话,手机号码', hitRate: 90 },
        ],
      },
      {
        name: '电子邮箱',
        categoryKey: 'contact_info',
        levelCode: 'L2',
        rules: [
          { target: 'fieldName', matcher: 'contains', value: 'email,mail', hitRate: 82 },
          { target: 'fieldComment', matcher: 'contains', value: '邮箱,电子邮箱', hitRate: 80 },
        ],
      },
      {
        name: '登录密码',
        categoryKey: 'account_auth',
        levelCode: 'L5',
        rules: [
          { target: 'fieldName', matcher: 'contains', value: 'password,pwd,passphrase,login_pwd', hitRate: 99 },
          { target: 'fieldComment', matcher: 'contains', value: '密码,登录口令,认证密码', hitRate: 96 },
        ],
      },
      {
        name: '访问令牌与密钥',
        categoryKey: 'account_auth',
        levelCode: 'L5',
        rules: [
          { target: 'fieldName', matcher: 'contains', value: 'token,secret,api_key,app_secret,private_key', hitRate: 98 },
          { target: 'fieldComment', matcher: 'contains', value: '令牌,密钥,密文凭据,私钥', hitRate: 95 },
        ],
      },
      {
        name: '银行卡号',
        categoryKey: 'financial_account',
        levelCode: 'L4',
        rules: [
          { target: 'fieldName', matcher: 'contains', value: 'bank_card,card_no,account_no,acct_no', hitRate: 94 },
          { target: 'fieldComment', matcher: 'contains', value: '银行卡号,账户号,支付账户', hitRate: 92 },
        ],
      },
      {
        name: '医疗诊疗信息',
        categoryKey: 'medical_health',
        levelCode: 'L4',
        rules: [
          { target: 'fieldName', matcher: 'contains', value: 'medical,diagnosis,health,patient', hitRate: 90 },
          { target: 'fieldComment', matcher: 'contains', value: '病历,诊断,健康,医疗', hitRate: 92 },
        ],
      },
      {
        name: '位置信息',
        categoryKey: 'location_track',
        levelCode: 'L4',
        rules: [
          { target: 'fieldName', matcher: 'contains', value: 'location,address,gps,latitude,longitude,track', hitRate: 90 },
          { target: 'fieldComment', matcher: 'contains', value: '位置,地址,经纬度,轨迹', hitRate: 90 },
        ],
      },
      {
        name: '生物识别模板',
        categoryKey: 'biometric',
        levelCode: 'L5',
        rules: [
          { target: 'fieldName', matcher: 'contains', value: 'face,fingerprint,iris,voiceprint,biometric', hitRate: 96 },
          { target: 'fieldComment', matcher: 'contains', value: '人脸,指纹,虹膜,声纹,生物特征', hitRate: 95 },
        ],
      },
      {
        name: '订单金额',
        categoryKey: 'transaction_order',
        levelCode: 'L2',
        rules: [
          { target: 'fieldName', matcher: 'contains', value: 'order_amount,pay_amount,total_amount,settle_amount', hitRate: 85 },
          { target: 'fieldComment', matcher: 'contains', value: '订单金额,支付金额,结算金额', hitRate: 85 },
        ],
      },
      {
        name: '交易流水号',
        categoryKey: 'transaction_order',
        levelCode: 'L3',
        rules: [
          { target: 'fieldName', matcher: 'contains', value: 'trade_no,pay_no,transaction_id,order_no', hitRate: 88 },
          { target: 'fieldComment', matcher: 'contains', value: '交易流水,支付流水,订单号', hitRate: 86 },
        ],
      },
      {
        name: '客户标签',
        categoryKey: 'customer_profile',
        levelCode: 'L2',
        rules: [
          { target: 'fieldName', matcher: 'contains', value: 'tag,label,profile,customer_level,user_level', hitRate: 78 },
          { target: 'fieldComment', matcher: 'contains', value: '标签,画像,客户等级,用户分层', hitRate: 82 },
        ],
      },
      {
        name: '核心经营指标',
        categoryKey: 'operation_metrics',
        levelCode: 'L4',
        rules: [
          { target: 'fieldName', matcher: 'contains', value: 'gmv,revenue,gross_profit,arpu,inventory_turnover', hitRate: 84 },
          { target: 'fieldComment', matcher: 'contains', value: '营收,毛利,核心指标,GMV,库存周转', hitRate: 82 },
        ],
      },
      {
        name: '风控策略变量',
        categoryKey: 'risk_compliance',
        levelCode: 'L4',
        rules: [
          { target: 'fieldName', matcher: 'contains', value: 'risk_score,fraud,blacklist,whitelist,anti_fraud', hitRate: 91 },
          { target: 'fieldComment', matcher: 'contains', value: '风控,欺诈,黑名单,风险评分', hitRate: 90 },
        ],
      },
      {
        name: '员工档案',
        categoryKey: 'org_hr',
        levelCode: 'L3',
        rules: [
          { target: 'fieldName', matcher: 'contains', value: 'employee,staff,job_no,dept_name', hitRate: 80 },
          { target: 'fieldComment', matcher: 'contains', value: '员工,人事,组织,部门', hitRate: 82 },
        ],
      },
      {
        name: '审计日志',
        categoryKey: 'audit_log',
        levelCode: 'L2',
        rules: [
          { target: 'tableName', matcher: 'contains', value: 'audit_log,operation_log,login_log', hitRate: 86 },
          { target: 'tableComment', matcher: 'contains', value: '审计日志,操作日志,登录日志', hitRate: 84 },
        ],
      },
      {
        name: '主密钥材料',
        categoryKey: 'security_ops',
        levelCode: 'L5',
        rules: [
          { target: 'fieldName', matcher: 'contains', value: 'master_key,root_key,private_key,kms_key', hitRate: 99 },
          { target: 'fieldComment', matcher: 'contains', value: '主密钥,根密钥,私钥,KMS', hitRate: 98 },
        ],
      },
      {
        name: '公开产品信息',
        categoryKey: 'public_disclosure',
        levelCode: 'L1',
        rules: [
          { target: 'tableName', matcher: 'contains', value: 'product,goods,public_catalog', hitRate: 70 },
          { target: 'fieldComment', matcher: 'contains', value: '商品名称,公开说明,对外展示', hitRate: 75 },
        ],
      },
    ];
  }

  private async populateDefaultTemplate(templateId: string) {
    const levelMap = new Map<string, { id: string; isSensitive: boolean; needMask: boolean; needEncrypt: boolean }>();
    for (const level of this.buildDefaultLevels()) {
      const createdLevel = await this.prisma.classificationLevelDefinition.create({
        data: {
          templateId,
          ...level,
        },
      });
      levelMap.set(level.code, {
        id: createdLevel.id,
        isSensitive: level.isSensitive,
        needMask: level.needMask,
        needEncrypt: level.needEncrypt,
      });
    }

    const categoryMap = new Map<string, string>();
    for (const category of this.buildDefaultCategories()) {
      const createdCategory = await this.prisma.classificationCategory.create({
        data: {
          templateId,
          name: category.name,
          description: category.description,
          parentId: category.parentKey ? categoryMap.get(category.parentKey) : undefined,
          sortOrder: category.sortOrder,
        },
      });
      categoryMap.set(category.key, createdCategory.id);
    }

    for (const dataType of this.buildDefaultDataTypes()) {
      const level = levelMap.get(dataType.levelCode);
      const categoryId = categoryMap.get(dataType.categoryKey);
      if (!level || !categoryId) {
        continue;
      }

      const createdDataType = await this.prisma.classificationDataType.create({
        data: {
          templateId,
          categoryId,
          levelDefinitionId: level.id,
          name: dataType.name,
          isSensitive: level.isSensitive,
          needMask: level.needMask,
          needEncrypt: level.needEncrypt,
        },
      });

      for (const [index, rule] of dataType.rules.entries()) {
        await this.prisma.classificationRule.create({
          data: {
            dataTypeId: createdDataType.id,
            target: rule.target,
            matcher: rule.matcher,
            value: rule.value,
            hitRate: rule.hitRate,
            sortOrder: index,
          },
        });
      }
    }
  }

  private async createDefaultTemplate(meta?: DefaultTemplateMeta) {
    const template = await this.prisma.classificationTemplate.create({
      data: {
        templateName: meta?.templateName ?? '通用数据分类分级基线模板',
        templateType: meta?.templateType ?? 'built-in',
        description:
          meta?.description ??
          '基于数据分类分级通用规则、敏感个人信息识别要求和典型行业实践整理的通用默认模板，可作为分类目录、级别定义和字段识别规则的起点。',
        status: meta?.status ?? TemplateStatus.ACTIVE,
      },
    });

    await this.populateDefaultTemplate(template.id);
    return this.findOne(template.id);
  }

  async seed() {
    const count = await this.prisma.classificationTemplate.count();
    if (count > 0) return;
    await this.createDefaultTemplate();
  }

  async findAll() {
    await this.seed();
    return this.prisma.classificationTemplate.findMany({
      include: this.getInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    await this.seed();
    return this.prisma.classificationTemplate.findUnique({
      where: { id },
      include: this.getInclude(),
    });
  }

  async create(dto: CreateClassificationTemplateDto) {
    const template = await this.prisma.classificationTemplate.create({
      data: {
        templateName: dto.templateName,
        templateType: dto.templateType,
        description: dto.description,
        status: dto.status ?? TemplateStatus.DRAFT,
      },
    });

    return this.findOne(template.id);
  }

  async update(id: string, dto: UpdateClassificationTemplateDto) {
    await this.prisma.classificationTemplate.update({
      where: { id },
      data: {
        templateName: dto.templateName,
        templateType: dto.templateType,
        description: dto.description,
        status: dto.status,
      },
    });

    return this.findOne(id);
  }

  async remove(id: string) {
    await this.prisma.classificationRule.deleteMany({
      where: {
        dataType: {
          templateId: id,
        },
      },
    });
    await this.prisma.classificationDataType.deleteMany({
      where: { templateId: id },
    });
    await this.prisma.classificationLevelDefinition.deleteMany({
      where: { templateId: id },
    });
    await this.prisma.classificationCategory.deleteMany({
      where: { templateId: id },
    });
    await this.prisma.classificationTemplate.delete({
      where: { id },
    });

    return { success: true };
  }

  async initialize(id: string) {
    const template = await this.prisma.classificationTemplate.findUnique({
      where: { id },
    });
    if (!template) {
      return null;
    }

    await this.prisma.classificationRule.deleteMany({
      where: {
        dataType: {
          templateId: id,
        },
      },
    });
    await this.prisma.classificationDataType.deleteMany({
      where: { templateId: id },
    });
    await this.prisma.classificationLevelDefinition.deleteMany({
      where: { templateId: id },
    });
    await this.prisma.classificationCategory.deleteMany({
      where: { templateId: id },
    });

    await this.populateDefaultTemplate(id);
    return this.findOne(id);
  }
}
