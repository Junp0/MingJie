import React from 'react';
import ProtectionFeatureManager from '../components/ProtectionFeatureManager';

const ENCRYPTION_SCENE_OPTIONS = [
  '通用密文字段',
  '对称加密',
  '非对称加密',
  '摘要哈希',
  '令牌票据',
  '编码封装',
];

const EncryptionFeatures: React.FC = () => (
  <ProtectionFeatureManager
    featureType="encryption"
    title="加密特征"
    description="维护用于识别字段值是否已加密、编码或摘要化的特征规则。"
    featurePointLabel="加密特征点"
    sceneOptions={ENCRYPTION_SCENE_OPTIONS}
    createButtonText="新增加密特征"
  />
);

export default EncryptionFeatures;
