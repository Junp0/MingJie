import { Injectable } from '@nestjs/common';
import {
  AuditLogCategory,
  AuditLogResult,
  ClassificationTaskSource,
  ClassificationTaskStatus,
  TemplateStatus,
} from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ClassificationTasksService } from '../classification-tasks/classification-tasks.service';
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
  hitRate?: number;
};

type DefaultDataTypeDefinition = {
  name: string;
  categoryKey: string;
  levelCode: string;
  rules: DefaultRuleDefinition[];
};

const contentRegexRule = (
  value: string,
  hitRate = 80,
): DefaultRuleDefinition => ({
  target: 'sampleData',
  matcher: 'regex',
  value,
  hitRate,
});

const fieldDataType = (
  name: string,
  categoryKey: string,
  levelCode: string,
  fieldNames: string,
  fieldComments: string,
): DefaultDataTypeDefinition => ({
  name,
  categoryKey,
  levelCode,
  rules: [
    { target: 'fieldName', matcher: 'contains', value: fieldNames },
    { target: 'fieldComment', matcher: 'contains', value: fieldComments },
  ],
});

const LEGACY_MERGED_DATA_TYPE_NAMES = new Set([
  '护照与驾驶证',
  '访问令牌与密钥',
  '验证码与密保答案',
  '支付鉴权信息',
  '征信与授信信息',
  '检验检查与用药',
  '位置信息',
  'IP 与设备标识',
  '学历与职业信息',
  '宗教民族与政治面貌',
  '未成年人信息',
  '个人财产与收入',
  '联系人与通讯录',
  '浏览与搜索记录',
  '车辆与行程信息',
  '收货与配送信息',
  '退款与结算明细',
  '合同与招投标文件',
  '供应商与采购明细',
  '源代码与核心算法',
  '商业秘密与技术资料',
  '主体关联标识',
  '业务状态与渠道',
  '机构与业务归属',
  '风控策略变量',
  '考勤绩效与薪酬',
  '安全事件与漏洞',
  '数据库连接配置',
  '云账号与网络拓扑',
]);

