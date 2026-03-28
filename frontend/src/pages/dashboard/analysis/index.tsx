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
  FolderOpenOutlined,
  SafetyCertificateOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Col, Row, Space, Statistic, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import React, { useMemo } from 'react';
import { listImportTasks } from '@/services/data-assets/importTaskStore';
import { listAssetGroups } from '@/services/data-assets/assetGroupStore';
import { listClassificationTasks } from '@/services/data-classification/classificationTaskStore';
import {
  collectDataTypes,
  countCategoryNodes,
  getClassificationTemplateById,
  listClassificationTemplates,
} from '@/services/data-classification/templateStore';
import { listProtectionFeatures } from '@/services/data-classification/protectionFeatureStore';

const { Paragraph, Text, Title } = Typography;

const importSourceLabelMap = {
  database: '数据库',
  file: '文件',
  api: 'API',
  message_queue: '消息队列',
} as const;

const taskStatusLabelMap = {
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

const Analysis: React.FC = () => {
  const importTasks = useMemo(() => listImportTasks(), []);
  const assetGroups = useMemo(() => listAssetGroups(), []);
  const classificationTasks = useMemo(() => listClassificationTasks(), []);
  const templateSummaries = useMemo(() => listClassificationTemplates(), []);
  const templates = useMemo(
    () =>
      templateSummaries
        .map((template) => getClassificationTemplateById(template.id))
        .filter((template): template is NonNullable<ReturnType<typeof getClassificationTemplateById>> => Boolean(template)),
    [templateSummaries],
  );
  const maskingFeatures = useMemo(() => listProtectionFeatures('masking'), []);
  const encryptionFeatures = useMemo(() => listProtectionFeatures('encryption'), []);

  const allDataTypes = useMemo(
    () => templates.flatMap((template) => template.categories.flatMap((category) => collectDataTypes(category))),
    [templates],
  );

  const summaryMetrics = [
    {
      title: '资产总量',
      value: assetGroups.reduce((sum, group) => sum + group.databaseCount, 0),
      suffix: '库',
      icon: <DatabaseOutlined style={{ color: '#1677ff' }} />,
      extra: `${assetGroups.reduce((sum, group) => sum + group.tableCount, 0)} 张表`,
    },
    {
      title: '资产分组',
      value: assetGroups.length,
      suffix: '组',
      icon: <ApartmentOutlined style={{ color: '#13c2c2' }} />,
      extra: `${assetGroups.filter((group) => group.level === 1).length} 个一级分组`,
    },
    {
      title: '分类模板',
      value: templateSummaries.length,
      suffix: '个',
      icon: <TagsOutlined style={{ color: '#722ed1' }} />,
      extra: `${templateSummaries.filter((template) => template.status === 'active').length} 个启用`,
    },
    {
      title: '治理特征',
      value: maskingFeatures.length + encryptionFeatures.length,
      suffix: '项',
      icon: <SafetyCertificateOutlined style={{ color: '#fa8c16' }} />,
      extra: `${maskingFeatures.length} 脱敏 / ${encryptionFeatures.length} 加密`,
    },
  ];

  const assetSourceData = useMemo(
    () =>
      Array.from(
        aggregateByKey(importTasks, (task) => importSourceLabelMap[task.sourceType]).entries(),
      ).map(([type, value]) => ({ type, value })),
    [importTasks],
  );

  const assetTrendData = useMemo(
    () =>
      Array.from(
        aggregateByKey(importTasks, (task) => dayjs(task.createTime).format('MM-DD')).entries(),
      )
        .map(([date, value]) => ({ date, value }))
        .sort((left, right) => left.date.localeCompare(right.date)),
    [importTasks],
  );

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

  const chartCardStyle = {
    height: '100%',
  } as const;

  return (
    <PageContainer
      header={{
        title: '全局分类分级概览',
        subTitle: '从资产、分类、分级、治理能力和分组覆盖五个维度，持续观察全局数据治理情况。',
      }}
    >
      <Row gutter={[16, 16]} style={{ marginBottom: 8 }}>
        {summaryMetrics.map((item) => (
          <Col xs={24} sm={12} xl={6} key={item.title}>
            <Card style={chartCardStyle}>
              <Space align="start">
                <div style={{ fontSize: 24 }}>{item.icon}</div>
                <div>
                  <Statistic title={item.title} value={item.value} suffix={item.suffix} />
                  <Text type="secondary">{item.extra}</Text>
                </div>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={8}>
          <Card title="资产来源结构" style={chartCardStyle}>
            <Paragraph type="secondary">建议长期观察不同来源的数据资产接入比例，识别外部 API、文件或消息链路是否过高集中。</Paragraph>
            <Pie
              data={assetSourceData}
              angleField="value"
              colorField="type"
              radius={0.86}
              innerRadius={0.55}
              legend={{ position: 'bottom' }}
              label={{ text: 'type', style: { fontSize: 12 } }}
              color={['#1677ff', '#13c2c2', '#722ed1', '#fa8c16']}
            />
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card title="资产接入趋势" style={chartCardStyle}>
            <Paragraph type="secondary">适合观察近期资产导入的活跃度，判断资产接入是否持续推进。</Paragraph>
            <Line
              data={assetTrendData}
              xField="date"
              yField="value"
              color="#1677ff"
              point={{ size: 4, shape: 'circle' }}
            />
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card title="分组字段规模排行" style={chartCardStyle}>
            <Paragraph type="secondary">用于识别字段最密集的分组，通常这些分组最值得优先治理。</Paragraph>
            <Bar
              data={groupFieldRankingData}
              xField="group"
              yField="value"
              color="#27d8ff"
              legend={false}
              style={{ radiusTopLeft: 6, radiusTopRight: 6 }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 0 }}>
        <Col xs={24} xl={8}>
          <Card title="一级分组资产覆盖" style={chartCardStyle}>
            <Paragraph type="secondary">建议在概览里长期展示各一级分组承载的数据库、表和字段规模，帮助快速判断分组重心。</Paragraph>
            <Column
              data={rootGroupCoverageData}
              xField="group"
              yField="value"
              colorField="metric"
              isGroup
              label={{ position: 'top', style: { fontSize: 11 } }}
              color={['#4d8dff', '#13c2c2', '#fa8c16']}
            />
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card title="分类情况分布" style={chartCardStyle}>
            <Paragraph type="secondary">分类覆盖能直接反映模板目录建设的完整度，哪些大类沉淀了更多数据类型一目了然。</Paragraph>
            <Rose
              data={categoryDistributionData}
              xField="type"
              yField="value"
              colorField="type"
              radius={0.82}
              legend={{ position: 'bottom' }}
              color={['#1677ff', '#27d8ff', '#13c2c2', '#fa8c16', '#722ed1', '#eb2f96']}
            />
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card title="分级情况分布" style={chartCardStyle}>
            <Paragraph type="secondary">分级标签分布适合用来看高敏、敏感、内部级等占比是否合理，以及是否存在级别偏斜。</Paragraph>
            <Pie
              data={levelDistributionData}
              angleField="value"
              colorField="type"
              radius={0.84}
              legend={{ position: 'bottom' }}
              label={{ text: 'type', style: { fontSize: 12 } }}
              color={['#f5222d', '#fa8c16', '#fadb14', '#52c41a', '#13c2c2', '#1677ff']}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 0 }}>
        <Col xs={24} xl={12}>
          <Card title="模板覆盖强度" style={chartCardStyle}>
            <Paragraph type="secondary">建议同时看模板下的分类节点数和数据类型数，用于衡量模板建设的深度与颗粒度。</Paragraph>
            <Column
              data={templateCoverageData}
              xField="template"
              yField="value"
              colorField="metric"
              isGroup
              color={['#722ed1', '#4d8dff']}
            />
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card title="治理能力覆盖" style={chartCardStyle}>
            <Paragraph type="secondary">从敏感字段、建议脱敏、建议加密和特征能力项四个方向看治理覆盖是否充足。</Paragraph>
            <Bar
              data={governanceCoverageData}
              xField="item"
              yField="value"
              legend={false}
              color="#59f0b0"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 0 }}>
        <Col xs={24}>
          <Card title="分类分级任务来源与状态" style={chartCardStyle}>
            <Paragraph type="secondary">
              全局概览里非常值得持续展示这张图。它能帮助区分“任务中心”和“导入流程”两个入口的任务量差异，也能快速看出当前积压在哪种状态。
            </Paragraph>
            <Column
              data={taskStatusBySourceData}
              xField="status"
              yField="value"
              colorField="source"
              isStack
              color={(datum: { source: string }) => taskSourceColorMap[datum.source as keyof typeof taskSourceColorMap] || '#1677ff'}
            />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default Analysis;
