import {
  AppstoreOutlined,
  AuditOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  FieldNumberOutlined,
  ImportOutlined,
  LockOutlined,
  ReloadOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  ScanOutlined,
  TagsOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { Link } from '@umijs/max';
import { Button, Progress, Skeleton } from 'antd';
import React, { useMemo } from 'react';
import { collectDataTypes } from '@/services/data-classification/templateStore';
import { parseBeijingDateTime } from '@/utils/datetime';
import { useDashboardData } from './shared/useDashboardData';
import './index.less';

const percent = (value: number, total: number) =>
  total > 0 ? Math.round((value / total) * 100) : 0;

const LEVEL_META = [
  { code: 'L1', label: '公开级', color: '#52c41a' },
  { code: 'L2', label: '内部级', color: '#1677ff' },
  { code: 'L3', label: '敏感级', color: '#faad14' },
  { code: 'L4', label: '重要级', color: '#fa8c16' },
  { code: 'L5', label: '核心级', color: '#f5222d' },
  { code: 'UNCLASSIFIED', label: '未分级', color: '#bfbfbf' },
] as const;

const DashboardPage: React.FC = () => {
  const {
    loading,
    refresh,
    lastUpdatedAt,
    importTasks,
    assetGroups,
    dataAssets,
    databaseInstances,
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
    auditTotal,
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
        (item) =>
          !item.isDeleted && !item.tableIsDeleted && !item.databaseIsDeleted,
      ),
    [fullDataItems],
  );

  const databaseCount = databaseInstances.reduce(
    (total, instance) =>
      total +
      instance.databases.filter((database) => !database.isDeleted).length,
    0,
  );
  const tableCount = databaseInstances.reduce(
    (total, instance) =>
      total +
      instance.databases.reduce(
        (databaseTotal, database) =>
          databaseTotal +
          database.tables.filter((table) => !table.isDeleted).length,
        0,
      ),
    0,
  );

  const classifiedFieldCount = activeFields.filter((item) =>
    Boolean(item.levelCode),
  ).length;
  const unclassifiedFieldCount = Math.max(
    activeFields.length - classifiedFieldCount,
    0,
  );
  const sensitiveFieldCount = activeFields.filter(
    (item) => item.isSensitive,
  ).length;
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

  const failedImportCount = importTasks.filter(
    (task) => task.status === 'failed',
  ).length;
  const runningImportCount = importTasks.filter(
    (task) => task.status === 'running',
  ).length;
  const failedClassificationCount = classificationTasks.filter(
    (task) => task.status === 'failed',
  ).length;
  const runningClassificationCount = classificationTasks.filter(
    (task) => task.status === 'running',
  ).length;
  const pendingClassificationCount = classificationTasks.filter(
    (task) => task.status === 'pending',
  ).length;
  const waitingImportTriggerCount = classificationTasks.filter(
    (task) => task.status === 'waiting_import',
  ).length;
  const pendingScanCount = autoScanResults.filter(
    (item) => item.status === 'pending',
  ).length;

  const activeTemplateCount = templateSummaries.filter(
    (item) => item.status === 'active',
  ).length;
  const draftTemplateCount = templateSummaries.filter(
    (item) => item.status === 'draft',
  ).length;
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
  const ownerMissingAssetCount = activeAssets.filter(
    (asset) => !asset.owner,
  ).length;
  const departmentMissingAssetCount = activeAssets.filter(
    (asset) => !asset.department,
  ).length;
  const auditFailureCount24h = auditLogs.filter((item) => {
    if (item.result !== 'FAILED') return false;
    const createdAt = parseBeijingDateTime(item.createdAt);
    return createdAt
      ? Date.now() - createdAt.valueOf() <= 24 * 60 * 60 * 1000
      : false;
  }).length;

  const classificationCoverage = percent(
    classifiedFieldCount,
    activeFields.length,
  );
  const maskingCoverage = percent(
    maskingConfirmedCount,
    maskingApplicableCount,
  );
  const encryptionCoverage = percent(
    encryptionConfirmedCount,
    encryptionApplicableCount,
  );
  const pendingProtectionCount = maskingPendingCount + encryptionPendingCount;
  const enabledScanRuleCount = autoScanRules.filter(
    (rule) => rule.status === 'enabled',
  ).length;

  const levelItems = LEVEL_META.map((item) => ({
    ...item,
    value:
      item.code === 'UNCLASSIFIED'
        ? unclassifiedFieldCount
        : activeFields.filter((field) => field.levelCode === item.code).length,
  }));

  const topStats = [
    {
      title: '纳管数据资产',
      value: activeAssets.length,
      unit: '项',
      detail: `${databaseCount} 个数据库 · ${tableCount} 张表`,
      icon: <DatabaseOutlined />,
      tone: 'blue',
      path: '/data-assets/data-asset-list',
    },
    {
      title: '分类分级覆盖率',
      value: classificationCoverage,
      unit: '%',
      detail: `${classifiedFieldCount} / ${activeFields.length} 个字段`,
      icon: <TagsOutlined />,
      tone: 'green',
      path: '/data-overview/full-data-list',
    },
    {
      title: '敏感字段',
      value: sensitiveFieldCount,
      unit: '个',
      detail: `其中重要、核心级 ${highLevelFieldCount} 个`,
      icon: <SafetyCertificateOutlined />,
      tone: 'orange',
      path: '/data-overview/full-data-list',
    },
    {
      title: '待处理事项',
      value:
        missedDataItems.length +
        pendingScanCount +
        failedImportCount +
        failedClassificationCount,
      unit: '项',
      detail: `失败任务 ${failedImportCount + failedClassificationCount} · 未命中 ${missedDataItems.length}`,
      icon: <WarningOutlined />,
      tone: 'red',
      path: '/data-overview/missed-data-list',
    },
  ];

  const todoItems = [
    {
      title: '未命中字段',
      value: missedDataItems.length,
      desc: '现有分类规则未能识别，需补充规则或数据类型',
      level: 'urgent',
      path: '/data-overview/missed-data-list',
    },
    {
      title: '失败任务',
      value: failedImportCount + failedClassificationCount,
      desc: `导入失败 ${failedImportCount}，分类失败 ${failedClassificationCount}`,
      level: 'urgent',
      path: '/data-classification/tasks',
    },
    {
      title: '未分类字段',
      value: unclassifiedFieldCount,
      desc: '已纳管但尚未完成分类分级',
      level: 'warning',
      path: '/data-overview/full-data-list',
    },
    {
      title: '保护措施待确认',
      value: pendingProtectionCount,
      desc: `脱敏 ${maskingPendingCount}，加密 ${encryptionPendingCount}`,
      level: 'warning',
      path: '/data-overview/full-data-list',
    },
    {
      title: '待认领发现结果',
      value: pendingScanCount,
      desc: `${enabledScanRuleCount} 条自动发现规则正在启用`,
      level: 'normal',
      path: '/data-assets/auto-scan',
    },
    {
      title: '资产责任信息缺失',
      value: ownerMissingAssetCount + departmentMissingAssetCount,
      desc: `负责人缺失 ${ownerMissingAssetCount}，部门缺失 ${departmentMissingAssetCount}`,
      level: 'normal',
      path: '/data-assets/data-asset-list',
    },
  ].sort((left, right) => right.value - left.value);

  const healthGroups = [
    {
      title: '数据接入',
      icon: <ImportOutlined />,
      primary: `${activeAssets.length}`,
      primaryLabel: '项资产已纳管',
      path: '/data-assets/data-import',
      rows: [
        { label: '资产分组', value: assetGroups.length },
        { label: '运行中导入任务', value: runningImportCount },
        {
          label: '失败导入任务',
          value: failedImportCount,
          alert: failedImportCount > 0,
        },
      ],
    },
    {
      title: '模板与规则',
      icon: <AppstoreOutlined />,
      primary: `${totalTemplateRuleCount}`,
      primaryLabel: '条识别规则',
      path: '/data-classification/templates',
      rows: [
        {
          label: '启用模板',
          value: `${activeTemplateCount}/${templateSummaries.length}`,
        },
        {
          label: '草稿或停用模板',
          value: draftTemplateCount + inactiveTemplateCount,
        },
        {
          label: '无规则数据类型',
          value: rulelessDataTypeCount,
          alert: rulelessDataTypeCount > 0,
        },
      ],
    },
    {
      title: '保护策略',
      icon: <LockOutlined />,
      primary: `${pendingProtectionCount}`,
      primaryLabel: '项措施待确认',
      path: '/data-classification/masking-features',
      rows: [
        {
          label: '启用脱敏特征',
          value: `${activeMaskingFeatureCount}/${maskingFeatures.length}`,
        },
        {
          label: '启用加密特征',
          value: `${activeEncryptionFeatureCount}/${encryptionFeatures.length}`,
        },
        { label: '重要/核心字段', value: highLevelFieldCount },
      ],
    },
    {
      title: '任务与审计',
      icon: <AuditOutlined />,
      primary: `${runningClassificationCount}`,
      primaryLabel: '个分类任务运行中',
      path: '/audit-logs',
      rows: [
        {
          label: '等待或待执行',
          value: waitingImportTriggerCount + pendingClassificationCount,
        },
        {
          label: '分类失败任务',
          value: failedClassificationCount,
          alert: failedClassificationCount > 0,
        },
        {
          label: '24 小时审计失败',
          value: auditFailureCount24h,
          alert: auditFailureCount24h > 0,
        },
      ],
    },
  ];

  if (loading && !activeFields.length && !templateSummaries.length) {
    return (
      <PageContainer pageHeaderRender={false} ghost>
        <div className="dashboardPage dashboardLoading">
          <Skeleton active paragraph={{ rows: 14 }} />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer pageHeaderRender={false} ghost>
      <main className="dashboardPage">
        <header className="dashboardHeader">
          <div>
            <div className="dashboardEyebrow">DATA GOVERNANCE OVERVIEW</div>
            <h1>数据治理总览</h1>
            <p>聚焦数据纳管、分类覆盖、保护策略和待处理风险。</p>
          </div>
          <div className="headerActions">
            <span className="updatedAt">
              <ClockCircleOutlined /> 更新于 {lastUpdatedAt || '--'}
            </span>
            <Button
              icon={<ReloadOutlined spin={loading} />}
              onClick={refresh}
              loading={loading}
            >
              刷新数据
            </Button>
          </div>
        </header>

        <section className="metricGrid" aria-label="核心指标">
          {topStats.map((item) => (
            <Link
              to={item.path}
              className={`metricItem metric-${item.tone}`}
              key={item.title}
            >
              <div className="metricHead">
                <span className="metricIcon">{item.icon}</span>
                <span className="metricTitle">{item.title}</span>
                <RightOutlined className="metricArrow" />
              </div>
              <div className="metricValue">
                {item.value}
                <span>{item.unit}</span>
              </div>
              <div className="metricDetail">{item.detail}</div>
            </Link>
          ))}
        </section>

        <div className="dashboardMainGrid">
          <section className="dashboardPanel coveragePanel">
            <div className="panelHeading">
              <div>
                <h2>治理覆盖</h2>
                <p>字段分类分布与敏感数据保护落实情况</p>
              </div>
              <Link to="/data-overview/full-data-list" className="panelLink">
                查看字段明细 <RightOutlined />
              </Link>
            </div>

            <div className="classificationOverview">
              <div className="coverageScore">
                <Progress
                  type="circle"
                  percent={classificationCoverage}
                  size={128}
                  strokeWidth={9}
                  strokeColor="#1677ff"
                  trailColor="#edf1f5"
                />
                <strong>分类分级覆盖率</strong>
                <span>{unclassifiedFieldCount} 个字段未分级</span>
              </div>

              <div className="levelDistribution">
                <div className="distributionHeader">
                  <span>字段分级分布</span>
                  <strong>{activeFields.length} 个字段</strong>
                </div>
                <div
                  className="levelTrack"
                  role="img"
                  aria-label="字段分级分布图"
                >
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
                      <span
                        className="legendDot"
                        style={{ background: item.color }}
                      />
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="protectionGrid">
              <div className="protectionItem">
                <div className="protectionIcon">
                  <SafetyCertificateOutlined />
                </div>
                <div className="protectionContent">
                  <div className="protectionHead">
                    <span>脱敏措施落实</span>
                    <strong>{maskingCoverage}%</strong>
                  </div>
                  <Progress
                    percent={maskingCoverage}
                    showInfo={false}
                    strokeColor="#13a8a8"
                  />
                  <p>
                    {maskingConfirmedCount} 个已确认，{maskingPendingCount}{' '}
                    个待确认
                  </p>
                </div>
              </div>
              <div className="protectionItem">
                <div className="protectionIcon protectionIconPurple">
                  <LockOutlined />
                </div>
                <div className="protectionContent">
                  <div className="protectionHead">
                    <span>加密措施落实</span>
                    <strong>{encryptionCoverage}%</strong>
                  </div>
                  <Progress
                    percent={encryptionCoverage}
                    showInfo={false}
                    strokeColor="#722ed1"
                  />
                  <p>
                    {encryptionConfirmedCount} 个已确认，
                    {encryptionPendingCount} 个待确认
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="dashboardPanel todoPanel">
            <div className="panelHeading">
              <div>
                <h2>优先处理</h2>
                <p>按影响数量排序的治理事项</p>
              </div>
              <span className="todoTotal">
                {todoItems.reduce((sum, item) => sum + item.value, 0)}
              </span>
            </div>
            <div className="todoList">
              {todoItems.map((item) => (
                <Link to={item.path} key={item.title} className="todoItem">
                  <span className={`todoIndicator ${item.level}`} />
                  <span className="todoContent">
                    <strong>{item.title}</strong>
                    <small>{item.desc}</small>
                  </span>
                  <span className="todoValue">{item.value}</span>
                  <RightOutlined className="todoArrow" />
                </Link>
              ))}
            </div>
          </section>
        </div>

        <section className="dashboardPanel healthPanel">
          <div className="panelHeading">
            <div>
              <h2>运行健康度</h2>
              <p>从数据接入到审计闭环的关键运行状态</p>
            </div>
            <span className="auditSummary">
              <FieldNumberOutlined /> 累计审计记录 {auditTotal}
            </span>
          </div>
          <div className="healthGrid">
            {healthGroups.map((group) => (
              <Link to={group.path} className="healthGroup" key={group.title}>
                <div className="healthGroupHead">
                  <span className="healthIcon">{group.icon}</span>
                  <strong>{group.title}</strong>
                  <RightOutlined />
                </div>
                <div className="healthPrimary">
                  <strong>{group.primary}</strong>
                  <span>{group.primaryLabel}</span>
                </div>
                <div className="healthRows">
                  {group.rows.map((row) => (
                    <div className="healthRow" key={row.label}>
                      <span>{row.label}</span>
                      <strong className={row.alert ? 'alertValue' : ''}>
                        {row.value}
                      </strong>
                    </div>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>

        <div className="dashboardFootnote">
          <CheckCircleOutlined />{' '}
          当前统计已排除被删除的数据资产、数据库、数据表及字段
          <span>
            <ScanOutlined /> 自动发现规则启用 {enabledScanRuleCount} 条
          </span>
        </div>
      </main>
    </PageContainer>
  );
};

export default DashboardPage;
