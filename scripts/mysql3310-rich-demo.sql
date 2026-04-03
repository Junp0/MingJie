SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS unclassified_misc_notes;
DROP TABLE IF EXISTS operation_metrics_daily;
DROP TABLE IF EXISTS audit_operation_logbook;
DROP TABLE IF EXISTS employee_hr_archive;
DROP TABLE IF EXISTS risk_control_casebook;
DROP TABLE IF EXISTS biometric_template_store;
DROP TABLE IF EXISTS location_track_events;
DROP TABLE IF EXISTS medical_health_records_3310;
DROP TABLE IF EXISTS payment_order_flow;
DROP TABLE IF EXISTS bank_account_registry;
DROP TABLE IF EXISTS account_auth_vault;
DROP TABLE IF EXISTS customer_contact_directory;
DROP TABLE IF EXISTS customer_identity_master;
DROP TABLE IF EXISTS public_product_catalog_3310;

CREATE TEMPORARY TABLE seq_120 (
  n INT PRIMARY KEY
);

INSERT INTO seq_120 (n)
WITH RECURSIVE seq AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM seq WHERE n < 120
)
SELECT n FROM seq;

CREATE TABLE public_product_catalog_3310 (
  product_id BIGINT PRIMARY KEY,
  product_code VARCHAR(32) NOT NULL UNIQUE COMMENT '产品编码',
  product_name VARCHAR(128) NOT NULL COMMENT '商品名称',
  goods_name VARCHAR(128) NOT NULL COMMENT '对外展示商品名称',
  category_name VARCHAR(64) NOT NULL COMMENT '公开分类',
  public_description VARCHAR(255) NOT NULL COMMENT '公开说明',
  publish_status VARCHAR(32) NOT NULL COMMENT '发布状态',
  updated_at DATETIME NOT NULL COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='对外展示产品目录';

CREATE TABLE customer_identity_master (
  customer_id BIGINT PRIMARY KEY,
  customer_no VARCHAR(32) NOT NULL UNIQUE COMMENT '客户编号',
  customer_name VARCHAR(64) NOT NULL COMMENT '客户姓名',
  real_name VARCHAR(64) NOT NULL COMMENT '真实姓名',
  id_card_no VARCHAR(32) NOT NULL COMMENT '身份证号码',
  cert_no VARCHAR(32) NOT NULL COMMENT '证件号码',
  gender VARCHAR(8) NOT NULL COMMENT '性别',
  birth_date DATE NOT NULL COMMENT '出生日期',
  customer_level VARCHAR(32) NOT NULL COMMENT '客户等级',
  profile_label VARCHAR(64) NOT NULL COMMENT '画像标签',
  register_channel VARCHAR(32) NOT NULL COMMENT '注册渠道',
  created_at DATETIME NOT NULL COMMENT '创建时间',
  updated_at DATETIME NOT NULL COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='客户基本身份信息';

CREATE TABLE customer_contact_directory (
  contact_id BIGINT PRIMARY KEY,
  customer_id BIGINT NOT NULL COMMENT '客户ID',
  mobile_phone VARCHAR(32) NOT NULL COMMENT '手机号',
  telephone_no VARCHAR(32) NOT NULL COMMENT '联系电话',
  email_address VARCHAR(128) NOT NULL COMMENT '电子邮箱',
  address_detail VARCHAR(255) NOT NULL COMMENT '地址详情',
  location_address VARCHAR(255) NOT NULL COMMENT '位置地址',
  city_name VARCHAR(64) NOT NULL COMMENT '城市名称',
  province_name VARCHAR(64) NOT NULL COMMENT '省份名称',
  emergency_contact_name VARCHAR(64) NOT NULL COMMENT '紧急联系人姓名',
  emergency_contact_phone VARCHAR(32) NOT NULL COMMENT '紧急联系电话',
  updated_at DATETIME NOT NULL COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='客户联系方式与地址信息';

CREATE TABLE account_auth_vault (
  account_id BIGINT PRIMARY KEY,
  customer_id BIGINT NOT NULL COMMENT '客户ID',
  login_account VARCHAR(64) NOT NULL UNIQUE COMMENT '登录账号',
  login_password VARCHAR(128) NOT NULL COMMENT '登录口令',
  password_hash VARCHAR(128) NOT NULL COMMENT '密码哈希',
  access_token VARCHAR(255) NOT NULL COMMENT '访问令牌',
  refresh_token VARCHAR(255) NOT NULL COMMENT '刷新令牌',
  api_key VARCHAR(128) NOT NULL COMMENT '密钥',
  app_secret VARCHAR(128) NOT NULL COMMENT '应用密钥',
  private_key TEXT NOT NULL COMMENT '私钥',
  master_key_material VARCHAR(128) NOT NULL COMMENT '主密钥材料',
  kms_key_ref VARCHAR(128) NOT NULL COMMENT 'KMS密钥引用',
  last_login_at DATETIME NOT NULL COMMENT '最近登录时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='账号认证与密钥保管信息';

CREATE TABLE bank_account_registry (
  registry_id BIGINT PRIMARY KEY,
  customer_id BIGINT NOT NULL COMMENT '客户ID',
  bank_name VARCHAR(64) NOT NULL COMMENT '银行名称',
  bank_card_no VARCHAR(64) NOT NULL COMMENT '银行卡号',
  account_no VARCHAR(64) NOT NULL COMMENT '账户号',
  acct_no VARCHAR(64) NOT NULL COMMENT '支付账户号',
  payment_account VARCHAR(64) NOT NULL COMMENT '支付账户',
  reserved_mobile VARCHAR(32) NOT NULL COMMENT '预留手机号',
  opened_at DATETIME NOT NULL COMMENT '开户时间',
  updated_at DATETIME NOT NULL COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='金融账户与银行卡信息';

CREATE TABLE payment_order_flow (
  flow_id BIGINT PRIMARY KEY,
  customer_id BIGINT NOT NULL COMMENT '客户ID',
  order_no VARCHAR(64) NOT NULL UNIQUE COMMENT '订单号',
  trade_no VARCHAR(64) NOT NULL UNIQUE COMMENT '交易流水',
  order_amount DECIMAL(12,2) NOT NULL COMMENT '订单金额',
  pay_amount DECIMAL(12,2) NOT NULL COMMENT '支付金额',
  settle_amount DECIMAL(12,2) NOT NULL COMMENT '结算金额',
  payment_method VARCHAR(32) NOT NULL COMMENT '支付方式',
  payment_status VARCHAR(32) NOT NULL COMMENT '支付状态',
  channel_name VARCHAR(32) NOT NULL COMMENT '渠道名称',
  order_time DATETIME NOT NULL COMMENT '下单时间',
  updated_at DATETIME NOT NULL COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单与支付流水信息';

CREATE TABLE medical_health_records_3310 (
  record_id BIGINT PRIMARY KEY,
  customer_id BIGINT NOT NULL COMMENT '客户ID',
  patient_name VARCHAR(64) NOT NULL COMMENT '患者姓名',
  medical_record_no VARCHAR(64) NOT NULL UNIQUE COMMENT '病历编号',
  diagnosis_name VARCHAR(128) NOT NULL COMMENT '诊断名称',
  medical_summary VARCHAR(255) NOT NULL COMMENT '医疗摘要',
  health_status VARCHAR(64) NOT NULL COMMENT '健康状态',
  prescription_note VARCHAR(255) NOT NULL COMMENT '处方建议',
  medical_institution VARCHAR(128) NOT NULL COMMENT '医疗机构',
  visit_time DATETIME NOT NULL COMMENT '就诊时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='医疗健康诊疗记录';

CREATE TABLE location_track_events (
  event_id BIGINT PRIMARY KEY,
  customer_id BIGINT NOT NULL COMMENT '客户ID',
  device_id VARCHAR(64) NOT NULL COMMENT '设备ID',
  ip_address VARCHAR(64) NOT NULL COMMENT 'IP地址',
  gps_latitude DECIMAL(10,6) NOT NULL COMMENT '纬度',
  gps_longitude DECIMAL(10,6) NOT NULL COMMENT '经度',
  location_address VARCHAR(255) NOT NULL COMMENT '位置地址',
  track_snapshot VARCHAR(255) NOT NULL COMMENT '轨迹快照',
  city_name VARCHAR(64) NOT NULL COMMENT '城市名称',
  event_time DATETIME NOT NULL COMMENT '事件时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='位置轨迹与地址采集事件';

CREATE TABLE biometric_template_store (
  biometric_id BIGINT PRIMARY KEY,
  customer_id BIGINT NOT NULL COMMENT '客户ID',
  biometric_vendor VARCHAR(64) NOT NULL COMMENT '生物识别供应商',
  face_template TEXT NOT NULL COMMENT '人脸特征模板',
  fingerprint_hash VARCHAR(128) NOT NULL COMMENT '指纹模板',
  iris_template TEXT NOT NULL COMMENT '虹膜模板',
  voiceprint_feature TEXT NOT NULL COMMENT '声纹特征',
  biometric_version VARCHAR(32) NOT NULL COMMENT '生物特征版本',
  updated_at DATETIME NOT NULL COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='生物识别模板样例库';

CREATE TABLE risk_control_casebook (
  case_id BIGINT PRIMARY KEY,
  customer_id BIGINT NOT NULL COMMENT '客户ID',
  risk_score INT NOT NULL COMMENT '风险评分',
  fraud_label VARCHAR(32) NOT NULL COMMENT '欺诈标签',
  blacklist_tag VARCHAR(32) NOT NULL COMMENT '黑名单标记',
  whitelist_tag VARCHAR(32) NOT NULL COMMENT '白名单标记',
  anti_fraud_strategy VARCHAR(128) NOT NULL COMMENT '反欺诈策略',
  risk_reason VARCHAR(255) NOT NULL COMMENT '风控原因',
  reviewed_at DATETIME NOT NULL COMMENT '审核时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='风控策略变量与审核案例';

CREATE TABLE employee_hr_archive (
  archive_id BIGINT PRIMARY KEY,
  employee_no VARCHAR(32) NOT NULL UNIQUE COMMENT '员工编号',
  employee_name VARCHAR(64) NOT NULL COMMENT '员工姓名',
  staff_name VARCHAR(64) NOT NULL COMMENT '员工姓名',
  job_no VARCHAR(32) NOT NULL COMMENT '工号',
  dept_name VARCHAR(64) NOT NULL COMMENT '部门名称',
  staff_mobile VARCHAR(32) NOT NULL COMMENT '员工手机号',
  id_card_no VARCHAR(32) NOT NULL COMMENT '身份证号码',
  salary_amount DECIMAL(12,2) NOT NULL COMMENT '薪资金额',
  hired_at DATETIME NOT NULL COMMENT '入职时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='员工人事档案信息';

CREATE TABLE audit_operation_logbook (
  log_id BIGINT PRIMARY KEY,
  operator_account VARCHAR(64) NOT NULL COMMENT '操作账号',
  login_log_no VARCHAR(64) NOT NULL COMMENT '登录日志编号',
  operation_type VARCHAR(64) NOT NULL COMMENT '操作类型',
  operation_target VARCHAR(128) NOT NULL COMMENT '操作对象',
  client_ip VARCHAR(64) NOT NULL COMMENT '客户端IP',
  request_payload TEXT NOT NULL COMMENT '请求报文',
  result_status VARCHAR(32) NOT NULL COMMENT '结果状态',
  created_at DATETIME NOT NULL COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='审计日志与操作日志样例';

CREATE TABLE operation_metrics_daily (
  metric_id BIGINT PRIMARY KEY,
  metric_date DATE NOT NULL COMMENT '统计日期',
  business_line VARCHAR(64) NOT NULL COMMENT '业务线',
  gmv DECIMAL(14,2) NOT NULL COMMENT 'GMV',
  revenue DECIMAL(14,2) NOT NULL COMMENT '营收',
  gross_profit DECIMAL(14,2) NOT NULL COMMENT '毛利',
  arpu DECIMAL(10,2) NOT NULL COMMENT 'ARPU',
  inventory_turnover DECIMAL(10,2) NOT NULL COMMENT '库存周转',
  updated_at DATETIME NOT NULL COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='核心经营指标日报';

CREATE TABLE unclassified_misc_notes (
  note_id BIGINT PRIMARY KEY,
  misc_code VARCHAR(32) NOT NULL UNIQUE COMMENT '杂项编码',
  note_topic VARCHAR(128) NOT NULL COMMENT '主题',
  note_body TEXT NOT NULL COMMENT '内容',
  owner_alias VARCHAR(64) NOT NULL COMMENT '责任人别名',
  stage_flag VARCHAR(32) NOT NULL COMMENT '阶段标识',
  updated_at DATETIME NOT NULL COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='故意保留未分类字段的杂项样例表';

INSERT INTO public_product_catalog_3310 (
  product_id, product_code, product_name, goods_name, category_name,
  public_description, publish_status, updated_at
)
SELECT
  n,
  CONCAT('PROD3310', LPAD(n, 5, '0')),
  CONCAT(ELT(1 + MOD(n, 6), '灵犀会员包', '安心出行险', '企业采购卡', '云盾安全盒', '数智报表订阅', '成长礼遇计划'), LPAD(n, 3, '0')),
  CONCAT(ELT(1 + MOD(n, 6), '灵犀会员包', '安心出行险', '企业采购卡', '云盾安全盒', '数智报表订阅', '成长礼遇计划'), '-公开版-', LPAD(n, 3, '0')),
  ELT(1 + MOD(n, 5), '会员服务', '保险服务', '金融服务', '安全产品', '数据服务'),
  CONCAT('对外展示商品说明-', LPAD(n, 3, '0'), '，适合人工导入验证公开产品信息分类场景。'),
  ELT(1 + MOD(n, 4), 'PUBLISHED', 'ON_SHELF', 'PREVIEW', 'ARCHIVED'),
  DATE_ADD('2026-01-01 09:00:00', INTERVAL n DAY)
FROM seq_120;

INSERT INTO customer_identity_master (
  customer_id, customer_no, customer_name, real_name, id_card_no, cert_no,
  gender, birth_date, customer_level, profile_label, register_channel, created_at, updated_at
)
SELECT
  n,
  CONCAT('CUST3310', LPAD(n, 5, '0')),
  CONCAT(ELT(1 + MOD(n, 10), '张晨曦', '李沐阳', '王书航', '赵知夏', '陈以宁', '周景行', '吴若溪', '郑可唯', '孙嘉禾', '林语安'), LPAD(n, 3, '0')),
  CONCAT(ELT(1 + MOD(n, 10), '张晨曦', '李沐阳', '王书航', '赵知夏', '陈以宁', '周景行', '吴若溪', '郑可唯', '孙嘉禾', '林语安'), '实名', LPAD(n, 3, '0')),
  CONCAT('31010119', LPAD(80 + MOD(n, 20), 2, '0'), LPAD(1 + MOD(n, 12), 2, '0'), LPAD(1 + MOD(n, 28), 2, '0'), LPAD(n, 4, '0')),
  CONCAT('CERT', LPAD(n, 8, '0')),
  ELT(1 + MOD(n, 2), '男', '女'),
  DATE_ADD('1980-01-01', INTERVAL MOD(n * 37, 12000) DAY),
  ELT(1 + MOD(n, 4), '普通客户', '银卡客户', '金卡客户', '钻石客户'),
  ELT(1 + MOD(n, 5), '高价值用户', '沉睡待激活', '风险敏感客群', '高复购会员', '新客观察组'),
  ELT(1 + MOD(n, 4), 'APP', 'WEB', 'WECHAT', 'OFFLINE'),
  DATE_ADD('2025-01-01 08:00:00', INTERVAL n DAY),
  DATE_ADD('2026-02-01 09:00:00', INTERVAL n HOUR)
FROM seq_120;

INSERT INTO customer_contact_directory (
  contact_id, customer_id, mobile_phone, telephone_no, email_address, address_detail,
  location_address, city_name, province_name, emergency_contact_name, emergency_contact_phone, updated_at
)
SELECT
  n,
  n,
  CONCAT('13', LPAD(800000000 + n, 9, '0')),
  CONCAT('0755-', LPAD(100000 + n, 6, '0')),
  CONCAT('customer', LPAD(n, 4, '0'), '@demo3310.example.com'),
  CONCAT(ELT(1 + MOD(n, 6), '科技园一路', '金融大道', '云栖路', '星河街', '高新南九道', '望京东路'), n, '号', ELT(1 + MOD(n, 4), 'A座', 'B座', 'C座', 'D座')),
  CONCAT(ELT(1 + MOD(n, 6), '深圳南山区', '上海浦东新区', '北京朝阳区', '杭州滨江区', '苏州工业园区', '广州天河区'), ELT(1 + MOD(n, 4), '智造园', '科技城', '创新港', '数科中心')),
  ELT(1 + MOD(n, 6), '深圳', '上海', '北京', '杭州', '苏州', '广州'),
  ELT(1 + MOD(n, 6), '广东', '上海', '北京', '浙江', '江苏', '广东'),
  CONCAT(ELT(1 + MOD(n, 8), '张建国', '李桂芳', '王海涛', '陈秀兰', '赵志强', '周秋华', '吴春梅', '郑立新'), LPAD(n, 2, '0')),
  CONCAT('15', LPAD(600000000 + n, 9, '0')),
  DATE_ADD('2026-02-10 10:00:00', INTERVAL n HOUR)
FROM seq_120;

INSERT INTO account_auth_vault (
  account_id, customer_id, login_account, login_password, password_hash, access_token,
  refresh_token, api_key, app_secret, private_key, master_key_material, kms_key_ref, last_login_at
)
SELECT
  n,
  n,
  CONCAT('acct3310_', LPAD(n, 5, '0')),
  CONCAT('Pwd#', LPAD(n, 5, '0'), '!Demo'),
  SHA2(CONCAT('Pwd#', LPAD(n, 5, '0'), '!Demo'), 256),
  CONCAT('atk_3310_', SHA2(CONCAT('access', n), 256)),
  CONCAT('rtk_3310_', SHA2(CONCAT('refresh', n), 256)),
  CONCAT('ak_3310_', SHA2(CONCAT('api', n), 256)),
  CONCAT('secret_3310_', SHA2(CONCAT('secret', n), 256)),
  CONCAT('private_key_material_', SHA2(CONCAT('private', n), 256)),
  CONCAT('master_key_material_', SHA2(CONCAT('master', n), 256)),
  CONCAT('kms/key/import-demo-3310/', LPAD(n, 5, '0')),
  DATE_ADD('2026-03-01 08:00:00', INTERVAL n HOUR)
FROM seq_120;

INSERT INTO bank_account_registry (
  registry_id, customer_id, bank_name, bank_card_no, account_no, acct_no,
  payment_account, reserved_mobile, opened_at, updated_at
)
SELECT
  n,
  n,
  ELT(1 + MOD(n, 6), '招商银行', '建设银行', '工商银行', '中国银行', '农业银行', '交通银行'),
  CONCAT('6222', LPAD(100000000000 + n, 12, '0')),
  CONCAT('ACCOUNT3310', LPAD(n, 6, '0')),
  CONCAT('ACCT3310', LPAD(n, 6, '0')),
  CONCAT('PAY3310', LPAD(n, 6, '0')),
  CONCAT('13', LPAD(810000000 + n, 9, '0')),
  DATE_ADD('2024-01-01 10:00:00', INTERVAL n DAY),
  DATE_ADD('2026-03-03 10:00:00', INTERVAL n HOUR)
FROM seq_120;

INSERT INTO payment_order_flow (
  flow_id, customer_id, order_no, trade_no, order_amount, pay_amount,
  settle_amount, payment_method, payment_status, channel_name, order_time, updated_at
)
SELECT
  n,
  n,
  CONCAT('ORD3310', LPAD(n, 8, '0')),
  CONCAT('TRADE3310', LPAD(n, 8, '0')),
  ROUND(99 + n * 13.25, 2),
  ROUND(99 + n * 13.25 - MOD(n, 5) * 2.10, 2),
  ROUND(95 + n * 12.85 - MOD(n, 7) * 1.35, 2),
  ELT(1 + MOD(n, 5), 'ALIPAY', 'WECHAT_PAY', 'UNIONPAY', 'CREDIT_CARD', 'CASH'),
  ELT(1 + MOD(n, 4), 'PAID', 'REFUNDED', 'PENDING', 'SETTLED'),
  ELT(1 + MOD(n, 4), 'APP', 'WEB', 'WECHAT', 'OFFLINE'),
  DATE_ADD('2026-01-10 09:00:00', INTERVAL n HOUR),
  DATE_ADD('2026-03-05 11:00:00', INTERVAL n HOUR)
FROM seq_120;

INSERT INTO medical_health_records_3310 (
  record_id, customer_id, patient_name, medical_record_no, diagnosis_name, medical_summary,
  health_status, prescription_note, medical_institution, visit_time
)
SELECT
  n,
  n,
  CONCAT('患者', LPAD(n, 4, '0')),
  CONCAT('MR3310', LPAD(n, 8, '0')),
  ELT(1 + MOD(n, 6), '高血压', '糖脂代谢异常', '腰肌劳损', '过敏性鼻炎', '慢性胃炎', '睡眠障碍'),
  CONCAT('医疗摘要-', LPAD(n, 4, '0'), '，用于验证医疗诊疗信息导入场景。'),
  ELT(1 + MOD(n, 4), '稳定', '观察中', '恢复中', '需复诊'),
  CONCAT('处方建议-', LPAD(n, 4, '0'), '，建议定期随访。'),
  ELT(1 + MOD(n, 5), '深圳市人民医院', '上海市东方医院', '北京协和医院', '杭州市第一人民医院', '苏州大学附属医院'),
  DATE_ADD('2026-01-15 08:30:00', INTERVAL n DAY)
FROM seq_120;

INSERT INTO location_track_events (
  event_id, customer_id, device_id, ip_address, gps_latitude, gps_longitude,
  location_address, track_snapshot, city_name, event_time
)
SELECT
  n,
  n,
  CONCAT('DEV3310-', LPAD(n, 6, '0')),
  CONCAT('10.', 10 + MOD(n, 20), '.', 20 + MOD(n, 30), '.', 30 + MOD(n, 200)),
  ROUND(22.50 + n * 0.001, 6),
  ROUND(113.90 + n * 0.001, 6),
  CONCAT(ELT(1 + MOD(n, 6), '深圳南山区科技园', '上海浦东张江', '北京朝阳望京', '杭州滨江网商路', '苏州工业园区', '广州天河智慧城'), '-', LPAD(n, 3, '0')),
  CONCAT('track_snapshot_', LPAD(n, 5, '0')),
  ELT(1 + MOD(n, 6), '深圳', '上海', '北京', '杭州', '苏州', '广州'),
  DATE_ADD('2026-02-01 07:00:00', INTERVAL n HOUR)
FROM seq_120;

INSERT INTO biometric_template_store (
  biometric_id, customer_id, biometric_vendor, face_template, fingerprint_hash,
  iris_template, voiceprint_feature, biometric_version, updated_at
)
SELECT
  n,
  n,
  ELT(1 + MOD(n, 4), 'SenseID', 'BioMatrix', 'VoiceSecure', 'IrisTrust'),
  CONCAT('face_template_', SHA2(CONCAT('face', n), 256)),
  SHA2(CONCAT('fingerprint', n), 256),
  CONCAT('iris_template_', SHA2(CONCAT('iris', n), 256)),
  CONCAT('voiceprint_feature_', SHA2(CONCAT('voice', n), 256)),
  CONCAT('v', 1 + MOD(n, 5), '.', MOD(n, 10)),
  DATE_ADD('2026-02-12 09:00:00', INTERVAL n HOUR)
FROM seq_120;

INSERT INTO risk_control_casebook (
  case_id, customer_id, risk_score, fraud_label, blacklist_tag,
  whitelist_tag, anti_fraud_strategy, risk_reason, reviewed_at
)
SELECT
  n,
  n,
  20 + MOD(n * 9, 81),
  ELT(1 + MOD(n, 4), 'NORMAL', 'SUSPECT', 'ALERT', 'BLOCK'),
  ELT(1 + MOD(n, 3), 'Y', 'N', 'N'),
  ELT(1 + MOD(n, 3), 'N', 'Y', 'N'),
  CONCAT('anti_fraud_strategy_', LPAD(n, 4, '0')),
  CONCAT('风险评分说明-', LPAD(n, 4, '0'), '，命中黑名单/白名单/设备风险等变量。'),
  DATE_ADD('2026-02-20 10:00:00', INTERVAL n HOUR)
FROM seq_120;

INSERT INTO employee_hr_archive (
  archive_id, employee_no, employee_name, staff_name, job_no, dept_name,
  staff_mobile, id_card_no, salary_amount, hired_at
)
SELECT
  n,
  CONCAT('EMP3310', LPAD(n, 5, '0')),
  CONCAT(ELT(1 + MOD(n, 8), '周文涛', '孙佳宁', '马晨曦', '罗诗语', '彭一凡', '韩知礼', '顾景行', '许念初'), LPAD(n, 3, '0')),
  CONCAT(ELT(1 + MOD(n, 8), '周文涛', '孙佳宁', '马晨曦', '罗诗语', '彭一凡', '韩知礼', '顾景行', '许念初'), '-员工', LPAD(n, 3, '0')),
  CONCAT('JOB', LPAD(n, 6, '0')),
  ELT(1 + MOD(n, 6), '数据治理平台', '安全风控部', '数据平台部', '基础架构部', '增长分析部', '财务科技部'),
  CONCAT('17', LPAD(500000000 + n, 9, '0')),
  CONCAT('44010319', LPAD(82 + MOD(n, 18), 2, '0'), LPAD(1 + MOD(n, 12), 2, '0'), LPAD(1 + MOD(n, 28), 2, '0'), LPAD(n, 4, '0')),
  ROUND(18000 + n * 135.75, 2),
  DATE_ADD('2021-01-01 09:00:00', INTERVAL n DAY)
FROM seq_120;

INSERT INTO audit_operation_logbook (
  log_id, operator_account, login_log_no, operation_type, operation_target,
  client_ip, request_payload, result_status, created_at
)
SELECT
  n,
  CONCAT('operator_', LPAD(n, 4, '0')),
  CONCAT('LOGINLOG3310', LPAD(n, 6, '0')),
  ELT(1 + MOD(n, 6), 'LOGIN', 'EXPORT_DATA', 'UPDATE_RULE', 'QUERY_ASSET', 'DOWNLOAD_REPORT', 'SYNC_CONFIG'),
  ELT(1 + MOD(n, 6), 'customer_identity_master', 'risk_control_casebook', 'payment_order_flow', 'biometric_template_store', 'operation_metrics_daily', 'account_auth_vault'),
  CONCAT('172.16.', 10 + MOD(n, 20), '.', 20 + MOD(n, 200)),
  CONCAT('{\"operator\":\"', LPAD(n, 4, '0'), '\",\"scope\":\"manual-import-test\",\"batch\":', n, '}'),
  ELT(1 + MOD(n, 3), 'SUCCESS', 'SUCCESS', 'FAILED'),
  DATE_ADD('2026-03-01 08:15:00', INTERVAL n MINUTE)
FROM seq_120;

INSERT INTO operation_metrics_daily (
  metric_id, metric_date, business_line, gmv, revenue, gross_profit,
  arpu, inventory_turnover, updated_at
)
SELECT
  n,
  DATE_ADD('2025-11-01', INTERVAL n DAY),
  ELT(1 + MOD(n, 5), '零售电商', '金融服务', '会员运营', '企业业务', '渠道合作'),
  ROUND(100000 + n * 2350.55, 2),
  ROUND(28000 + n * 760.15, 2),
  ROUND(12000 + n * 330.45, 2),
  ROUND(66 + MOD(n * 3, 40) + n * 0.15, 2),
  ROUND(2.5 + MOD(n, 8) * 0.35, 2),
  DATE_ADD('2026-03-10 09:30:00', INTERVAL n HOUR)
FROM seq_120;

INSERT INTO unclassified_misc_notes (
  note_id, misc_code, note_topic, note_body, owner_alias, stage_flag, updated_at
)
SELECT
  n,
  CONCAT('MISC3310', LPAD(n, 5, '0')),
  CONCAT('导入测试杂项主题-', LPAD(n, 4, '0')),
  CONCAT('这是一条故意保留未分类字段的样例内容-', LPAD(n, 4, '0'), '，用于验证未命中规则时的展示行为。'),
  CONCAT('alias_', LPAD(n, 4, '0')),
  ELT(1 + MOD(n, 4), 'draft', 'review', 'release', 'archive'),
  DATE_ADD('2026-03-12 10:00:00', INTERVAL n HOUR)
FROM seq_120;

DROP TEMPORARY TABLE IF EXISTS seq_120;

SET FOREIGN_KEY_CHECKS = 1;
