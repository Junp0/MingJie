import React from 'react';
import ProtectionFeatureManager from '../components/ProtectionFeatureManager';

const MASKING_SCENE_OPTIONS = [
  '星号*',
  '井号#',
];

const MaskingFeatures: React.FC = () => (
  <ProtectionFeatureManager
    featureType="masking"
    title="Masking Features"
    description="维护用于识别字段值是否已经脱敏的掩码特征、匹配表达式与样例模式。"
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