const CONTENT_RULES_BY_DATA_TYPE: Record<string, DefaultRuleDefinition[]> = {
  姓名: [
    contentRegexRule(
      '^(?:(?:欧阳|司马|上官|诸葛|东方|皇甫|尉迟|公孙|慕容|司徒|令狐)[\\u3400-\\u9fff]{1,2}|[赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜戚谢邹喻柏水窦章云苏潘葛奚范彭郎鲁韦昌马苗凤花方俞任袁柳鲍史唐费廉岑薛雷贺倪汤滕殷罗毕郝邬安常乐于时傅皮卞齐康伍余元卜顾孟平黄和穆萧尹姚邵汪祁毛禹狄米贝明臧计伏成戴宋茅庞熊纪舒屈项祝董梁杜阮蓝闵席季麻强贾路娄危江童颜郭梅盛林刁钟徐邱骆高夏蔡田樊胡凌霍虞万支柯昝管卢莫经房裘缪干解应宗丁宣贲邓郁单杭洪包诸左石崔吉龚程邢滑裴陆荣翁荀羊甄曲封芮储靳汲邴糜松井段富巫乌焦巴弓牧隗山谷车侯宓蓬全班仰秋仲伊宫宁仇栾暴甘钭厉戎祖武符刘景詹束龙叶幸司黎乔苍双闻莘党翟谭贡劳逄姬申扶堵冉宰郦雍郤璩桑桂濮牛寿通边扈燕冀郏浦尚农温别庄晏柴瞿阎充慕连茹习宦艾鱼容向古易慎戈廖庾终暨居衡步都耿满弘匡国文寇广禄阙东欧殳沃利蔚越夔隆师巩厍聂晁勾敖融冷訾辛阚那简饶空曾毋沙乜养鞠须丰巢关蒯相查后荆红游竺权逯盖益桓公][\\u3400-\\u9fff]{1,2})$',
      90,
    ),
  ],
  身份证号: [
    contentRegexRule(
      '^(?:[1-9]\\d{5}(?:18|19|20)\\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\\d|3[01])\\d{3}[0-9X]|[1-9]\\d{5}\\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\\d|3[01])\\d{3})$',
      90,
    ),
  ],
  性别: [contentRegexRule('^(?:男|女|male|female)$', 90)],
  护照号码: [contentRegexRule('^(?:[EGDSP]\\d{8}|[A-Z]{2}\\d{7})$', 90)],
  驾驶证号码: [
    contentRegexRule(
      '^(?:[1-9]\\d{5}(?:18|19|20)\\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\\d|3[01])\\d{3}[0-9X])$',
      90,
    ),
  ],
  手机号: [
    contentRegexRule(
      '^(?:(?:\\+?86[- ]?)?1[3-9]\\d{9}|(?:\\+?86[- ]?)?0\\d{2,3}[- ]?\\d{7,8})$',
      80,
    ),
  ],
  电子邮箱: [
    contentRegexRule(
      "^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$",
      80,
    ),
  ],
  固定住址: [
    contentRegexRule(
      '(?:(?:省|自治区|特别行政区).*(?:市|自治州|区|县)|(?:市|区|县).*(?:街道|路|街|巷|弄|号|小区|村)|\\b(?:road|street|avenue|lane|building|apartment|district)\\b)',
      80,
    ),
  ],
  账号标识: [
    contentRegexRule(
      '^(?:(?:user|member|customer|account|acct|login)(?:[-_:][A-Z0-9][A-Z0-9._-]{2,62}|\\d{4,})|U(?:SER)?[-_]\\d{4,})$',
      90,
    ),
  ],
  登录密码: [
    contentRegexRule(
      '^(?:\\$(?:2[ABY]|argon2(?:id|i|d))\\$|(?:pbkdf2|scrypt|bcrypt|sha(?:256|512))\\$).+',
      80,
    ),
  ],
  访问令牌: [
    contentRegexRule(
      '^(?:eyJ[A-Z0-9_-]+\\.eyJ[A-Z0-9_-]+\\.[A-Z0-9_-]+|(?:access|refresh)[-_ ]?token[:=][A-Z0-9._~+/-]{12,})$',
      80,
    ),
  ],
  应用访问密钥: [
    contentRegexRule(
      '^(?:AKIA[A-Z0-9]{16}|(?:sk|ghp|gho|github_pat|xox[ABPRS])[-_][A-Z0-9_-]{16,}|(?:api|client|app)[-_ ]?(?:key|secret)[:=][A-Z0-9._~+/-]{12,})$',
      80,
    ),
  ],
  私钥: [
    contentRegexRule('^-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----', 100),
  ],
  动态验证码: [
    contentRegexRule(
      '^(?:otpauth://.+|(?:otp|sms|verify|verification|captcha)[-_:]?[A-Z0-9]{4,16})$',
      90,
    ),
  ],
  密保答案: [
    contentRegexRule(
      '^(?:security[-_ ]?(?:answer|response)|密保答案)[:=：].{2,128}$',
      90,
    ),
  ],
  银行卡号: [
    contentRegexRule(
      '^(?:62\\d{14,17}|4\\d{12}(?:\\d{3}){0,2}|5[1-5]\\d{14}|(?:222[1-9]|22[3-9]\\d|2[3-6]\\d{2}|27[01]\\d|2720)\\d{12}|3[47]\\d{13})$',
      90,
    ),
  ],
  支付认证凭据: [
    contentRegexRule('^(?:(?:cvv|cvc|pin|paypwd)[-_:]?\\d{3,16})$', 90),
  ],
  卡片有效期: [
    contentRegexRule(
      '^(?:(?:valid_thru|card_expiry|expiration_date)[:=](?:0[1-9]|1[0-2])[/\\-](?:\\d{2}|20\\d{2}))$',
      90,
    ),
  ],
  征信信息: [
    contentRegexRule(
      '(?:征信|信用(?:评分|报告)|逾期(?:金额|天数|记录)|credit[ _-]?(?:score|report)|overdue)',
      80,
    ),
  ],
  授信借贷信息: [
    contentRegexRule(
      '(?:授信|信用额度|贷款余额|授信余额|credit[ _-]?limit|loan[ _-]?balance|credit[ _-]?balance)',
      80,
    ),
  ],
  医疗诊疗信息: [
    contentRegexRule(
      '(?:门诊|住院|病历|病史|诊断|疾病|症状|治疗|患者|医嘱|健康状态|medical[ _-]?record|diagnos(?:is|ed)|disease|patient)',
      80,
    ),
  ],
  检验检查结果: [
    contentRegexRule(
      '(?:检验|检查报告|化验|影像报告|lab[ _-]?(?:result|report)|exam[ _-]?(?:result|report)|test[ _-]?report)',
      80,
    ),
  ],
  用药处方信息: [
    contentRegexRule(
      '(?:处方|用药|剂量|药物|药物过敏|prescription|medication|dosage|drug[ _-]?allergy)',
      80,
    ),
  ],
  精确位置: [
    contentRegexRule(
      '^(?:POINT\\s*\\(\\s*-?(?:180(?:\\.0+)?|1[0-7]\\d(?:\\.\\d+)?|\\d{1,2}(?:\\.\\d+)?)\\s+-?(?:90(?:\\.0+)?|[1-8]?\\d(?:\\.\\d+)?)\\s*\\)|-?(?:180(?:\\.0+)?|1[0-7]\\d(?:\\.\\d+)?|\\d{1,2}(?:\\.\\d+)?)\\s*[,|]\\s*-?(?:90(?:\\.0+)?|[1-8]?\\d(?:\\.\\d+)?)|\\{[^{}]*["\'](?:lat|latitude)["\']\\s*:\\s*-?\\d+(?:\\.\\d+)?[^{}]*["\'](?:lng|lon|longitude)["\']\\s*:\\s*-?\\d+(?:\\.\\d+)?[^{}]*\\})$',
      80,
    ),
  ],
  行踪轨迹: [
    contentRegexRule(
      '(?:定位轨迹|活动轨迹|行踪轨迹|位置序列|location[ _-]?track|position[ _-]?trace|trajectory)',
      80,
    ),
  ],
  生物识别模板: [
    contentRegexRule(
      '^(?:(?:FMR|FAC|IIR)\\x00|(?:face|fingerprint|iris|voiceprint|biometric)[-_:](?:template|feature|vector|hash)[-_:]?[A-Z0-9+/=_-]{8,})',
      90,
    ),
  ],
  'IP 地址': [
    contentRegexRule(
      '^(?:(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)|(?:[A-F0-9]{1,4}:){2,7}[A-F0-9]{1,4})$',
      80,
    ),
  ],
  终端设备标识: [
    contentRegexRule(
      '^(?:(?:[A-F0-9]{2}[:-]){5}[A-F0-9]{2}|(?:IMEI|IMSI|DEVICE|COOKIE)[-_:]?[A-Z0-9]{8,64})$',
      80,
    ),
  ],
  教育经历: [
    contentRegexRule(
      '^(?:小学|初中|高中|中专|大专|本科|硕士|博士|博士后|学士|研究生|student|bachelor|master|doctorate|phd|postdoc)$|(?:学历|学位|毕业院校|education|degree)',
      80,
    ),
  ],
  职业资格信息: [
    contentRegexRule(
      '^(?:无业|自由职业|在职|离职|退休)$|(?:职业|工作经历|职业资格|occupation|work[ _-]?experience|qualification)',
      80,
    ),
  ],
  宗教信仰: [
    contentRegexRule(
      '^(?:佛教|道教|伊斯兰教|基督教|天主教|hindu|buddhis[tm]|islam|muslim|christian(?:ity)?|catholic)$',
      90,
    ),
  ],
  民族信息: [contentRegexRule('^[\\u3400-\\u9fff]{1,8}族$', 90)],
  政治面貌: [
    contentRegexRule(
      '^(?:群众|共青团员|中共党员|中共预备党员|民主党派|无党派人士)$',
      90,
    ),
  ],
  国籍信息: [
    contentRegexRule(
      '^(?:中国|中华人民共和国|CHN|CN|美国|USA|US|英国|GBR|GB|日本|JPN|JP|法国|FRA|FR|德国|DEU|DE)$',
      90,
    ),
  ],
  未成年人个人信息: [
    contentRegexRule(
      '(?:未成年人|儿童姓名|不满十四周岁|\\bminor\\b|\\bchild\\b|under[ _-]?14|(?:[0-9]|1[0-3])周?岁)',
      80,
    ),
  ],
  监护人信息: [
    contentRegexRule('(?:监护人|家长信息|guardian|student[ _-]?parent)', 80),
  ],
  个人财产信息: [
    contentRegexRule(
      '(?:房产|个人资产|资产价值|house[ _-]?property|property[ _-]?value|personal[ _-]?asset)',
      80,
    ),
  ],
  个人收入缴存信息: [
    contentRegexRule(
      '(?:年收入|月收入|工资|薪资|薪酬|个人所得税|公积金|annual[ _-]?income|monthly[ _-]?(?:income|salary)|provident[ _-]?fund|personal[ _-]?tax)',
      80,
    ),
  ],
  通信内容: [
    contentRegexRule(
      '(?:^(?:sms|mms|chat|im)://|["\'](?:message|message_content|chat_content|sms_content)["\']\\s*:|(?:短信|邮件|聊天|通信|通话)(?:内容|正文|录音))',
      80,
    ),
  ],
  联系人信息: [
    contentRegexRule(
      '(?:["\'](?:contact_person|emergency_contact)["\']\\s*:|(?:联系人|紧急联系人)\\s*[:：])',
      80,
    ),
  ],
  通讯录: [
    contentRegexRule(
      '(?:BEGIN:VCARD|["\'](?:contacts?|address_book)["\']\\s*:|(?:通讯录|联系人列表))',
      80,
    ),
  ],
  通话记录: [
    contentRegexRule(
      '(?:["\'](?:call_history|call_log)["\']\\s*:|(?:通话记录|呼叫记录))',
      80,
    ),
  ],
  浏览记录: [
    contentRegexRule(
      '^(?:https?://[^\\s]+)$|["\'](?:visit_url|referrer_url|browse_history|click_stream)["\']\\s*:',
      80,
    ),
  ],
  搜索记录: [
    contentRegexRule(
      '^(?:(?:search|query)://[^\\s]+)$|["\'](?:search_keyword|search_history|query_text)["\']\\s*:',
      80,
    ),
  ],
  应用使用记录: [
    contentRegexRule(
      '^(?:(?:android-app|ios-app|app)://.+|package:[A-Z0-9_]+(?:\\.[A-Z0-9_]+){2,})$|["\'](?:app_id|package_name|use_duration|app_usage)["\']\\s*:',
      80,
    ),
  ],
  车辆标识: [
    contentRegexRule(
      '^(?:[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z][A-HJ-NP-Z0-9]{5,6}|(?!ACCOUNT|ARCHIVE|CONTACT|CUSTOMER|EMPLOYEE|LOGINLOG|PAYMENT|PRODUCT|RECORD|REGISTRY|SUPPLIER|TRADE|TRANSACTION)[A-HJ-NPR-Z0-9]{17})$|(?:车牌号|车辆识别码)',
      90,
    ),
  ],
  出行票务: [
    contentRegexRule(
      '^(?:(?:TICKET|BOARDING)[-_:]?[A-Z0-9]{6,40})$|(?:票务信息|乘车记录|登机记录|boarding[ _-]?record|ticket[ _-]?number)',
      80,
    ),
  ],
  出行轨迹: [
    contentRegexRule(
      '(?:行程路线|出行轨迹|travel[ _-]?route|trip[ _-]?track|boarding[ _-]?route)',
      80,
    ),
  ],
  订单金额: [
    contentRegexRule(
      '^(?:(?:order|paid|pay|transaction|settlement)[-_ ]?amount[:=](?:CNY|RMB|USD|EUR)?[-+]?\\d+(?:\\.\\d{1,2})?|["\'](?:order_amount|paid_amount|pay_amount|transaction_amount)["\']\\s*:\\s*[-+]?\\d+(?:\\.\\d{1,2})?)$',
      90,
    ),
  ],
  交易流水号: [
    contentRegexRule(
      '^(?:(?:ORDER|TRADE|PAY|TXN|TRANS|BILL)[-_:]?[A-Z0-9]{6,40})$',
      90,
    ),
  ],
  收货人信息: [
    contentRegexRule(
      '(?:收货人|收件人|收货电话|consignee|receiver[ _-]?(?:name|phone))\\s*[:：]',
      80,
    ),
  ],
  配送信息: [
    contentRegexRule(
      '(?:配送地址|收货地址|shipping[ _-]?address|delivery[ _-]?address)\\s*[:：]',
      80,
    ),
  ],
  退款明细: [
    contentRegexRule(
      '^(?:REFUND[-_:]?[A-Z0-9]{6,40})$|(?:退款金额|退款流水|refund[ _-]?(?:amount|number))',
      80,
    ),
  ],
  结算清算明细: [
    contentRegexRule(
      '^(?:(?:SETTLE(?:MENT)?|CLEARING)[-_:]?[A-Z0-9]{6,40})$|(?:结算明细|清算记录|settlement[ _-]?(?:detail|number)|clearing[ _-]?record)',
      80,
    ),
  ],
  客户标签: [
    contentRegexRule(
      '^(?:VIP[0-9]*|高价值客户|潜在客户|新客户|活跃客户|沉睡客户|流失客户|high[ _-]?value|prospect|active[ _-]?customer|churned[ _-]?customer)$|["\'](?:customer_tag|profile_label|customer_level)["\']\\s*:',
      80,
    ),
  ],
  监管报送数据: [
    contentRegexRule(
      '(?:监管报送|监管报告|合规报送|报送机构|报送批次|regulatory[ _-]?(?:report|submission)|regulator[ _-]?submission)',
      80,
    ),
  ],
  合同文件: [
    contentRegexRule(
      '(?:合同编号|甲方|乙方|合同正文|contract[ _-]?(?:number|agreement|clause))',
      80,
    ),
  ],
  保密协议: [
    contentRegexRule(
      '(?:保密协议|保密条款|non-disclosure agreement|confidentiality agreement)',
      80,
    ),
  ],
  招投标文件: [
    contentRegexRule(
      '(?:招标文件|投标文件|中标通知|tender[ _-]?document|bid[ _-]?document|award[ _-]?notice)',
      80,
    ),
  ],
  供应商信息: [
    contentRegexRule(
      '^(?:SUPPLIER[-_:]?[A-Z0-9]{5,40})$|(?:供应商名称|供应商编码|supplier[ _-]?(?:name|code))',
      80,
    ),
  ],
  采购明细: [
    contentRegexRule(
      '^(?:(?:PO|PURCHASE|PROCUREMENT)[-_:]?[A-Z0-9]{5,40})$|(?:采购订单|采购明细|采购单价|purchase[ _-]?(?:order|price)|procurement[ _-]?detail)',
      80,
    ),
  ],
  物流运单信息: [
    contentRegexRule(
      '^(?:(?:SF|YT|ZTO|STO|YD|JT|JD|EMS)[-_:]?[A-Z0-9]{8,30}|(?:WAYBILL|TRACKING)[-_:]?[A-Z0-9]{6,40})$|(?:物流轨迹|运单号|快递单号|waybill[ _-]?number|tracking[ _-]?number)',
      80,
    ),
  ],
  源代码: [
    contentRegexRule(
      '(?:^|\\n)\\s*(?:import|export|package|namespace|class|interface|function|def|fn|public static|#include)\\b|(?:SELECT|INSERT|UPDATE|DELETE|CREATE TABLE)\\s+.+\\s+(?:FROM|INTO|SET|TABLE)\\b',
      60,
    ),
  ],
  核心算法模型: [
    contentRegexRule(
      '["\'](?:model_weight|model_parameter|algorithm_code|formula_content)["\']\\s*:|(?:核心算法|模型权重|模型参数|核心公式)',
      80,
    ),
  ],
  商业秘密: [
    contentRegexRule(
      '(?:商业秘密|内部机密|绝密|未经授权不得|trade[ _-]?secret|strictly confidential)',
      80,
    ),
  ],
  技术研发资料: [
    contentRegexRule(
      '(?:专利草稿|技术文档|技术图纸|研发数据|patent[ _-]?draft|technical[ _-]?document|design[ _-]?drawing|research[ _-]?data)',
      80,
    ),
  ],
  自然人主体标识: [
    contentRegexRule(
      '^(?:(?:CUSTOMER|USER|MEMBER|EMPLOYEE|PATIENT)[-_:]?[A-Z0-9]{4,40})$',
      90,
    ),
  ],
  组织主体标识: [
    contentRegexRule(
      '^(?:(?:SUPPLIER|MERCHANT|ORGANIZATION|COMPANY)[-_:]?[A-Z0-9]{4,40})$',
      90,
    ),
  ],
  账户租户标识: [
    contentRegexRule('^(?:(?:ACCOUNT|TENANT)[-_:]?[A-Z0-9]{4,40})$', 90),
  ],
  业务状态: [
    contentRegexRule(
      '^(?:(?:ORDER|PAYMENT|TRANSACTION|REFUND)[-_:]?(?:PENDING|PAID|SUCCESS|FAILED|CANCELLED|CLOSED|REFUNDED))$',
      90,
    ),
  ],
  业务渠道: [
    contentRegexRule(
      '^(?:(?:REGISTER|PAYMENT|CHANNEL)[-_:]?(?:APP|WEB|H5|WECHAT|ALIPAY|BANK|OFFLINE))$',
      90,
    ),
  ],
  机构归属: [
    contentRegexRule(
      '(?:银行|医院|医疗中心|大学|学院|研究院|有限公司|股份有限公司|集团|部门|分公司|支行|branch|department|organization)',
      80,
    ),
  ],
  业务线归属: [
    contentRegexRule(
      '(?:事业部|业务部|业务线|business[ _-]?(?:unit|line)|product[ _-]?line)',
      80,
    ),
  ],
  行政区划信息: [
    contentRegexRule(
      '^(?:北京市|天津市|上海市|重庆市|香港特别行政区|澳门特别行政区|[^\\s]{2,8}(?:省|自治区|自治州|市|区|县|旗))$',
      90,
    ),
  ],
  核心经营指标: [
    contentRegexRule(
      '(?:GMV|营收|营业收入|毛利|毛利率|客单价|库存周转|ARPU|revenue|gross[ _-]?profit|inventory[ _-]?turnover)',
      80,
    ),
  ],
  风控策略: [
    contentRegexRule(
      '(?:风控策略|反欺诈规则|策略变量|risk[ _-]?(?:strategy|rule)|anti[ _-]?fraud[ _-]?rule)',
      80,
    ),
  ],
  客户风险结果: [
    contentRegexRule(
      '(?:风险评分|欺诈标签|黑名单|白名单|HIGH[_ -]?RISK|MEDIUM[_ -]?RISK|LOW[_ -]?RISK|risk[ _-]?score|fraud[ _-]?label|blacklist|whitelist)',
      80,
    ),
  ],
  员工档案: [
    contentRegexRule(
      '^(?:(?:EMP|EMPLOYEE|STAFF|JOB)[-_:]?[A-Z0-9]{4,30})$|(?:员工编号|工号|入职部门|employee[ _-]?(?:number|record)|staff[ _-]?(?:number|record))',
      80,
    ),
  ],
  考勤记录: [
    contentRegexRule(
      '(?:迟到|早退|缺勤|加班|出勤|考勤|attendance|overtime)',
      80,
    ),
  ],
  绩效信息: [
    contentRegexRule('(?:绩效评分|绩效结果|performance[ _-]?score)', 80),
  ],
  薪酬信息: [
    contentRegexRule(
      '(?:工资单|薪酬明细|奖金|payroll|salary[ _-]?detail|bonus[ _-]?amount)',
      80,
    ),
  ],
  审计日志: [
    contentRegexRule(
      '(?:["\'](?:actor|operator|operation|action|audit_event|request_payload)["\']\\s*:|^(?:LOGIN|LOGOUT|CREATE|UPDATE|DELETE|EXPORT|IMPORT)[-_:](?:SUCCESS|FAILED|DENIED)$|\\b(?:INFO|WARN|ERROR|AUDIT)\\b.+\\b(?:user|action|resource|request)\\b)',
      80,
    ),
  ],
  主密钥材料: [
    contentRegexRule(
      '^(?:kms://[^\\s]*/(?:master|root)(?:[-_/]key)?[^\\s]*|(?:MASTER|ROOT|KEK|KMS_MASTER)[-_:](?:KEY|SECRET)[-_:][A-Z0-9+/=_-]{12,})$',
      100,
    ),
  ],
  安全事件: [
    contentRegexRule(
      '(?:安全事件|安全告警|security[ _-]?incident|security[ _-]?alert)',
      80,
    ),
  ],
  漏洞攻击信息: [
    contentRegexRule(
      '(?:CVE-\\d{4}-\\d{4,7}|CWE-\\d{1,5}|CVSS(?::\\d(?:\\.\\d)?)?|漏洞详情|攻击路径|利用代码|vulnerability|exploit|attack[ _-]?path)',
      80,
    ),
  ],
  应急预案: [
    contentRegexRule(
      '(?:应急预案|响应预案|emergency[ _-]?plan|response[ _-]?plan)',
      80,
    ),
  ],
  数据库连接地址: [
    contentRegexRule(
      '^(?:jdbc:)?(?:mysql|postgres(?:ql)?|oracle|sqlserver|mongodb(?:\\+srv)?|redis)://(?![^/\\s]*@)[^\\s]+|^jdbc:[A-Z0-9:;?&=._/-]+$',
      80,
    ),
  ],
  数据库访问凭据: [
    contentRegexRule(
      '^(?:(?:jdbc:)?(?:mysql|postgres(?:ql)?|oracle|sqlserver|mongodb(?:\\+srv)?|redis)://[^:/\\s]+:[^@\\s]+@[^\\s]+|(?:database|db)[-_ ]?(?:password|username|credential)[:=].{4,256})$',
      80,
    ),
  ],
  云访问凭据: [
    contentRegexRule(
      '^(?:arn:aws:[^\\s]+|/subscriptions/[0-9A-F-]{36}/resourceGroups/[^\\s]+|projects/[A-Z0-9_-]+/(?:zones|regions|global)/[^\\s]+|AKIA[A-Z0-9]{16})$|(?:云账号|云访问密钥|cloud[ _-]?(?:account|credential))',
      80,
    ),
  ],
  网络拓扑配置: [
    contentRegexRule(
      '(?:network[ _-]?topology|subnet[ _-]?config|firewall[ _-]?rule|网络拓扑|子网配置|防火墙规则)',
      80,
    ),
  ],
  记录技术标识: [
    contentRegexRule(
      '^(?:(?:REC|RECORD|ROW|REGISTRY|ARCHIVE|CASE|FLOW|EVENT|METRIC|LOG|AUDIT|TXN)(?:[-_:][A-Z0-9]{3,39}|\\d{4,40})|[0-9A-F]{8}-[0-9A-F]{4}-[1-5][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}|[0-7][0-9A-HJKMNP-TV-Z]{25})$',
      90,
    ),
  ],
  时间信息: [
    contentRegexRule(
      '^(?:(?:18|19|20)\\d{2}[-/.](?:0?[1-9]|1[0-2])(?:[-/.](?:0?[1-9]|[12]\\d|3[01])(?:[ T](?:[01]?\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d{1,6})?)?(?:Z|[+-][0-2]\\d:?[0-5]\\d)?)?)?|(?:0[1-9]|1[0-2])[/\\-](?:\\d{2}|(?:18|19|20)\\d{2})|(?:[01]?\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d{1,6})?)?|(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (?:0?[1-9]|[12]\\d|3[01]) (?:18|19|20)\\d{2} (?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d GMT[+-][0-2]\\d{3}(?: \\(Coordinated Universal Time\\))?)$',
      80,
    ),
  ],
  公开产品信息: [
    contentRegexRule(
      '^(?:(?:SKU|PRODUCT|GOODS)[-_:]?[A-Z0-9]{4,40})$|["\'](?:product_name|product_code|public_description|publish_status)["\']\\s*:|(?:商品名称|产品型号|公开说明|建议零售价)',
      80,
    ),
  ],
  公开公告与公示: [
    contentRegexRule(
      '(?:公告|公示|对外披露|公开通知|信息公开|announcement|public[ _-]?(?:notice|disclosure)|notice[ _-]?number)',
      80,
    ),
  ],
  匿名汇总统计: [
    contentRegexRule(
      '(?:匿名汇总|去标识化统计|汇总统计|样本总数|平均值|中位数|同比|环比|anonymous[ _-]?summary|aggregate[ _-]?(?:count|total|average)|de-identified[ _-]?statistics)',
      80,
    ),
  ],
};

