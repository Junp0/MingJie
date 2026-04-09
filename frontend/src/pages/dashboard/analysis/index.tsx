import {
  Bar,
  Column,
  Line,
  Pie,
  Rose,
} from '@ant-design/plots';
import {
  ApartmentOutlined,
  DatabaseOutlined,
  SafetyCertificateOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Col, Progress, Row, Spin, Tooltip, Typography } from 'antd';
import dayjs from 'dayjs';
import React, { useMemo } from 'react';
import { collectDataTypes, countCategoryNodes } from '@/services/data-classification/templateStore';
import { parseBeijingDateTime } from '@/utils/datetime';
import { useDashboardData } from '../shared/useDashboardData';
import './index.less';

const { Text } = Typography;

const importSourceLabelMap = {
  database: '数据库',
  file: '文件',
  api: 'API',
  message_queue: '消息队列',
} as const;

const taskStatusLabelMap = {
  waiting_import: '等待导入',
  pending: '待执行',
  running: '执行中',
  completed: '已完成',
  failed: '执行失败',
  stopped: '已停止',
} as const;

const taskSourceColorMap = {
  任务中心: '#722ed1',
  导入流程: '#1677ff',
} as const;

const aggregateByKey = <T,>(
  list: T[],
  keyGetter: (item: T) => string,
): Map<string, number> => {
  const result = new Map<string, number>();
  list.forEach((item) => {
    const key = keyGetter(item);
    result.set(key, (result.get(key) ?? 0) + 1);
  });
  return result;
};

const chartTips: Record<string, string> = {
  assetSource: '观察不同来源的数据资产接入比例，识别是否过度集中',
  assetTrend: '观察近期资产导入活跃度，判断接入是否持续推进',
  groupField: '识别字段最密集的分组，通常最值得优先治理',
  rootGroup: '各一级分组承载的数据库、表和字段规模',
  category: '分类覆盖反映模板目录建设的完整度',
  level: '分级标签占比是否合理，是否存在级别偏斜',
  template: '衡量模板建设的深度与颗粒度',
  governance: '从敏感字段、脱敏、加密和特征四个方向看治理覆盖',
  taskStatus: '区分任务中心和导入流程两个入口的任务量差异',
};

