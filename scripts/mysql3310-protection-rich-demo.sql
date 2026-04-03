SET NAMES utf8mb4;

DROP TABLE IF EXISTS encryption_validation_cases;
DROP TABLE IF EXISTS masking_validation_cases;

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

CREATE TABLE masking_validation_cases (
  case_id BIGINT PRIMARY KEY,
  case_label VARCHAR(32) NOT NULL COMMENT '样例分组',
  mobile_phone_plain VARCHAR(32) NOT NULL COMMENT '手机号',
  mobile_phone_masked VARCHAR(32) NOT NULL COMMENT '手机号',
  contact_phone_plain VARCHAR(32) NOT NULL COMMENT '联系电话',
  contact_phone_masked VARCHAR(32) NOT NULL COMMENT '联系电话',
  id_card_no_plain VARCHAR(32) NOT NULL COMMENT '身份证号码',
  id_card_no_masked VARCHAR(32) NOT NULL COMMENT '身份证号码',
  address_detail_plain VARCHAR(255) NOT NULL COMMENT '地址详情',
  address_detail_masked VARCHAR(255) NOT NULL COMMENT '地址详情',
  remark_text VARCHAR(255) NOT NULL COMMENT '备注',
  updated_at DATETIME NOT NULL COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='脱敏识别验证样例表';

CREATE TABLE encryption_validation_cases (
  case_id BIGINT PRIMARY KEY,
  case_label VARCHAR(32) NOT NULL COMMENT '样例分组',
  api_key_plain VARCHAR(128) NOT NULL COMMENT '密钥',
  api_key_cipher VARCHAR(128) NOT NULL COMMENT '密钥',
  access_token_plain VARCHAR(255) NOT NULL COMMENT '令牌',
  access_token_cipher VARCHAR(128) NOT NULL COMMENT '令牌',
  private_key_plain TEXT NOT NULL COMMENT '私钥',
  private_key_cipher VARCHAR(128) NOT NULL COMMENT '私钥',
  master_key_plain VARCHAR(128) NOT NULL COMMENT '主密钥',
  master_key_cipher VARCHAR(128) NOT NULL COMMENT '主密钥',
  updated_at DATETIME NOT NULL COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='加密识别验证样例表';

INSERT INTO masking_validation_cases (
  case_id, case_label, mobile_phone_plain, mobile_phone_masked,
  contact_phone_plain, contact_phone_masked, id_card_no_plain, id_card_no_masked,
  address_detail_plain, address_detail_masked, remark_text, updated_at
)
SELECT
  n,
  CONCAT('mask-case-', LPAD(n, 3, '0')),
  CONCAT('13', LPAD(900000000 + n, 9, '0')),
  CONCAT(LEFT(CONCAT('13', LPAD(900000000 + n, 9, '0')), 3), '****', RIGHT(CONCAT('13', LPAD(900000000 + n, 9, '0')), 4)),
  CONCAT('15', LPAD(500000000 + n, 9, '0')),
  CONCAT(LEFT(CONCAT('15', LPAD(500000000 + n, 9, '0')), 3), '****', RIGHT(CONCAT('15', LPAD(500000000 + n, 9, '0')), 4)),
  CONCAT('11010119', LPAD(85 + MOD(n, 10), 2, '0'), LPAD(1 + MOD(n, 12), 2, '0'), LPAD(1 + MOD(n, 28), 2, '0'), LPAD(n, 4, '0')),
  CONCAT('11010119', LPAD(85 + MOD(n, 10), 2, '0'), '****', RIGHT(LPAD(n, 4, '0'), 4)),
  CONCAT(ELT(1 + MOD(n, 5), '深圳南山区科技园', '上海浦东新区张江路', '北京朝阳区酒仙桥路', '杭州滨江区网商路', '苏州工业园区星湖街'), n, '号', ELT(1 + MOD(n, 4), 'A座', 'B座', 'C座', 'D座')),
  CONCAT(LEFT(ELT(1 + MOD(n, 5), '深圳南山区科技园', '上海浦东新区张江路', '北京朝阳区酒仙桥路', '杭州滨江区网商路', '苏州工业园区星湖街'), 4), '****', LPAD(n, 2, '0'), '号'),
  CONCAT('同表对比明文与脱敏样本-', LPAD(n, 3, '0')),
  DATE_ADD('2026-03-20 09:00:00', INTERVAL n MINUTE)
FROM seq_120;

INSERT INTO encryption_validation_cases (
  case_id, case_label, api_key_plain, api_key_cipher, access_token_plain,
  access_token_cipher, private_key_plain, private_key_cipher,
  master_key_plain, master_key_cipher, updated_at
)
SELECT
  n,
  CONCAT('encrypt-case-', LPAD(n, 3, '0')),
  CONCAT('api_demo_plain_', LPAD(n, 6, '0')),
  SHA2(CONCAT('api_demo_plain_', LPAD(n, 6, '0')), 256),
  CONCAT('atk_demo_plain_', LPAD(n, 6, '0'), '_', SHA2(CONCAT('access', n), 224)),
  SHA2(CONCAT('atk_demo_plain_', LPAD(n, 6, '0')), 256),
  CONCAT('private_key_demo_plain_', SHA2(CONCAT('private_key_demo_', n), 224)),
  SHA2(CONCAT('private_key_demo_plain_', LPAD(n, 6, '0')), 256),
  CONCAT('master_key_demo_plain_', LPAD(n, 6, '0')),
  SHA2(CONCAT('master_key_demo_plain_', LPAD(n, 6, '0')), 256),
  DATE_ADD('2026-03-21 08:00:00', INTERVAL n MINUTE)
FROM seq_120;

DROP TEMPORARY TABLE IF EXISTS seq_120;