const DEFAULT_TEMPLATE_DESCRIPTION =
  '依据 GB/T 43697-2024、GB/T 35273-2020、《个人信息保护法》及金融、电信行业分类分级实践整理的通用基线，优先使用数据内容正则识别，字段与表元数据作为辅助线索，覆盖个人信息、业务信息、管理安全和公共信息。自动命中的重要数据与核心数据仍需结合行业目录、数据规模及影响范围人工复核。';

@Injectable()
export class ClassificationTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly classificationTasksService: ClassificationTasksService,
  ) {}

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
        description:
          '已公开发布或可面向公众提供的数据，泄露后通常不会对个人权益、组织权益或公共利益造成明显损害。',
        isSensitive: false,
        needMask: false,
        needEncrypt: false,
        note: '适用于对外公告、公开产品信息、匿名统计结果等场景。',
      },
      {
        code: 'L2',
        name: '内部数据',
        color: '#1677ff',
        description:
          '仅限组织内部使用的一般业务与管理数据，外泄会造成有限的运营影响，但通常不构成重大安全风险。',
        isSensitive: false,
        needMask: false,
        needEncrypt: false,
        note: '适用于内部业务台账、一般运营数据、组织通讯录等场景。',
      },
      {
        code: 'L3',
        name: '敏感数据',
        color: '#fa8c16',
        description:
          '涉及敏感个人信息或重要业务明细，泄露后可能对个人权益或业务安全造成较明显影响。',
        isSensitive: true,
        needMask: false,
        needEncrypt: false,
        note: '参考《个人信息保护法》关于敏感个人信息处理要求，适用于手机号、证件号、金融交易明细等。',
      },
      {
        code: 'L4',
        name: '重要数据',
        color: '#f5222d',
        description:
          '一旦遭到泄露、篡改或破坏，可能对公共利益、行业运行或组织关键业务造成严重危害，需结合规模、场景和行业目录复核是否属于重要数据。',
        isSensitive: true,
        needMask: true,
        needEncrypt: true,
        note: '参考《数据安全法》第二十一条和 GB/T 43697-2024；重要数据认定仍需结合行业主管部门目录和人工复核。',
      },
      {
        code: 'L5',
        name: '核心数据',
        color: '#722ed1',
        description:
          '一旦遭到篡改、破坏、泄露或非法利用，可能对国家安全、关键业务、重大公共利益造成严重危害的数据。',
        isSensitive: true,
        needMask: true,
        needEncrypt: true,
        note: '参考《数据安全法》和 GB/T 43697-2024；核心数据必须结合国家安全、国民经济命脉、重大公共利益及行业目录人工认定。',
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
        description: '姓名、证件号码、性别等身份识别信息。',
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
        key: 'network_identity',
        name: '网络标识',
        description: 'IP 地址、设备指纹、Cookie、IMEI 等网络与设备标识数据。',
        parentKey: 'personal_info',
        sortOrder: 18,
      },
      {
        key: 'education_career',
        name: '教育职业',
        description: '学历学位、职业信息、工作经历、资格证书等教育与职业数据。',
        parentKey: 'personal_info',
        sortOrder: 19,
      },
      {
        key: 'religion_ethnicity',
        name: '敏感身份与社会属性',
        description: '宗教信仰、民族、政治面貌、国籍等身份与社会属性数据。',
        parentKey: 'personal_info',
        sortOrder: 20,
      },
      {
        key: 'minor_info',
        name: '未成年人信息',
        description:
          '不满十四周岁未成年人的个人信息，《个保法》要求制定专门处理规则。',
        parentKey: 'personal_info',
        sortOrder: 21,
      },
      {
        key: 'property_info',
        name: '财产信息',
        description: '房产、车辆、收入、纳税、公积金等个人财产与经济状况数据。',
        parentKey: 'personal_info',
        sortOrder: 22,
      },
      {
        key: 'communication_content',
        name: '通信与联系人',
        description: '通信内容、通话记录、短信邮件、联系人及通讯录等数据。',
        parentKey: 'personal_info',
        sortOrder: 23,
      },
      {
        key: 'online_activity',
        name: '上网与使用记录',
        description: '浏览、搜索、点击、收藏、应用使用和网络活动记录等数据。',
        parentKey: 'personal_info',
        sortOrder: 24,
      },
      {
        key: 'vehicle_travel',
        name: '车辆与出行',
        description: '车辆标识、车牌、行程、票务和出行记录等数据。',
        parentKey: 'personal_info',
        sortOrder: 25,
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
        key: 'contract_agreement',
        name: '合同协议',
        description: '合同文本、保密协议、招投标数据、SLA 等合同与协议数据。',
        parentKey: 'business_data',
        sortOrder: 25,
      },
      {
        key: 'supply_logistics',
        name: '供应链与物流',
        description: '供应商信息、物流单号、仓储数据、采购明细等供应链数据。',
        parentKey: 'business_data',
        sortOrder: 26,
      },
      {
        key: 'intellectual_property',
        name: '知识产权',
        description: '专利技术、源代码、商业秘密、核心算法等知识产权数据。',
        parentKey: 'business_data',
        sortOrder: 27,
      },
      {
        key: 'business_common',
        name: '业务基础属性',
        description: '跨业务域通用的主体标识、状态、渠道和机构归属等基础属性。',
        parentKey: 'business_data',
        sortOrder: 28,
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
        key: 'infra_config',
        name: '基础设施配置',
        description:
          '服务器清单、数据库连接串、云账号凭证、网络拓扑等基础设施配置数据。',
        parentKey: 'management_security',
        sortOrder: 34,
      },
      {
        key: 'data_management_meta',
        name: '数据管理元数据',
        description:
          '用于数据关联、生命周期管理和技术治理的记录标识与审计时间。',
        parentKey: 'management_security',
        sortOrder: 35,
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
    const dataTypes: DefaultDataTypeDefinition[] = [
      {
        name: '姓名',
        categoryKey: 'identity_basic',
        levelCode: 'L3',
        rules: [
          {
            target: 'fieldName',
            matcher: 'contains',
            value:
              'real_name,full_name,customer_name,employee_name,staff_name,person_name,legal_name',
          },
          {
            target: 'fieldComment',
            matcher: 'contains',
            value: '姓名,真实姓名,客户姓名',
          },
        ],
      },
      {
        name: '身份证号',
        categoryKey: 'identity_basic',
        levelCode: 'L4',
        rules: [
          {
            target: 'fieldName',
            matcher: 'contains',
            value: 'id_card,identity_no,citizen_id,national_id,cert_no',
          },
          {
            target: 'fieldComment',
            matcher: 'contains',
            value: '身份证,公民身份号码,证件号码,身份号码',
          },
        ],
      },
      {
        name: '性别',
        categoryKey: 'identity_basic',
        levelCode: 'L2',
        rules: [
          {
            target: 'fieldName',
            matcher: 'contains',
            value: 'gender,gender_code,gender_type,sex,sex_code',
          },
          {
            target: 'fieldComment',
            matcher: 'contains',
            value: '性别,性别代码',
          },
        ],
      },
      fieldDataType(
        '护照号码',
        'identity_basic',
        'L3',
        'passport_no,passport_number',
        '护照号码,护照号',
      ),
      fieldDataType(
        '驾驶证号码',
        'identity_basic',
        'L3',
        'driver_license,driving_license',
        '驾驶证号,驾驶证号码',
      ),
      {
        name: '手机号',
        categoryKey: 'contact_info',
        levelCode: 'L3',
        rules: [
          {
            target: 'fieldName',
            matcher: 'contains',
            value: 'phone,mobile,cellphone,telephone',
          },
          {
            target: 'fieldComment',
            matcher: 'contains',
            value: '手机号,联系电话,手机号码',
          },
        ],
      },
      {
        name: '电子邮箱',
        categoryKey: 'contact_info',
        levelCode: 'L2',
        rules: [
          {
            target: 'fieldName',
            matcher: 'contains',
            value: 'email,mail',
          },
          {
            target: 'fieldComment',
            matcher: 'contains',
            value: '邮箱,电子邮箱',
          },
        ],
      },
      {
        name: '固定住址',
        categoryKey: 'contact_info',
        levelCode: 'L3',
        rules: [
          {
            target: 'fieldName',
            matcher: 'contains',
            value:
              'home_address,residential_address,mailing_address,contact_address,detail_address,address_detail,location_address',
          },
          {
            target: 'fieldComment',
            matcher: 'contains',
            value: '家庭住址,居住地址,通讯地址,联系地址,详细地址',
          },
        ],
      },
      {
        name: '账号标识',
        categoryKey: 'account_auth',
        levelCode: 'L2',
        rules: [
          {
            target: 'fieldName',
            matcher: 'contains',
            value:
              'username,login_name,login_account,user_account,account_name,member_no,customer_no',
          },
          {
            target: 'fieldComment',
            matcher: 'contains',
            value: '登录账号,用户账号,会员号,客户号',
          },
        ],
      },
      {
        name: '登录密码',
        categoryKey: 'account_auth',
        levelCode: 'L4',
        rules: [
          {
            target: 'fieldName',
            matcher: 'contains',
            value: 'password,pwd,passphrase,login_pwd',
          },
          {
            target: 'fieldComment',
            matcher: 'contains',
            value: '密码,登录口令,认证密码',
          },
        ],
      },
      fieldDataType(
        '访问令牌',
        'account_auth',
        'L4',
        'access_token,refresh_token,bearer_token,session_token',
        '访问令牌,刷新令牌,会话令牌',
      ),
      fieldDataType(
        '应用访问密钥',
        'account_auth',
        'L4',
        'api_key,app_secret,client_secret,access_key,secret_key',
        'API密钥,应用密钥,客户端密钥,访问密钥',
      ),
      fieldDataType(
        '私钥',
        'account_auth',
        'L4',
        'private_key,signing_key,decryption_key',
        '私钥,签名密钥,解密密钥',
      ),
      fieldDataType(
        '动态验证码',
        'account_auth',
        'L4',
        'verify_code,verification_code,sms_code,otp_code,captcha_code',
        '验证码,短信校验码,动态口令,一次性密码',
      ),
      fieldDataType(
        '密保答案',
        'account_auth',
        'L4',
        'security_answer,security_response,password_answer',
        '密保答案,安全问题答案',
      ),
      {
        name: '银行卡号',
        categoryKey: 'financial_account',
        levelCode: 'L4',
        rules: [
          {
            target: 'fieldName',
            matcher: 'contains',
            value:
              'bank_card,bank_card_no,card_no,account_no,acct_no,payment_account',
          },
          {
            target: 'fieldComment',
            matcher: 'contains',
            value: '银行卡号,账户号,支付账户',
          },
        ],
      },
      fieldDataType(
        '支付认证凭据',
        'financial_account',
        'L4',
        'payment_password,pay_password,card_cvv,card_cvc,card_pin',
        '支付密码,交易密码,信用卡验证码,CVV,CVC,卡片PIN',
      ),
      fieldDataType(
        '卡片有效期',
        'financial_account',
        'L3',
        'valid_thru,expiry_date,expiration_date,card_expiry',
        '卡片有效期,信用卡有效期',
      ),
      fieldDataType(
        '征信信息',
        'financial_account',
        'L4',
        'credit_report,credit_score,overdue_amount,overdue_days',
        '征信报告,信用评分,逾期金额,逾期天数',
      ),
      fieldDataType(
        '授信借贷信息',
        'financial_account',
        'L4',
        'credit_limit,loan_balance,credit_balance,loan_status',
        '授信额度,贷款余额,授信余额,贷款状态',
      ),
      {
        name: '医疗诊疗信息',
        categoryKey: 'medical_health',
        levelCode: 'L4',
        rules: [
          {
            target: 'fieldName',
            matcher: 'contains',
            value:
              'medical_record,diagnosis_name,diagnosis_result,disease_history,patient_record,health_status,medical_institution',
          },
          {
            target: 'fieldComment',
            matcher: 'contains',
            value: '病历,诊断,健康,医疗',
          },
        ],
      },
      fieldDataType(
        '检验检查结果',
        'medical_health',
        'L4',
        'lab_result,exam_result,test_report,imaging_report',
        '检验结果,检查报告,化验结果,影像报告',
      ),
      fieldDataType(
        '用药处方信息',
        'medical_health',
        'L4',
        'prescription,medication,dosage,drug_allergy',
        '处方,用药记录,用药剂量,药物过敏',
      ),
      fieldDataType(
        '精确位置',
        'location_track',
        'L4',
        'geo_location,gps_coord,latitude,longitude,realtime_location',
        '精确位置,实时位置,经纬度,GPS坐标',
      ),
      fieldDataType(
        '行踪轨迹',
        'location_track',
        'L4',
        'location_track,position_trace,track_snapshot,trajectory',
        '定位轨迹,活动轨迹,行踪轨迹,位置序列',
      ),
      {
        name: '生物识别模板',
        categoryKey: 'biometric',
        levelCode: 'L4',
        rules: [
          {
            target: 'fieldName',
            matcher: 'contains',
            value: 'face,fingerprint,iris,voiceprint,biometric',
          },
          {
            target: 'fieldComment',
            matcher: 'contains',
            value: '人脸,指纹,虹膜,声纹,生物特征',
          },
        ],
      },
      fieldDataType(
        'IP 地址',
        'network_identity',
        'L3',
        'ip_address,client_ip,source_ip,destination_ip',
        'IP地址,客户端IP,来源IP,目标IP',
      ),
      fieldDataType(
        '终端设备标识',
        'network_identity',
        'L3',
        'device_id,device_fingerprint,imei,imsi,mac_address,cookie_id',
        '设备标识,设备指纹,IMEI,IMSI,MAC地址,Cookie标识',
      ),
      fieldDataType(
        '教育经历',
        'education_career',
        'L2',
        'education_level,degree_name,school_name,graduation_school',
        '学历,学位,毕业院校,教育经历',
      ),
      fieldDataType(
        '职业资格信息',
        'education_career',
        'L2',
        'occupation,work_experience,qualification_no,professional_title',
        '职业,工作经历,资格证书,职称',
      ),
      fieldDataType(
        '宗教信仰',
        'religion_ethnicity',
        'L4',
        'religion,religious_belief,faith',
        '宗教信仰,宗教,信仰',
      ),
      fieldDataType(
        '民族信息',
        'religion_ethnicity',
        'L3',
        'ethnicity,ethnic_group,nation_code',
        '民族,民族代码',
      ),
      fieldDataType(
        '政治面貌',
        'religion_ethnicity',
        'L4',
        'political_status,party_affiliation,political_affiliation',
        '政治面貌,党派,政治身份',
      ),
      fieldDataType(
        '国籍信息',
        'religion_ethnicity',
        'L2',
        'nationality,nationality_code,citizenship,country_of_citizenship',
        '国籍,国籍代码,公民身份国',
      ),
      fieldDataType(
        '未成年人个人信息',
        'minor_info',
        'L4',
        'minor_flag,child_name,child_age,under_14_flag',
        '未成年人,儿童姓名,儿童年龄,不满十四周岁',
      ),
      fieldDataType(
        '监护人信息',
        'minor_info',
        'L3',
        'guardian_name,guardian_phone,student_parent,parent_contact',
        '监护人,家长信息,监护人联系方式',
      ),
      fieldDataType(
        '个人财产信息',
        'property_info',
        'L3',
        'property_value,house_property,personal_asset,vehicle_property',
        '房产信息,资产价值,个人资产,车辆资产',
      ),
      fieldDataType(
        '个人收入缴存信息',
        'property_info',
        'L3',
        'annual_income,salary_amount,tax_amount,provident_fund',
        '个人收入,工资金额,纳税金额,公积金',
      ),
      {
        name: '通信内容',
        categoryKey: 'communication_content',
        levelCode: 'L4',
        rules: [
          {
            target: 'fieldName',
            matcher: 'contains',
            value:
              'message_content,sms_content,email_content,chat_content,call_recording',
          },
          {
            target: 'fieldComment',
            matcher: 'contains',
            value: '短信内容,邮件正文,聊天内容,通信内容,通话录音',
          },
        ],
      },
      fieldDataType(
        '联系人信息',
        'communication_content',
        'L3',
        'contact_person,emergency_contact_name,emergency_contact_phone',
        '联系人,紧急联系人,联系人电话',
      ),
      fieldDataType(
        '通讯录',
        'communication_content',
        'L4',
        'contact_list,address_book,contacts_data',
        '通讯录,联系人列表,地址簿',
      ),
      fieldDataType(
        '通话记录',
        'communication_content',
        'L4',
        'call_history,call_log,call_detail_record',
        '通话记录,呼叫记录,通话详单',
      ),
      fieldDataType(
        '浏览记录',
        'online_activity',
        'L3',
        'browse_history,visit_url,click_stream,referrer_url',
        '浏览记录,访问网址,点击流,来源网址',
      ),
      fieldDataType(
        '搜索记录',
        'online_activity',
        'L3',
        'search_history,search_keyword,query_text',
        '搜索记录,搜索关键词,查询内容',
      ),
      {
        name: '应用使用记录',
        categoryKey: 'online_activity',
        levelCode: 'L3',
        rules: [
          {
            target: 'fieldName',
            matcher: 'contains',
            value:
              'app_usage,use_duration,login_history,favorite_record,download_history',
          },
          {
            target: 'fieldComment',
            matcher: 'contains',
            value: '应用使用记录,使用时长,登录历史,收藏记录,下载记录',
          },
        ],
      },
      fieldDataType(
        '车辆标识',
        'vehicle_travel',
        'L3',
        'license_plate,vehicle_vin,vehicle_no',
        '车牌号,车辆识别码,车辆编号',
      ),
      fieldDataType(
        '出行票务',
        'vehicle_travel',
        'L3',
        'ticket_no,boarding_record,travel_ticket',
        '票务信息,乘车记录,登机记录',
      ),
      fieldDataType(
        '出行轨迹',
        'vehicle_travel',
        'L4',
        'trip_record,travel_route,trip_track',
        '行程记录,出行路线,出行轨迹',
      ),
      {
        name: '订单金额',
        categoryKey: 'transaction_order',
        levelCode: 'L2',
        rules: [
          {
            target: 'fieldName',
            matcher: 'contains',
            value:
              'order_amount,paid_amount,pay_amount,total_amount,transaction_amount,settlement_amount,settle_amount',
          },
          {
            target: 'fieldComment',
            matcher: 'contains',
            value: '订单金额,支付金额,结算金额',
          },
        ],
      },
      {
        name: '交易流水号',
        categoryKey: 'transaction_order',
        levelCode: 'L3',
        rules: [
          {
            target: 'fieldName',
            matcher: 'contains',
            value: 'trade_no,pay_no,transaction_id,order_id,order_no',
          },
          {
            target: 'fieldComment',
            matcher: 'contains',
            value: '交易流水,支付流水,订单号',
          },
        ],
      },
      fieldDataType(
        '收货人信息',
        'transaction_order',
        'L3',
        'receiver_name,receiver_phone,consignee',
        '收货人,收件人,收货电话',
      ),
      fieldDataType(
        '配送信息',
        'transaction_order',
        'L3',
        'shipping_address,delivery_address,delivery_detail',
        '配送地址,收货地址,配送详情',
      ),
      fieldDataType(
        '退款明细',
        'transaction_order',
        'L3',
        'refund_no,refund_amount,refund_detail',
        '退款流水,退款金额,退款明细',
      ),
      fieldDataType(
        '结算清算明细',
        'transaction_order',
        'L3',
        'settlement_no,settlement_detail,clearing_record',
        '结算单号,结算明细,清算记录',
      ),
      {
        name: '客户标签',
        categoryKey: 'customer_profile',
        levelCode: 'L3',
        rules: [
          {
            target: 'fieldName',
            matcher: 'contains',
            value:
              'customer_tag,user_tag,profile_label,customer_level,user_level,customer_profile',
          },
          {
            target: 'fieldComment',
            matcher: 'contains',
            value: '标签,画像,客户等级,用户分层',
          },
        ],
      },
      {
        name: '监管报送数据',
        categoryKey: 'risk_compliance',
        levelCode: 'L4',
        rules: [
          {
            target: 'tableName',
            matcher: 'contains',
            value: 'regulatory_report,regulator_submission,compliance_report',
          },
          {
            target: 'tableComment',
            matcher: 'contains',
            value: '监管报送,监管报告,合规报送',
          },
        ],
      },
      fieldDataType(
        '合同文件',
        'contract_agreement',
        'L3',
        'contract_content,contract_attachment,contract_clause',
        '合同正文,合同附件,合同条款',
      ),
      fieldDataType(
        '保密协议',
        'contract_agreement',
        'L4',
        'nda_content,confidentiality_agreement,confidentiality_clause',
        '保密协议,保密条款',
      ),
      fieldDataType(
        '招投标文件',
        'contract_agreement',
        'L4',
        'bid_document,tender_document,award_notice',
        '招标文件,投标文件,中标通知',
      ),
      fieldDataType(
        '供应商信息',
        'supply_logistics',
        'L2',
        'supplier_name,supplier_code,supplier_profile',
        '供应商名称,供应商编码,供应商资料',
      ),
      fieldDataType(
        '采购明细',
        'supply_logistics',
        'L3',
        'purchase_price,purchase_order,procurement_detail',
        '采购价格,采购订单,采购明细',
      ),
      {
        name: '物流运单信息',
        categoryKey: 'supply_logistics',
        levelCode: 'L3',
        rules: [
          {
            target: 'fieldName',
            matcher: 'contains',
            value:
              'tracking_no,waybill_no,logistics_route,warehouse_location,delivery_track',
          },
          {
            target: 'fieldComment',
            matcher: 'contains',
            value: '物流单号,运单号,物流轨迹,仓储位置,配送轨迹',
          },
        ],
      },
      fieldDataType(
        '源代码',
        'intellectual_property',
        'L4',
        'source_code,code_content,source_repository',
        '源代码,代码内容,代码仓库',
      ),
      fieldDataType(
        '核心算法模型',
        'intellectual_property',
        'L4',
        'algorithm_code,model_weight,model_parameter,formula_content',
        '核心算法,模型权重,模型参数,核心公式',
      ),
      fieldDataType(
        '商业秘密',
        'intellectual_property',
        'L4',
        'trade_secret,confidential_business_data,secret_material',
        '商业秘密,内部机密,秘密资料',
      ),
      fieldDataType(
        '技术研发资料',
        'intellectual_property',
        'L3',
        'technical_document,patent_draft,design_drawing,research_data',
        '技术文档,专利草稿,设计图纸,研发数据',
      ),
      fieldDataType(
        '自然人主体标识',
        'business_common',
        'L3',
        'customer_id,user_id,member_id,employee_id,patient_id',
        '客户ID,用户ID,会员ID,员工ID,患者ID',
      ),
      fieldDataType(
        '组织主体标识',
        'business_common',
        'L2',
        'supplier_id,merchant_id,organization_id,company_id',
        '供应商ID,商户ID,组织ID,企业ID',
      ),
      fieldDataType(
        '账户租户标识',
        'business_common',
        'L2',
        'account_id,tenant_id',
        '账户ID,租户ID',
      ),
      fieldDataType(
        '业务状态',
        'business_common',
        'L2',
        'order_status,payment_status,transaction_status,refund_status',
        '订单状态,支付状态,交易状态,退款状态',
      ),
      fieldDataType(
        '业务渠道',
        'business_common',
        'L2',
        'register_channel,register_source,channel_name,payment_method',
        '注册渠道,注册来源,渠道名称,支付方式',
      ),
      fieldDataType(
        '机构归属',
        'business_common',
        'L2',
        'bank_name,department_name,organization_name,branch_name,medical_institution',
        '银行名称,医疗机构,部门名称,组织名称,机构名称,分支机构',
      ),
      fieldDataType(
        '业务线归属',
        'business_common',
        'L2',
        'business_line,business_unit,product_line',
        '业务线,事业部,产品线',
      ),
      {
        name: '行政区划信息',
        categoryKey: 'business_common',
        levelCode: 'L2',
        rules: [
          {
            target: 'fieldName',
            matcher: 'contains',
            value:
              'province_name,city_name,district_name,region_code,administrative_area',
          },
          {
            target: 'fieldComment',
            matcher: 'contains',
            value: '省份名称,城市名称,区县名称,地区编码,行政区划',
          },
        ],
      },
      {
        name: '核心经营指标',
        categoryKey: 'operation_metrics',
        levelCode: 'L4',
        rules: [
          {
            target: 'fieldName',
            matcher: 'contains',
            value: 'gmv,revenue,gross_profit,arpu,inventory_turnover',
          },
          {
            target: 'fieldComment',
            matcher: 'contains',
            value: '营收,毛利,核心指标,GMV,库存周转',
          },
        ],
      },
      fieldDataType(
        '风控策略',
        'risk_compliance',
        'L4',
        'risk_strategy,risk_rule,anti_fraud_rule,strategy_variable',
        '风控策略,风控规则,反欺诈规则,策略变量',
      ),
      fieldDataType(
        '客户风险结果',
        'risk_compliance',
        'L4',
        'risk_score,fraud_label,blacklist,whitelist,risk_level',
        '风险评分,欺诈标签,黑名单,白名单,风险等级',
      ),
      {
        name: '员工档案',
        categoryKey: 'org_hr',
        levelCode: 'L3',
        rules: [
          {
            target: 'fieldName',
            matcher: 'contains',
            value: 'employee,staff,job_no,dept_name',
          },
          {
            target: 'fieldComment',
            matcher: 'contains',
            value: '员工,人事,组织,部门',
          },
        ],
      },
      fieldDataType(
        '考勤记录',
        'org_hr',
        'L3',
        'attendance_record,attendance_status,overtime_record,absence_record',
        '考勤记录,出勤状态,加班记录,缺勤记录',
      ),
      fieldDataType(
        '绩效信息',
        'org_hr',
        'L3',
        'performance_score,performance_result,performance_review',
        '绩效评分,绩效结果,绩效考核',
      ),
      fieldDataType(
        '薪酬信息',
        'org_hr',
        'L4',
        'salary_detail,bonus_amount,payroll,compensation_amount',
        '薪酬明细,奖金金额,工资单,薪资金额',
      ),
      {
        name: '审计日志',
        categoryKey: 'audit_log',
        levelCode: 'L2',
        rules: [
          {
            target: 'tableName',
            matcher: 'regex',
            value: '(^|_)(audit_.*log|operation_log|login_log)(book|s)?($|_)',
          },
          {
            target: 'tableComment',
            matcher: 'contains',
            value: '审计日志,操作日志,登录日志',
          },
        ],
      },
      {
        name: '主密钥材料',
        categoryKey: 'security_ops',
        levelCode: 'L5',
        rules: [
          {
            target: 'fieldName',
            matcher: 'contains',
            value: 'master_key,root_key,kms_master_key,key_encryption_key',
          },
          {
            target: 'fieldComment',
            matcher: 'contains',
            value: '主密钥,根密钥,KMS主密钥,密钥加密密钥',
          },
        ],
      },
      fieldDataType(
        '安全事件',
        'security_ops',
        'L4',
        'security_incident,security_alert,incident_detail',
        '安全事件,安全告警,事件详情',
      ),
      fieldDataType(
        '漏洞攻击信息',
        'security_ops',
        'L4',
        'vulnerability_detail,exploit_code,attack_path,cve_id',
        '漏洞详情,利用代码,攻击路径,CVE编号',
      ),
      fieldDataType(
        '应急预案',
        'security_ops',
        'L3',
        'emergency_plan,response_plan,contingency_plan',
        '应急预案,响应预案,处置预案',
      ),
      fieldDataType(
        '数据库连接地址',
        'infra_config',
        'L3',
        'database_url,db_connection,connection_string,jdbc_url',
        '数据库连接串,数据库地址,JDBC地址',
      ),
      fieldDataType(
        '数据库访问凭据',
        'infra_config',
        'L4',
        'database_password,db_password,db_username,database_credential',
        '数据库密码,数据库账号,数据库凭据',
      ),
      fieldDataType(
        '云访问凭据',
        'infra_config',
        'L4',
        'cloud_account,access_key_id,cloud_secret,cloud_credential',
        '云账号,访问密钥标识,云访问密钥,云凭据',
      ),
      fieldDataType(
        '网络拓扑配置',
        'infra_config',
        'L4',
        'network_topology,subnet_config,firewall_rule,route_config',
        '网络拓扑,子网配置,防火墙规则,路由配置',
      ),
      {
        name: '记录技术标识',
        categoryKey: 'data_management_meta',
        levelCode: 'L2',
        rules: [
          {
            target: 'fieldName',
            matcher: 'regex',
            value:
              '^(record|row|registry|archive|case|flow|event|metric|contact|note|log|audit|biometric|transaction|txn)_id$',
          },
          {
            target: 'fieldComment',
            matcher: 'equals',
            value: '记录ID',
          },
        ],
      },
      {
        name: '时间信息',
        categoryKey: 'data_management_meta',
        levelCode: 'L2',
        rules: [
          {
            target: 'fieldType',
            matcher: 'regex',
            value: '^(date|datetime|timestamp|time)(\\(\\d+\\))?$',
          },
          {
            target: 'fieldName',
            matcher: 'regex',
            value: '(^|_)(time|date|datetime|timestamp)$|_at$',
          },
          {
            target: 'fieldComment',
            matcher: 'contains',
            value: '时间,日期,年月,时刻',
          },
        ],
      },
      {
        name: '公开产品信息',
        categoryKey: 'public_disclosure',
        levelCode: 'L1',
        rules: [
          {
            target: 'tableName',
            matcher: 'contains',
            value: 'product,goods,public_catalog',
          },
          {
            target: 'fieldComment',
            matcher: 'contains',
            value: '商品名称,公开说明,对外展示',
          },
        ],
      },
      {
        name: '公开公告与公示',
        categoryKey: 'public_disclosure',
        levelCode: 'L1',
        rules: [
          {
            target: 'tableName',
            matcher: 'contains',
            value: 'public_notice,announcement,public_disclosure',
          },
          {
            target: 'tableComment',
            matcher: 'contains',
            value: '公开公告,公示信息,对外披露',
          },
        ],
      },
      {
        name: '匿名汇总统计',
        categoryKey: 'public_disclosure',
        levelCode: 'L1',
        rules: [
          {
            target: 'tableName',
            matcher: 'contains',
            value: 'public_statistics,open_data,anonymous_summary',
          },
          {
            target: 'tableComment',
            matcher: 'contains',
            value: '公开统计,开放数据,匿名汇总,去标识化统计',
          },
        ],
      },
    ];

    return dataTypes.map((dataType) => ({
      ...dataType,
      rules: [
        ...(CONTENT_RULES_BY_DATA_TYPE[dataType.name] ?? []),
        ...dataType.rules,
      ],
    }));
  }

  private async populateDefaultTemplate(templateId: string) {
    const levelMap = new Map<
      string,
      {
        id: string;
        isSensitive: boolean;
        needMask: boolean;
        needEncrypt: boolean;
      }
    >();
    for (const level of this.buildDefaultLevels()) {
      const createdLevel =
        await this.prisma.classificationLevelDefinition.create({
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
          parentId: category.parentKey
            ? categoryMap.get(category.parentKey)
            : undefined,
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
            hitRate:
              rule.target === 'sampleData' ? (rule.hitRate ?? 100) : null,
            sortOrder: index,
          },
        });
      }
    }
  }

  private async synchronizeBuiltInTemplate(templateId: string) {
    const levelMap = new Map<
      string,
      {
        id: string;
        isSensitive: boolean;
        needMask: boolean;
        needEncrypt: boolean;
      }
    >();

    for (const level of this.buildDefaultLevels()) {
      const existing =
        await this.prisma.classificationLevelDefinition.findUnique({
          where: { templateId_code: { templateId, code: level.code } },
        });
      const saved = existing
        ? await this.prisma.classificationLevelDefinition.update({
            where: { id: existing.id },
            data: level,
          })
        : await this.prisma.classificationLevelDefinition.create({
            data: { templateId, ...level },
          });
      levelMap.set(level.code, {
        id: saved.id,
        isSensitive: saved.isSensitive,
        needMask: saved.needMask,
        needEncrypt: saved.needEncrypt,
      });
    }

    const existingCategories =
      await this.prisma.classificationCategory.findMany({
        where: { templateId },
      });
    const existingCategoryMap = new Map(
      existingCategories.map((category) => [category.name, category]),
    );
    const categoryMap = new Map<string, string>();

    for (const category of this.buildDefaultCategories()) {
      const parentId = category.parentKey
        ? categoryMap.get(category.parentKey)
        : null;
      const existing =
        existingCategoryMap.get(category.name) ??
        (category.key === 'religion_ethnicity'
          ? existingCategoryMap.get('宗教信仰与民族')
          : undefined);
      const saved = existing
        ? await this.prisma.classificationCategory.update({
            where: { id: existing.id },
            data: {
              name: category.name,
              description: category.description,
              parentId,
              sortOrder: category.sortOrder,
            },
          })
        : await this.prisma.classificationCategory.create({
            data: {
              templateId,
              name: category.name,
              description: category.description,
              parentId,
              sortOrder: category.sortOrder,
            },
          });
      categoryMap.set(category.key, saved.id);
    }

    const existingDataTypes = await this.prisma.classificationDataType.findMany(
      {
        where: { templateId },
      },
    );
    const existingDataTypeMap = new Map(
      existingDataTypes.map((dataType) => [dataType.name, dataType]),
    );

    for (const dataType of this.buildDefaultDataTypes()) {
      const level = levelMap.get(dataType.levelCode);
      const categoryId = categoryMap.get(dataType.categoryKey);
      if (!level || !categoryId) continue;

      const existing =
        existingDataTypeMap.get(dataType.name) ??
        (dataType.name === '性别'
          ? existingDataTypeMap.get('出生日期与性别')
          : undefined);
      const saved = existing
        ? await this.prisma.classificationDataType.update({
            where: { id: existing.id },
            data: {
              name: dataType.name,
              categoryId,
              levelDefinitionId: level.id,
              isSensitive: level.isSensitive,
              needMask: level.needMask,
              needEncrypt: level.needEncrypt,
            },
          })
        : await this.prisma.classificationDataType.create({
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

      await this.prisma.classificationRule.deleteMany({
        where: { dataTypeId: saved.id },
      });
      for (const [index, rule] of dataType.rules.entries()) {
        await this.prisma.classificationRule.create({
          data: {
            dataTypeId: saved.id,
            target: rule.target,
            matcher: rule.matcher,
            value: rule.value,
            hitRate:
              rule.target === 'sampleData' ? (rule.hitRate ?? 100) : null,
            sortOrder: index,
          },
        });
      }
    }

    const obsoleteDataTypeIds = existingDataTypes
      .filter((dataType) => LEGACY_MERGED_DATA_TYPE_NAMES.has(dataType.name))
      .map((dataType) => dataType.id);
    if (obsoleteDataTypeIds.length > 0) {
      await this.prisma.dataAssetColumn.updateMany({
        where: { classificationDataTypeId: { in: obsoleteDataTypeIds } },
        data: {
          classificationDataTypeId: null,
          dataCategory: null,
          dataLevel: null,
          isSensitive: false,
          needMask: false,
          needEncrypt: false,
        },
      });
      await this.prisma.classificationRule.deleteMany({
        where: { dataTypeId: { in: obsoleteDataTypeIds } },
      });
      await this.prisma.classificationDataType.deleteMany({
        where: { id: { in: obsoleteDataTypeIds } },
      });
    }

    await this.prisma.classificationTemplate.update({
      where: { id: templateId },
      data: { description: DEFAULT_TEMPLATE_DESCRIPTION },
    });
  }

  async upgradeBuiltInTemplates() {
    const templates = await this.prisma.classificationTemplate.findMany({
      where: { templateType: 'built-in' },
      select: { id: true },
    });
    for (const template of templates) {
      await this.synchronizeBuiltInTemplate(template.id);
    }
    return templates.length;
  }

  private async createDefaultTemplate(meta?: DefaultTemplateMeta) {
    const template = await this.prisma.classificationTemplate.create({
      data: {
        templateName: meta?.templateName ?? '通用数据分类分级基线模板',
        templateType: meta?.templateType ?? 'built-in',
        description: meta?.description ?? DEFAULT_TEMPLATE_DESCRIPTION,
        status: meta?.status ?? TemplateStatus.ACTIVE,
      },
    });

    await this.populateDefaultTemplate(template.id);
    return this.findOne(template.id);
  }

  async seed() {
    let template = await this.prisma.classificationTemplate.findFirst({
      where: { templateType: 'built-in' },
      orderBy: { createdAt: 'asc' },
    });
    if (!template) {
      template = await this.createDefaultTemplate();
    }
    if (template) {
      await this.createLinkedTask(template.id, template.templateName);
    }
  }

  async findAll() {
    return this.prisma.classificationTemplate.findMany({
      include: this.getInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
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

    const created = await this.findOne(template.id);
    if (created) {
      await this.auditLogsService.record({
        category: AuditLogCategory.TEMPLATE,
        action: '创建分类模板',
        result: AuditLogResult.SUCCESS,
        actorName: '当前用户',
        targetType: 'classification-template',
        targetId: created.id,
        targetName: created.templateName,
        detail: created.description ?? '新建分类模板',
      });

      await this.createLinkedTask(created.id, created.templateName);
    }

    return created;
  }

  private async createLinkedTask(templateId: string, templateName: string) {
    const taskName = `${templateName}——导入完成后自动执行——分类分级任务`;
    // Check if a linked task already exists
    const existing = await this.prisma.classificationTask.findFirst({
      where: { templateId },
    });
    if (existing) return existing;

    return this.classificationTasksService.create({
      taskName,
      dataSource: templateName,
      dataAssetIds: [],
      dataType: 'database',
      classificationType: 'automatic',
      templateId,
      scheduleMode: 'auto_after_import',
      source: ClassificationTaskSource.CLASSIFICATION_CENTER,
      status: ClassificationTaskStatus.PENDING,
    });
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

    const updated = await this.findOne(id);
    if (updated) {
      await this.auditLogsService.record({
        category: AuditLogCategory.TEMPLATE,
        action: '更新分类模板',
        result: AuditLogResult.SUCCESS,
        actorName: '当前用户',
        targetType: 'classification-template',
        targetId: updated.id,
        targetName: updated.templateName,
        detail: updated.description ?? '更新模板配置',
      });
    }

    return updated;
  }

  async remove(id: string) {
    const template = await this.prisma.classificationTemplate.findUnique({
      where: { id },
    });

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

    await this.auditLogsService.record({
      category: AuditLogCategory.TEMPLATE,
      action: '删除分类模板',
      result: AuditLogResult.SUCCESS,
      actorName: '当前用户',
      targetType: 'classification-template',
      targetId: id,
      targetName: template?.templateName ?? '未知模板',
      detail: '分类模板及其明细已删除',
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
    const initialized = await this.findOne(id);
    if (initialized) {
      await this.auditLogsService.record({
        category: AuditLogCategory.TEMPLATE,
        action: '初始化分类模板',
        result: AuditLogResult.SUCCESS,
        actorName: '当前用户',
        targetType: 'classification-template',
        targetId: initialized.id,
        targetName: initialized.templateName,
        detail: '模板目录、级别和规则已恢复到默认基线',
      });
    }

    return initialized;
  }
}
