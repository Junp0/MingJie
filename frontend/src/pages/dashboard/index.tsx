import {
  AuditOutlined,
  CheckCircleOutlined,
  ClusterOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { Link } from '@umijs/max';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Col, Progress, Row, Skeleton } from 'antd';
import React, { useMemo } from 'react';
import { collectDataTypes } from '@/services/data-classification/templateStore';
import { parseBeijingDateTime } from '@/utils/datetime';
import { useDashboardData } from './shared/useDashboardData';
import './index.less';

const percent = (value: number, total: number) =>
  total > 0 ? Math.round((value / total) * 100) : 0;

const LEVEL_META = [
  { code: 'L1', label: '公开级', color: '#6bcf78' },
  { code: 'L2', label: '内部级', color: '#6ea5ff' },
  { code: 'L3', label: '敏感级', color: '#ffc85f' },
  { code: 'L4', label: '重要级', color: '#ff9c72' },
  { code: 'L5', label: '核心级', color: '#f8758a' },
  { code: 'UNCLASSIFIED', label: '未分级', color: '#bcc8d8' },
] as const;

const DashboardPage: React.FC = () => {
  const {
    loading,
    dataAssets,
    classificationTasks,
    templateSummaries,
    templates,
    maskingFeatures,
    encryptionFeatures,
    autoScanRules,
    autoScanResults,
    fullDataItems,
    missedDataItems,
    auditLogs,
  } = useDashboardData();

  const templateDataTypes = useMemo(
    () =>
      templates.flatMap((template) =>
        template.categories.flatMap((category) => collectDataTypes(category)),
      ),
    [templates],
  );

  const activeAssets = useMemo(
    () => dataAssets.filter((asset) => !asset.isDeleted),
    [dataAssets],
  );

  const activeFields = useMemo(
    () =>
      fullDataItems.filter(
        (item) => !item.isDeleted && !item.tableIsDeleted && !item.databaseIsDeleted,
      ),
    [fullDataItems],
  );

  const classifiedFieldCount = activeFields.filter((item) => Boolean(item.levelCode)).length;
  const unclassifiedFieldCount = Math.max(activeFields.length - classifiedFieldCount, 0);
  const sensitiveFieldCount = activeFields.filter((item) => item.isSensitive).length;
  const highLevelFieldCount = activeFields.filter(
    (item) => item.levelCode === 'L4' || item.levelCode === 'L5',
  ).length;

  const maskingApplicableCount = activeFields.filter(
    (item) => item.maskingStatus !== 'not_required',
  ).length;
  const maskingConfirmedCount = activeFields.filter(
    (item) => item.maskingStatus === 'confirmed',
  ).length;
  const maskingPendingCount = activeFields.filter(
    (item) => item.maskingStatus === 'recommended',
  ).length;

  const encryptionApplicableCount = activeFields.filter(
    (item) => item.encryptionStatus !== 'not_required',
  ).length;
  const encryptionConfirmedCount = activeFields.filter(
    (item) => item.encryptionStatus === 'confirmed',
  ).length;
  const encryptionPendingCount = activeFields.filter(
    (item) => item.encryptionStatus === 'recommended',
  ).length;

  const failedImportCount = 0;
  const failedClassificationCount = classificationTasks.filter(
    (task) => task.status === 'failed',
  ).length;
  const pendingClassificationCount = classificationTasks.filter(
    (task) => task.status === 'pending',
  ).length;
  const waitingImportTriggerCount = classificationTasks.filter(
    (task) => task.status === 'waiting_import',
  ).length;

  const pendingScanCount = autoScanResults.filter((item) => item.status === 'pending').length;
  const processedScanCount = autoScanResults.filter((item) => item.status !== 'pending').length;

  const activeTemplateCount = templateSummaries.filter((item) => item.status === 'active').length;
  const draftTemplateCount = templateSummaries.filter((item) => item.status === 'draft').length;
  const inactiveTemplateCount = templateSummaries.filter(
    (item) => item.status === 'inactive',
  ).length;
  const totalTemplateRuleCount = templateSummaries.reduce(
    (sum, item) => sum + item.ruleCount,
    0,
  );
  const rulelessDataTypeCount = templateDataTypes.filter(
    (item) =>
      !item.ruleConfig.conditions.some((condition) => condition.value.trim()),
  ).length;

  const activeMaskingFeatureCount = maskingFeatures.filter(
    (item) => item.status === 'active',
  ).length;
  const activeEncryptionFeatureCount = encryptionFeatures.filter(
    (item) => item.status === 'active',
  ).length;
  const inactiveFeatureCount =
    maskingFeatures.length +
    encryptionFeatures.length -
    activeMaskingFeatureCount -
    activeEncryptionFeatureCount;

  const ownerMissingAssetCount = activeAssets.filter((asset) => !asset.owner).length;
  const departmentMissingAssetCount = activeAssets.filter(
    (asset) => !asset.department,
  ).length;

  const auditFailureCount24h = auditLogs.filter((item) => {
    if (item.result !== 'FAILED') return false;
    const createdAt = parseBeijingDateTime(item.createdAt);
    if (!createdAt) return false;
    return Date.now() - createdAt.valueOf() <= 24 * 60 * 60 * 1000;
  }).length;

  const levelItems = LEVEL_META.map((item) => ({
    ...item,
    value:
      item.code === 'UNCLASSIFIED'
        ? unclassifiedFieldCount
        : activeFields.filter((field) => field.levelCode === item.code).length,
  }));

  const topStats = [
    {
      title: '分类覆盖率',
      value: `${percent(classifiedFieldCount, activeFields.length)}%`,
      detail: `${classifiedFieldCount}/${activeFields.length} 个字段已完成分级`,
      tone: 'toneBlue',
    },
    {
      title: '敏感字段总量',
      value: `${sensitiveFieldCount}`,
      detail: `${highLevelFieldCount} 个重要/核心级字段`,
      tone: 'toneAmber',
    },
    {
      title: '保护待落实',
      value: `${maskingPendingCount + encryptionPendingCount}`,
      detail: `脱敏待确认 ${maskingPendingCount} / 加密待确认 ${encryptionPendingCount}`,
      tone: 'toneRose',
    },
    {
      title: '高优先级待办',
      value: `${
        failedClassificationCount + failedImportCount + missedDataItems.length + pendingScanCount
      }`,
      detail: `失败任务 ${failedClassificationCount + failedImportCount} / 未命中 ${missedDataItems.length}`,
      tone: 'toneMint',
    },
  ];

  const progressItems = [
    {
      title: '字段分类完成度',
      value: `${classifiedFieldCount}/${activeFields.length}`,
      percentValue: percent(classifiedFieldCount, activeFields.length),
      desc: `${unclassifiedFieldCount} 个字段仍未完成分级`,
      strokeColor: '#61c0ff',
    },
    {
      title: '脱敏措施落实度',
      value: `${maskingConfirmedCount}/${maskingApplicableCount}`,
      percentValue: percent(maskingConfirmedCount, maskingApplicableCount),
      desc: `${maskingPendingCount} 个敏感字段待确认脱敏`,
      strokeColor: '#d8dee8',
    },
    {
      title: '加密措施落实度',
      value: `${encryptionConfirmedCount}/${encryptionApplicableCount}`,
      percentValue: percent(encryptionConfirmedCount, encryptionApplicableCount),
      desc: `${encryptionPendingCount} 个敏感字段待确认加密`,
      strokeColor: '#d8dee8',
    },
    {
      title: '自动发现处置度',
      value: `${processedScanCount}/${autoScanResults.length}`,
      percentValue: percent(processedScanCount, autoScanResults.length),
      desc: `${pendingScanCount} 条发现结果待认领`,
      strokeColor: '#61c0ff',
    },
  ];

  const todoItems = [
    {
      title: '未命中字段',
      value: missedDataItems.length,
      desc: '说明现有模板规则仍有识别盲区，需要补充规则或新增数据类型。',
      tone: 'todoRose',
      path: '/data-overview/missed-data-list',
    },
    {
      title: '未分类字段',
      value: unclassifiedFieldCount,
      desc: '字段已入库但尚未完成分级，容易形成治理断层。',
      tone: 'todoAmber',
      path: '/data-overview/full-data-list',
    },
    {
      title: '异常分类任务',
      value: failedClassificationCount + pendingClassificationCount,
      desc: `失败 ${failedClassificationCount}，等待/待执行 ${pendingClassificationCount}。`,
      tone: 'todoMint',
      path: '/data-classification/tasks',
    },
    {
      title: '待认领发现结果',
      value: pendingScanCount,
      desc: `已启用 ${autoScanRules.filter((rule) => rule.status === 'enabled').length} 条自动发现规则。`,
      tone: 'todoAmber',
      path: '/data-assets/auto-scan',
    },
    {
      title: '模板/规则缺口',
      value: rulelessDataTypeCount + draftTemplateCount + inactiveTemplateCount,
      desc: `无规则数据类型 ${rulelessDataTypeCount}，草稿/停用模板 ${draftTemplateCount + inactiveTemplateCount}。`,
      tone: 'todoMint',
      path: '/data-classification/templates',
    },
    {
      title: '责任归属缺失',
      value: ownerMissingAssetCount + departmentMissingAssetCount,
      desc: `负责人缺失 ${ownerMissingAssetCount}，部门缺失 ${departmentMissingAssetCount}。`,
      tone: 'todoMint',
      path: '/data-assets/data-asset-list',
    },
  ];

  const summarySections = [
    {
      title: '模板与规则健康度',
      icon: <CheckCircleOutlined />,
      rows: [
        { label: '启用模板', value: `${activeTemplateCount}/${templateSummaries.length}` },
        { label: '草稿模板', value: `${draftTemplateCount}` },
        { label: '停用模板', value: `${inactiveTemplateCount}` },
        { label: '识别规则总数', value: `${totalTemplateRuleCount}` },
        { label: '无规则数据类型', value: `${rulelessDataTypeCount}` },
      ],
    },
    {
      title: '保护策略落地',
      icon: <LockOutlined />,
      rows: [
        { label: '脱敏特征启用', value: `${activeMaskingFeatureCount}/${maskingFeatures.length}` },
        { label: '加密特征启用', value: `${activeEncryptionFeatureCount}/${encryptionFeatures.length}` },
        { label: '停用治理特征', value: `${inactiveFeatureCount}` },
        { label: '脱敏确认字段', value: `${maskingConfirmedCount}` },
        { label: '加密已确认字段', value: `${encryptionConfirmedCount}` },
      ],
    },
    {
      title: '任务执行闭环',
      icon: <AuditOutlined />,
      rows: [
        { label: '导入失败任务', value: `${failedImportCount}` },
        { label: '分类失败任务', value: `${failedClassificationCount}` },
        { label: '等待导入触发', value: `${waitingImportTriggerCount}` },
        { label: '待执行分类任务', value: `${pendingClassificationCount}` },
        { label: '24小时审计失败', value: `${auditFailureCount24h}` },
      ],
    },
  ];

  if (loading && !activeFields.length && !templateSummaries.length) {
    return (
      <PageContainer pageHeaderRender={false} ghost>
        <div className="dashboardPage">
          <Skeleton active paragraph={{ rows: 16 }} />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer pageHeaderRender={false} ghost>
      <div className="dashboardPage">
        <Row gutter={[16, 16]} className="sectionRow">
          {topStats.map((item) => (
            <Col xs={24} sm={12} xl={6} key={item.title}>
              <Card bordered={false} className={`topStatCard ${item.tone}`}>
                <div className="topStatValue">{item.value}</div>
                <div className="topStatTitle">{item.title}</div>
                <div className="topStatDetail">{item.detail}</div>
              </Card>
            </Col>
          ))}
        </Row>

        <Row gutter={[16, 16]} className="sectionRow">
          <Col xs={24} xl={17}>
            <Card title="分类分级态势" bordered={false} className="panelCard">
              <div className="levelTrack">
                {levelItems.map((item) => (
                  <div
                    key={item.code}
                    className="levelTrackSegment"
                    style={{
                      width: `${activeFields.length ? (item.value / activeFields.length) * 100 : 0}%`,
                      background: item.color,
                    }}
                  />
                ))}
              </div>

              <div className="levelLegend">
                {levelItems.map((item) => (
                  <div key={item.code} className="legendItem">
                    <span className="legendDot" style={{ background: item.color }} />
                    <span className="legendLabel">{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>

              <div className="progressGroup">
                {progressItems.map((item) => (
                  <div key={item.title} className="progressCard">
                    <div className="progressCardHead">
                      <span className="progressCardTitle">{item.title}</span>
                      <strong className="progressCardValue">{item.value}</strong>
                    </div>
                    <Progress
                      percent={item.percentValue}
                      showInfo={false}
                      strokeColor={item.strokeColor}
                      trailColor="rgba(219, 227, 238, 0.9)"
                    />
                    <div className="progressCardDesc">{item.desc}</div>
                  </div>
                ))}
              </div>
            </Card>
          </Col>

          <Col xs={24} xl={7}>
            <Card title="管理员待办" bordered={false} className="panelCard">
              <div className="todoList">
                {todoItems.map((item) => (
                  <Link to={item.path} key={item.title} className="todoLink">
                    <div className={`todoCard ${item.tone}`}>
                      <div className="todoCardHead">
                        <span className="todoCardTitle">{item.title}</span>
                        <strong className="todoCardValue">{item.value}</strong>
                      </div>
                      <div className="todoCardDesc">{item.desc}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          {summarySections.map((section) => (
            <Col xs={24} xl={8} key={section.title}>
              <Card bordered={false} className="panelCard bottomCard">
                <div className="bottomCardHead">
                  <span className="bottomCardIcon">{section.icon}</span>
                  <span className="bottomCardTitle">{section.title}</span>
                </div>
                <div className="bottomCardBody">
                  {section.rows.map((row) => (
                    <div key={row.label} className="bottomCardRow">
                      <span className="bottomCardLabel">{row.label}</span>
                      <strong className="bottomCardValue">{row.value}</strong>
                    </div>
                  ))}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </PageContainer>
  );
};

export default DashboardPage;
