import React from 'react';
import ProtectionFeatureManager from '../components/ProtectionFeatureManager';

const MASKING_SCENE_OPTIONS = [
  '连续*',
  '连续#',
  '连续X/x',
  '固定掩码串',
  '前后保留中间替换',
  '全值符号化',
];

const MaskingFeatures: React.FC = () => (
  <ProtectionFeatureManager
    featureType="masking"
    title="脱敏特征"
    description="维护用于识别字段值是否已脱敏的掩码形态、表达式和样例配置。"
    sceneLabel="脱敏特征"
    featurePointLabel="脱敏模式说明"
    sceneOptions={MASKING_SCENE_OPTIONS}
    createButtonText="新增脱敏特征"
    showFeatureCode={false}
    showScene={false}
    showPriority={false}
    defaultSceneValue="通用脱敏形态"
  />
);

export default MaskingFeatures;
