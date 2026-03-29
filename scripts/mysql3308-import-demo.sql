SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS audit_operation_logs;
DROP TABLE IF EXISTS employee_records;
DROP TABLE IF EXISTS medical_health_records;
DROP TABLE IF EXISTS location_track_logs;
DROP TABLE IF EXISTS payment_transactions;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS bank_accounts;
DROP TABLE IF EXISTS account_credentials;
DROP TABLE IF EXISTS customer_contact;
DROP TABLE IF EXISTS customer_profile;
DROP TABLE IF EXISTS public_product_catalog;

CREATE TABLE customer_profile (
  customer_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  customer_no VARCHAR(32) NOT NULL UNIQUE,
  full_name VARCHAR(64) NOT NULL,
  id_card_no VARCHAR(32) NOT NULL,
  gender VARCHAR(16),
  birth_date DATE,
  customer_level VARCHAR(32),
  register_source VARCHAR(32),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE customer_contact (
  contact_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  customer_id BIGINT NOT NULL,
  mobile_phone VARCHAR(32) NOT NULL,
  email VARCHAR(128),
  address_detail VARCHAR(255),
  city_name VARCHAR(64),
  province_name VARCHAR(64),
  emergency_contact_name VARCHAR(64),
  emergency_contact_phone VARCHAR(32),
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_customer_contact_customer FOREIGN KEY (customer_id) REFERENCES customer_profile(customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE account_credentials (
  account_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  customer_id BIGINT NOT NULL,
  username VARCHAR(64) NOT NULL UNIQUE,
  login_password_hash VARCHAR(255) NOT NULL,
  password_salt VARCHAR(128) NOT NULL,
  access_token VARCHAR(255),
  refresh_token VARCHAR(255),
  api_key VARCHAR(128),
  private_key_ref VARCHAR(128),
  last_login_at DATETIME,
  CONSTRAINT fk_account_credentials_customer FOREIGN KEY (customer_id) REFERENCES customer_profile(customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE bank_accounts (
  bank_account_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  customer_id BIGINT NOT NULL,
  bank_name VARCHAR(64) NOT NULL,
  bank_card_no VARCHAR(64) NOT NULL,
  account_no VARCHAR(64) NOT NULL,
  reserved_mobile VARCHAR(32),
  payment_account VARCHAR(64),
  opened_at DATETIME,
  CONSTRAINT fk_bank_accounts_customer FOREIGN KEY (customer_id) REFERENCES customer_profile(customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE orders (
  order_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  customer_id BIGINT NOT NULL,
  order_no VARCHAR(64) NOT NULL UNIQUE,
  order_amount DECIMAL(12,2) NOT NULL,
  paid_amount DECIMAL(12,2) NOT NULL,
  order_status VARCHAR(32) NOT NULL,
  channel_name VARCHAR(32),
  order_time DATETIME NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customer_profile(customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE payment_transactions (
  txn_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT NOT NULL,
  trade_no VARCHAR(64) NOT NULL UNIQUE,
  payment_method VARCHAR(32),
  payment_account VARCHAR(64),
  transaction_amount DECIMAL(12,2) NOT NULL,
  settlement_amount DECIMAL(12,2),
  risk_score INT,
  transaction_time DATETIME NOT NULL,
  CONSTRAINT fk_payment_transactions_order FOREIGN KEY (order_id) REFERENCES orders(order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE location_track_logs (
  log_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  customer_id BIGINT NOT NULL,
  device_id VARCHAR(64),
  ip_address VARCHAR(64),
  latitude DECIMAL(10,6),
  longitude DECIMAL(10,6),
  location_address VARCHAR(255),
  event_time DATETIME NOT NULL,
  CONSTRAINT fk_location_track_customer FOREIGN KEY (customer_id) REFERENCES customer_profile(customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE medical_health_records (
  record_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  customer_id BIGINT NOT NULL,
  diagnosis_name VARCHAR(128),
  medical_institution VARCHAR(128),
  health_status VARCHAR(64),
  prescription_note VARCHAR(255),
  visit_time DATETIME NOT NULL,
  CONSTRAINT fk_medical_records_customer FOREIGN KEY (customer_id) REFERENCES customer_profile(customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE employee_records (
  employee_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employee_no VARCHAR(32) NOT NULL UNIQUE,
  employee_name VARCHAR(64) NOT NULL,
  department_name VARCHAR(64),
  mobile_phone VARCHAR(32),
  id_card_no VARCHAR(32),
  salary_amount DECIMAL(12,2),
  hired_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE audit_operation_logs (
  audit_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  operator_account VARCHAR(64) NOT NULL,
  operation_type VARCHAR(64) NOT NULL,
  operation_target VARCHAR(128),
  client_ip VARCHAR(64),
  request_payload TEXT,
  created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE public_product_catalog (
  product_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  product_code VARCHAR(32) NOT NULL UNIQUE,
  product_name VARCHAR(128) NOT NULL,
  category_name VARCHAR(64),
  public_description VARCHAR(255),
  publish_status VARCHAR(32),
  updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO customer_profile (customer_no, full_name, id_card_no, gender, birth_date, customer_level, register_source, created_at) VALUES
('CUST0001', '张明杰', '440102199105186512', '男', '1991-05-18', 'VIP', 'APP', '2025-09-01 09:12:00'),
('CUST0002', '李若楠', '310110199411223428', '女', '1994-11-22', 'GOLD', 'WECHAT', '2025-09-05 14:18:00'),
('CUST0003', '王思琪', '110105198812094216', '女', '1988-12-09', 'SILVER', 'WEB', '2025-09-09 17:40:00'),
('CUST0004', '陈宇航', '320583199703076833', '男', '1997-03-07', 'VIP', 'APP', '2025-09-15 10:03:00'),
('CUST0005', '赵可心', '330102199612306024', '女', '1996-12-30', 'NORMAL', 'OFFLINE', '2025-09-18 08:25:00');

INSERT INTO customer_contact (customer_id, mobile_phone, email, address_detail, city_name, province_name, emergency_contact_name, emergency_contact_phone) VALUES
(1, '13800138001', 'mingjie.zhang@example.com', '南山区科技园一路88号', '深圳', '广东', '张建国', '13900139001'),
(2, '13800138002', 'ruonan.li@example.com', '杨浦区政学路200号', '上海', '上海', '李桂芳', '13900139002'),
(3, '13800138003', 'siqi.wang@example.com', '朝阳区建国门外大街18号', '北京', '北京', '王海涛', '13900139003'),
(4, '13800138004', 'yuhang.chen@example.com', '苏州工业园区星湖街218号', '苏州', '江苏', '陈秀兰', '13900139004'),
(5, '13800138005', 'kexin.zhao@example.com', '杭州市滨江区网商路699号', '杭州', '浙江', '赵志强', '13900139005');

INSERT INTO account_credentials (customer_id, username, login_password_hash, password_salt, access_token, refresh_token, api_key, private_key_ref, last_login_at) VALUES
(1, 'zhang_mj', 'pbkdf2$demo$3f6f1f2d7e1', 'salt_mj_001', 'atk_demo_zhang_001', 'rtk_demo_zhang_001', 'ak_demo_001', 'kms/key/customer/001', '2026-03-27 21:15:00'),
(2, 'li_rn', 'pbkdf2$demo$4f6a2c8d9b2', 'salt_rn_002', 'atk_demo_li_002', 'rtk_demo_li_002', 'ak_demo_002', 'kms/key/customer/002', '2026-03-27 20:05:00'),
(3, 'wang_sq', 'pbkdf2$demo$5a1b3d9f4c1', 'salt_sq_003', 'atk_demo_wang_003', 'rtk_demo_wang_003', 'ak_demo_003', 'kms/key/customer/003', '2026-03-28 09:10:00'),
(4, 'chen_yh', 'pbkdf2$demo$6b2c4e1f7d6', 'salt_yh_004', 'atk_demo_chen_004', 'rtk_demo_chen_004', 'ak_demo_004', 'kms/key/customer/004', '2026-03-28 08:42:00'),
(5, 'zhao_kx', 'pbkdf2$demo$7c3d5f2a8e7', 'salt_kx_005', 'atk_demo_zhao_005', 'rtk_demo_zhao_005', 'ak_demo_005', 'kms/key/customer/005', '2026-03-28 07:58:00');

INSERT INTO bank_accounts (customer_id, bank_name, bank_card_no, account_no, reserved_mobile, payment_account, opened_at) VALUES
(1, '招商银行', '6225881234560001', 'ACCT100001', '13800138001', 'PAY100001', '2024-05-10 11:20:00'),
(2, '建设银行', '6217001234560002', 'ACCT100002', '13800138002', 'PAY100002', '2024-06-11 10:18:00'),
(3, '工商银行', '6222001234560003', 'ACCT100003', '13800138003', 'PAY100003', '2024-07-15 12:30:00'),
(4, '中国银行', '6216611234560004', 'ACCT100004', '13800138004', 'PAY100004', '2024-08-19 13:45:00'),
(5, '农业银行', '6228481234560005', 'ACCT100005', '13800138005', 'PAY100005', '2024-09-02 09:05:00');

INSERT INTO orders (customer_id, order_no, order_amount, paid_amount, order_status, channel_name, order_time) VALUES
(1, 'ORD202603280001', 299.90, 299.90, 'PAID', 'APP', '2026-03-21 13:15:00'),
(2, 'ORD202603280002', 1599.00, 1599.00, 'PAID', 'WEB', '2026-03-22 09:45:00'),
(3, 'ORD202603280003', 88.50, 88.50, 'PAID', 'WECHAT', '2026-03-22 18:20:00'),
(4, 'ORD202603280004', 699.00, 699.00, 'REFUNDED', 'APP', '2026-03-24 16:12:00'),
(5, 'ORD202603280005', 49.90, 49.90, 'PAID', 'OFFLINE', '2026-03-25 11:08:00');

INSERT INTO payment_transactions (order_id, trade_no, payment_method, payment_account, transaction_amount, settlement_amount, risk_score, transaction_time) VALUES
(1, 'TRADE202603280001', 'ALIPAY', 'PAY100001', 299.90, 295.90, 12, '2026-03-21 13:16:00'),
(2, 'TRADE202603280002', 'WECHAT_PAY', 'PAY100002', 1599.00, 1583.00, 18, '2026-03-22 09:46:00'),
(3, 'TRADE202603280003', 'UNIONPAY', 'PAY100003', 88.50, 87.00, 6, '2026-03-22 18:21:00'),
(4, 'TRADE202603280004', 'ALIPAY', 'PAY100004', 699.00, 690.00, 66, '2026-03-24 16:13:00'),
(5, 'TRADE202603280005', 'CASH', 'PAY100005', 49.90, 49.90, 2, '2026-03-25 11:09:00');

INSERT INTO location_track_logs (customer_id, device_id, ip_address, latitude, longitude, location_address, event_time) VALUES
(1, 'DEV-1001', '10.10.8.11', 22.540100, 113.934500, '深圳市南山区科技园', '2026-03-25 08:30:00'),
(2, 'DEV-1002', '10.10.8.12', 31.299700, 121.498000, '上海市杨浦区政学路', '2026-03-25 09:15:00'),
(3, 'DEV-1003', '10.10.8.13', 39.904200, 116.407400, '北京市朝阳区国贸', '2026-03-26 10:40:00'),
(4, 'DEV-1004', '10.10.8.14', 31.298900, 120.585300, '苏州市工业园区', '2026-03-26 12:05:00'),
(5, 'DEV-1005', '10.10.8.15', 30.274100, 120.155100, '杭州市滨江区网商路', '2026-03-27 14:22:00');

INSERT INTO medical_health_records (customer_id, diagnosis_name, medical_institution, health_status, prescription_note, visit_time) VALUES
(1, '高血压', '深圳市人民医院', '稳定', '建议低盐饮食并复查血压', '2026-01-13 10:20:00'),
(2, '过敏性鼻炎', '上海市东方医院', '改善中', '按需使用抗过敏药物', '2026-02-08 09:10:00'),
(3, '腰肌劳损', '北京协和医院', '恢复中', '建议理疗和避免久坐', '2026-02-26 15:45:00');

INSERT INTO employee_records (employee_no, employee_name, department_name, mobile_phone, id_card_no, salary_amount, hired_at) VALUES
('EMP0001', '周文涛', '数据治理平台', '13700000001', '440103198912016512', 28000.00, '2024-03-01 09:00:00'),
('EMP0002', '孙佳宁', '安全风控部', '13700000002', '310110199002153428', 31000.00, '2023-07-15 09:00:00'),
('EMP0003', '马晨曦', '数据平台部', '13700000003', '110105199305094216', 26500.00, '2022-11-20 09:00:00');

INSERT INTO audit_operation_logs (operator_account, operation_type, operation_target, client_ip, request_payload, created_at) VALUES
('admin_user', 'LOGIN', 'console', '172.16.10.11', '{\"status\":\"success\"}', '2026-03-27 09:05:00'),
('risk_admin', 'UPDATE_RULE', 'risk_strategy_v2', '172.16.10.12', '{\"field\":\"risk_score\"}', '2026-03-27 11:26:00'),
('ops_audit', 'EXPORT_DATA', 'customer_profile', '172.16.10.13', '{\"rows\":500}', '2026-03-28 08:46:00');

INSERT INTO public_product_catalog (product_code, product_name, category_name, public_description, publish_status, updated_at) VALUES
('PROD1001', '星火会员卡', '会员服务', '面向所有注册用户公开展示的会员产品', 'PUBLISHED', '2026-03-20 10:00:00'),
('PROD1002', '安心出行险', '保险服务', '对外公开销售的标准化保险产品', 'PUBLISHED', '2026-03-22 15:30:00'),
('PROD1003', '企业联名账户', '金融服务', '仅展示产品名称与功能简介的公开目录信息', 'PUBLISHED', '2026-03-24 09:18:00');

SET FOREIGN_KEY_CHECKS = 1;
