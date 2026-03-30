SET NAMES utf8mb4;

DROP TABLE IF EXISTS encryption_feature_cases;
DROP TABLE IF EXISTS masking_feature_cases;

CREATE TABLE masking_feature_cases (
  case_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  case_label VARCHAR(32) NOT NULL COMMENT '样例分组',
  mobile_phone_plain VARCHAR(32) NOT NULL COMMENT '手机号',
  mobile_phone_masked VARCHAR(32) NOT NULL COMMENT '手机号',
  contact_phone_plain VARCHAR(32) NOT NULL COMMENT '联系电话',
  contact_phone_masked VARCHAR(32) NOT NULL COMMENT '联系电话',
  remark_text VARCHAR(255) COMMENT '备注',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='脱敏识别验证样例表';

CREATE TABLE encryption_feature_cases (
  case_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  case_label VARCHAR(32) NOT NULL COMMENT '样例分组',
  api_key_plain VARCHAR(128) NOT NULL COMMENT '密钥',
  api_key_hash VARCHAR(64) NOT NULL COMMENT '密钥',
  access_token_plain VARCHAR(128) NOT NULL COMMENT '令牌',
  access_token_hash VARCHAR(64) NOT NULL COMMENT '令牌',
  private_key_plain VARCHAR(255) NOT NULL COMMENT '私钥',
  private_key_hash VARCHAR(64) NOT NULL COMMENT '私钥',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='加密识别验证样例表';

INSERT INTO masking_feature_cases (
  case_label,
  mobile_phone_plain,
  mobile_phone_masked,
  contact_phone_plain,
  contact_phone_masked,
  remark_text
) VALUES
('mask-case-1', '13800138011', '138****8011', '13900139011', '139****9011', '同表对比未脱敏手机号和已脱敏手机号'),
('mask-case-2', '13700137022', '137****7022', '13600136022', '136****6022', '用于验证联系电话脱敏识别效果'),
('mask-case-3', '13500135033', '135****5033', '13400134033', '134****4033', '所有脱敏列样本均满足掩码特征');

INSERT INTO encryption_feature_cases (
  case_label,
  api_key_plain,
  api_key_hash,
  access_token_plain,
  access_token_hash,
  private_key_plain,
  private_key_hash
) VALUES
(
  'encrypt-case-1',
  'api_demo_plain_001',
  '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
  'atk_demo_plain_001',
  'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  'private_key_demo_plain_001',
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
),
(
  'encrypt-case-2',
  'api_demo_plain_002',
  '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
  'atk_demo_plain_002',
  '486ea46224d1bb4fb680f34f7c9ad96a8f24ec88be73ea8e5a6c65260e9cb8a7',
  'private_key_demo_plain_002',
  '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'
),
(
  'encrypt-case-3',
  'api_demo_plain_003',
  'f44e64e75f3948e9f73f8dfa94721c4ce8cbb4f265c4790c702b2d41cfbf2753',
  'atk_demo_plain_003',
  '7dacf9c63bcfb108c2e298e9a53c0e75681866d5041a73cba714cf250ce6a212',
  'private_key_demo_plain_003',
  '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'
);