const Analysis: React.FC = () => {
  const {
    importTasks,
    assetGroups,
    classificationTasks,
    templateSummaries,
    templates,
    maskingFeatures,
    encryptionFeatures,
  } = useDashboardData();

  const isLoading = assetGroups.length === 0 && importTasks.length === 0 && templates.length === 0;

  const allDataTypes = useMemo(
    () => templates.flatMap((template) => template.categories.flatMap((category) => collectDataTypes(category))),
    [templates],
  );

  const governancePercent = useMemo(() => {
    const total = classificationTasks.length;
    if (total === 0) return 0;
    const completed = classificationTasks.filter((task) => task.status === 'completed').length;
    return Math.round((completed / total) * 100);
  }, [classificationTasks]);

  const summaryMetrics = [
    {
      title: '资产总量',
      value: assetGroups.reduce((sum, group) => sum + group.databaseCount, 0),
      suffix: '库',
      icon: <DatabaseOutlined />,
      extra: `${assetGroups.reduce((sum, group) => sum + group.tableCount, 0)} 张表`,
      colorClass: 'statCardBlue',
    },
    {
      title: '资产分组',
      value: assetGroups.length,
      suffix: '组',
      icon: <ApartmentOutlined />,
      extra: `${assetGroups.filter((group) => group.level === 1).length} 个一级分组`,
      colorClass: 'statCardCyan',
    },
    {
      title: '分类模板',
      value: templateSummaries.length,
      suffix: '个',
      icon: <TagsOutlined />,
      extra: `${templateSummaries.filter((template) => template.status === 'active').length} 个启用`,
      colorClass: 'statCardPurple',
    },
    {
      title: '治理特征',
      value: maskingFeatures.length + encryptionFeatures.length,
      suffix: '项',
      icon: <SafetyCertificateOutlined />,
      extra: `${maskingFeatures.length} 脱敏 / ${encryptionFeatures.length} 加密`,
      colorClass: 'statCardOrange',
    },
  ];

  const assetSourceData = useMemo(
    () =>
      Array.from(
        aggregateByKey(importTasks, (task) => importSourceLabelMap[task.sourceType]).entries(),
      ).map(([type, value]) => ({ type, value })),
    [importTasks],
  );

  const assetTrendData = useMemo(() => {
    const countByDate = aggregateByKey(
      importTasks,
      (task) => parseBeijingDateTime(task.createTime)?.format('MM-DD') ?? '',
    );
    // Fill in the last 14 days so the axis is continuous
    const days: { date: string; value: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = dayjs().subtract(i, 'day').format('MM-DD');
      days.push({ date: d, value: countByDate.get(d) ?? 0 });
    }
    return days;
  }, [importTasks]);

  const groupFieldRankingData = useMemo(
    () =>
      [...assetGroups]
        .sort((left, right) => right.fieldCount - left.fieldCount)
        .slice(0, 8)
        .map((group) => ({
          group: group.name,
          value: group.fieldCount,
        })),
    [assetGroups],
  );

  const rootGroupCoverageData = useMemo(
    () =>
      assetGroups
        .filter((group) => group.level === 1)
        .flatMap((group) => [
          { group: group.name, metric: '数据库', value: group.databaseCount },
          { group: group.name, metric: '数据表', value: group.tableCount },
          { group: group.name, metric: '字段', value: group.fieldCount },
        ]),
    [assetGroups],
  );

  const categoryDistributionData = useMemo(() => {
    const categoryCounter = new Map<string, number>();
    templates.forEach((template) => {
      template.categories.forEach((category) => {
        categoryCounter.set(category.name, (categoryCounter.get(category.name) ?? 0) + collectDataTypes(category).length);
      });
    });
    return Array.from(categoryCounter.entries()).map(([type, value]) => ({ type, value }));
  }, [templates]);

  const levelDistributionData = useMemo(() => {
    const levelCounter = new Map<string, number>();
    allDataTypes.forEach((item) => {
      levelCounter.set(item.levelName, (levelCounter.get(item.levelName) ?? 0) + 1);
    });
    return Array.from(levelCounter.entries()).map(([type, value]) => ({ type, value }));
  }, [allDataTypes]);

  const templateCoverageData = useMemo(
    () =>
      templates.flatMap((template) => [
        {
          template: template.templateName,
          metric: '分类节点',
          value: countCategoryNodes(template.categories),
        },
        {
          template: template.templateName,
          metric: '数据类型',
          value: template.categories.flatMap((category) => collectDataTypes(category)).length,
        },
      ]),
    [templates],
  );

  const governanceCoverageData = useMemo(
    () => [
      { item: '敏感字段', value: allDataTypes.filter((item) => item.isSensitive).length },
      { item: '建议脱敏', value: allDataTypes.filter((item) => item.needMask).length },
      { item: '建议加密', value: allDataTypes.filter((item) => item.needEncrypt).length },
      { item: '脱敏特征', value: maskingFeatures.length },
      { item: '加密特征', value: encryptionFeatures.length },
    ],
    [allDataTypes, encryptionFeatures.length, maskingFeatures.length],
  );

  const taskStatusBySourceData = useMemo(
    () =>
      classificationTasks.map((task) => ({
        source: task.sourceLabel,
        status: taskStatusLabelMap[task.status],
        value: 1,
      })),
    [classificationTasks],
  );

  if (isLoading) {
    return (
      <PageContainer header={{ title: '全局分类分级概览' }}>
        <div className="loadingWrap">
          <Spin size="large" tip="加载数据中..." />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      className="analysisPage"
      header={{
        title: '全局分类分级概览',
        subTitle: '从资产、分类、分级、治理能力和分组覆盖五个维度，持续观察全局数据治理情况',
      }}
    >
      {/* Governance Progress Banner */}
      <div className="governanceBanner">
        <div className="governanceBannerLeft">
          <div className="governanceBannerTitle">数据治理整体进度</div>
          <div className="governanceBannerSub">
            已完成 {classificationTasks.filter((t) => t.status === 'completed').length} / {classificationTasks.length} 个分类分级任务
          </div>
        </div>
        <div className="governanceProgressWrap">
          <Progress
            percent={governancePercent}
            strokeColor={{ from: '#1677ff', to: '#13c2c2' }}
            size={['100%', 14]}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }} className="summaryRow">
        {summaryMetrics.map((item) => (
          <Col xs={24} sm={12} xl={6} key={item.title}>
            <Card className={`statCard ${item.colorClass}`} bordered={false}>
              <div className="statIconWrap">{item.icon}</div>
              <div>
                <div className="statTitle">{item.title}</div>
                <div>
                  <span className="statValue">{item.value}</span>
                  <span className="statSuffix">{item.suffix}</span>
                </div>
                <div className="statExtra">{item.extra}</div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Chart Row 1 — 4 columns */}
      <Row gutter={[24, 24]} className="chartRow">
        <Col xs={24} sm={12} xl={6}>
          <Card className="chartCard" title={<Tooltip title={chartTips.assetSource}>资产来源结构</Tooltip>} bordered={false}>
            <div className="chartWrap">
              <Pie
                data={assetSourceData}
                angleField="value"
                colorField="type"
                height={220}
                radius={0.86}
                innerRadius={0.55}
                legend={{ position: 'bottom' }}
                label={{ text: 'type', style: { fontSize: 11 } }}
                color={['#1677ff', '#13c2c2', '#722ed1', '#fa8c16']}
              />
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <Card className="chartCard" title={<Tooltip title={chartTips.assetTrend}>资产接入趋势</Tooltip>} bordered={false}>
            <div className="chartWrap">
              <Line
                data={assetTrendData}
                xField="date"
                yField="value"
                height={220}
                color="#1677ff"
                point={{ size: 3, shape: 'circle' }}
                style={{ lineWidth: 2 }}
              />
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <Card className="chartCard" title={<Tooltip title={chartTips.groupField}>分组字段规模排行</Tooltip>} bordered={false}>
            <div className="chartWrap">
              <Bar
                data={groupFieldRankingData}
                xField="group"
                yField="value"
                height={220}
                color="#27d8ff"
                legend={false}
                style={{ radiusTopLeft: 4, radiusTopRight: 4 }}
              />
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <Card className="chartCard" title={<Tooltip title={chartTips.rootGroup}>一级分组资产覆盖</Tooltip>} bordered={false}>
            <div className="chartWrap">
              <Column
                data={rootGroupCoverageData}
                xField="group"
                yField="value"
                height={220}
                colorField="metric"
                isGroup
                label={{ position: 'top', style: { fontSize: 10 } }}
                color={['#4d8dff', '#13c2c2', '#fa8c16']}
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Chart Row 2 — 4 columns */}
      <Row gutter={[24, 24]} className="chartRow">
        <Col xs={24} sm={12} xl={6}>
          <Card className="chartCard" title={<Tooltip title={chartTips.category}>分类情况分布</Tooltip>} bordered={false}>
            <div className="chartWrap">
              <Rose
                data={categoryDistributionData}
                xField="type"
                yField="value"
                height={220}
                colorField="type"
                radius={0.82}
                legend={{ position: 'bottom' }}
                color={['#1677ff', '#27d8ff', '#13c2c2', '#fa8c16', '#722ed1', '#eb2f96']}
              />
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <Card className="chartCard" title={<Tooltip title={chartTips.level}>分级情况分布</Tooltip>} bordered={false}>
            <div className="chartWrap">
              <Pie
                data={levelDistributionData}
                angleField="value"
                colorField="type"
                height={220}
                radius={0.84}
                legend={{ position: 'bottom' }}
                label={{ text: 'type', style: { fontSize: 11 } }}
                color={['#f5222d', '#fa8c16', '#fadb14', '#52c41a', '#13c2c2', '#1677ff']}
              />
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <Card className="chartCard" title={<Tooltip title={chartTips.template}>模板覆盖强度</Tooltip>} bordered={false}>
            <div className="chartWrap">
              <Column
                data={templateCoverageData}
                xField="template"
                yField="value"
                height={220}
                colorField="metric"
                isGroup
                color={['#722ed1', '#4d8dff']}
              />
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <Card className="chartCard" title={<Tooltip title={chartTips.governance}>治理能力覆盖</Tooltip>} bordered={false}>
            <div className="chartWrap">
              <Bar
                data={governanceCoverageData}
                xField="item"
                yField="value"
                height={220}
                legend={false}
                color="#59f0b0"
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Chart Row 3 — Full Width */}
      <Row gutter={[24, 24]} className="chartRow">
        <Col xs={24}>
          <Card className="chartCard" title={<Tooltip title={chartTips.taskStatus}>分类分级任务来源与状态</Tooltip>} bordered={false}>
            <div className="chartWrapWide">
              <Column
                data={taskStatusBySourceData}
                xField="status"
                yField="value"
                height={200}
                colorField="source"
                isStack
                color={(datum: { source: string }) => taskSourceColorMap[datum.source as keyof typeof taskSourceColorMap] || '#1677ff'}
              />
            </div>
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default Analysis;
