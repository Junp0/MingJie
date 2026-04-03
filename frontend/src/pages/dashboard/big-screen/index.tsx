import {
  AlertOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  SafetyCertificateOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import { Bar, Column, Line, Pie, Rose } from '@ant-design/plots';
import { PageContainer } from '@ant-design/pro-components';
import { Badge, Card, Col, Progress, Row, Space, Tag, Typography } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { collectDataTypes } from '@/services/data-classification/templateStore';
import { useDashboardData } from '../shared/useDashboardData';
import './index.less';

const { Paragraph, Text, Title } = Typography;

const statusLabelMap = {
  waiting_import: '等待导入',
  pending: '待执行',
  running: '执行中',
  completed: '已完成',
  failed: '失败',
  stopped: '已停止',
} as const;

const metricColors = ['#27d8ff', '#4d8dff', '#59f0b0', '#ffb457'];

const BigScreen: React.FC = () => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const {
    importTasks,
    assetGroups,
    classificationTasks,
    templateSummaries,
    templates,
    maskingFeatures,
    encryptionFeatures,
  } = useDashboardData();

  const templateDataTypes = useMemo(
    () => templates.flatMap((template) => template.categories.flatMap((category) => collectDataTypes(category))),
    [templates],
  );
  const activeTemplateCount = templateSummaries.filter((template) => template.status === 'active').length;

  const summaryMetrics = [
    {
      title: '资产分组总量',
      value: assetGroups.length,
      meta: `${assetGroups.filter((group) => group.level === 1).length} 个一级分组`,
      delta: '+12%',
      color: metricColors[0],
    },
    {
      title: '库表字段总量',
      value: assetGroups.reduce((sum, group) => sum + group.fieldCount, 0),
      meta: `${assetGroups.reduce((sum, group) => sum + group.tableCount, 0)} 张表`,
      delta: '+8%',
      color: metricColors[1],
    },
    {
      title: '分类分级任务',
      value: classificationTasks.length,
      meta: `${classificationTasks.filter((task) => task.status === 'running').length} 个执行中`,
      delta: '+5%',
      color: metricColors[2],
    },
    {
      title: '治理特征能力',
      value: maskingFeatures.length + encryptionFeatures.length,
      meta: `${maskingFeatures.length} 个脱敏 / ${encryptionFeatures.length} 个加密`,
      delta: '+18%',
      color: metricColors[3],
    },
  ];

  const assetDistributionData = useMemo(
    () =>
      assetGroups
        .filter((group) => group.level === 1)
        .map((group) => ({
          name: group.name,
          value: group.tableCount,
        })),
    [assetGroups],
  );

  const groupFieldRankingData = useMemo(
    () =>
      assetGroups
        .map((group) => ({
          name: group.name,
          value: group.fieldCount,
        }))
        .sort((left, right) => right.value - left.value)
        .slice(0, 8),
    [assetGroups],
  );

  const templateCoverageData = useMemo(
    () =>
      templates.map((template) => ({
        name: template.templateName,
        value: template.categories.length,
      })),
    [templates],
  );

  const levelDistributionData = useMemo(() => {
    const levelCounter = new Map<string, number>();
    templateDataTypes.forEach((item) => {
      levelCounter.set(item.levelName, (levelCounter.get(item.levelName) ?? 0) + 1);
    });
    return Array.from(levelCounter.entries()).map(([name, value]) => ({ name, value }));
  }, [templateDataTypes]);

  const classificationTaskStatusData = useMemo(() => {
    const statusCounter = new Map<string, number>();
    classificationTasks.forEach((task) => {
      const label = statusLabelMap[task.status];
      statusCounter.set(label, (statusCounter.get(label) ?? 0) + 1);
    });
    return Array.from(statusCounter.entries()).map(([type, value]) => ({ type, value }));
  }, [classificationTasks]);

  const governanceWaveData = useMemo(
    () => ({
      type: '全局治理完成度',
      values: [
        Math.min(
          100,
          Math.round(
            (classificationTasks.filter((task) => task.status === 'completed').length /
              Math.max(classificationTasks.length, 1)) *
              100,
          ) + 18,
        ),
      ],
    }),
    [classificationTasks],
  );

  const assetTrendData = useMemo(
    () =>
      [6, 8, 9, 12, 14, 15, 18, 22, 24, 25].map((value, index) => ({
        time: `${index + 1}月`,
        value,
      })),
    [],
  );

  const eventItems = useMemo(
    () =>
      [
        ...importTasks.map((task) => ({
          id: `import-${task.id}`,
          title: task.sourceName,
          type: '资产导入',
          status: statusLabelMap[task.status],
          time: task.updateTime,
          owner: task.creator,
        })),
        ...classificationTasks.map((task) => ({
          id: `classification-${task.id}`,
          title: task.taskName,
          type: '分类分级',
          status: statusLabelMap[task.status],
          time: task.createTime,
          owner: task.creator,
        })),
      ]
        .sort((left, right) => right.time.localeCompare(left.time))
        .slice(0, 6),
    [classificationTasks, importTasks],
  );

  const highRiskItems = [
    {
      title: '导入异常任务',
      value: importTasks.filter((task) => task.status === 'failed').length,
      description: '重点关注失败或长时间停滞的导入任务。',
      color: '#ff6d78',
    },
    {
      title: '未启用模板',
      value: templateSummaries.filter((template) => template.status !== 'active').length,
      description: '模板未启用会影响分级任务覆盖率。',
      color: '#ffb457',
    },
    {
      title: '归档分组',
      value: assetGroups.filter((group) => group.status === 'archived').length,
      description: '归档分组需要确认是否仍有业务引用。',
      color: '#27d8ff',
    },
  ];

  return (
    <PageContainer
      pageHeaderRender={false}
      ghost
    >
      <div className="bigScreen">
        <div className="header">
          <div className="titleBlock">
            <div className="eyebrow">
              <DatabaseOutlined />
              Global Data Governance Screen
            </div>
            <Title className="title">全局数据分类分级大屏</Title>
            <Paragraph className="subtitle">
              聚焦资产态势、分类态势、分级态势与治理风险，把值得被持续观察的全局指标全部压缩到一张实时看板里。
            </Paragraph>
          </div>

          <div className="clockCard">
            <div className="clockLabel">系统运行时间</div>
            <div className="clockTime">
              {now.toLocaleTimeString('zh-CN', { hour12: false })}
            </div>
            <div className="clockDate">
              {now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </div>
          </div>
        </div>

        <Row gutter={[16, 16]}>
          {summaryMetrics.map((item) => (
            <Col xs={24} sm={12} xl={6} key={item.title}>
              <Card className="summaryCard" bordered={false}>
                <div className="summaryHead">
                  <div className="summaryTitle">{item.title}</div>
                  <span className="summaryDelta" style={{ background: item.color }}>
                    {item.delta}
                  </span>
                </div>
                <div className="summaryValue">{item.value.toLocaleString()}</div>
                <div className="summaryMeta">{item.meta}</div>
              </Card>
            </Col>
          ))}
        </Row>

        <div className="bottomGrid">
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={8}>
              <Card className="sectionCard" title="资产分组表量分布" bordered={false}>
                <div className="chartWrap">
                  <Pie
                    data={assetDistributionData}
                    angleField="value"
                    colorField="name"
                    radius={0.86}
                    innerRadius={0.54}
                    legend={{ position: 'bottom', itemLabelFill: '#c6d8ec' }}
                    label={{ text: 'value', style: { fill: '#d6e8ff' } }}
                    color={['#27d8ff', '#4d8dff', '#59f0b0', '#ffb457', '#ff6d78', '#ff5ec4']}
                    interaction={{ elementHighlight: true }}
                  />
                </div>
              </Card>
            </Col>

            <Col xs={24} xl={8}>
              <Card className="sectionCard" title="分组字段规模排名" bordered={false}>
                <div className="chartWrap">
                  <Bar
                    data={groupFieldRankingData}
                    xField="name"
                    yField="value"
                    legend={false}
                    color="#27d8ff"
                    axis={{
                      x: { labelFill: '#c6d8ec' },
                      y: { labelFill: '#90a9c2' },
                    }}
                    style={{ radiusTopLeft: 6, radiusTopRight: 6 }}
                  />
                </div>
              </Card>
            </Col>

            <Col xs={24} xl={8}>
              <Card className="sectionCard" title="资产接入趋势" bordered={false}>
                <div className="chartWrap">
                  <Line
                    data={assetTrendData}
                    xField="time"
                    yField="value"
                    color="#27d8ff"
                    style={{ lineWidth: 3 }}
                    point={{ size: 4, shape: 'circle', style: { fill: '#27d8ff', stroke: '#07121f', lineWidth: 2 } }}
                    axis={{
                      x: { labelFill: '#c6d8ec' },
                      y: { labelFill: '#90a9c2' },
                    }}
                  />
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 0 }}>
            <Col xs={24} xl={8}>
              <Card className="sectionCard" title="模板分类覆盖" bordered={false}>
                <div className="chartWrap">
                  <Column
                    data={templateCoverageData}
                    xField="name"
                    yField="value"
                    color="#4d8dff"
                    legend={false}
                    axis={{
                      x: { labelFill: '#c6d8ec', labelAutoRotate: false },
                      y: { labelFill: '#90a9c2' },
                    }}
                    label={{ position: 'top', style: { fill: '#e9f6ff' } }}
                  />
                </div>
              </Card>
            </Col>

            <Col xs={24} xl={8}>
              <Card className="sectionCard" title="分级标签分布" bordered={false}>
                <div className="chartWrap">
                  <Rose
                    data={levelDistributionData}
                    xField="name"
                    yField="value"
                    colorField="name"
                    radius={0.82}
                    legend={{ position: 'bottom', itemLabelFill: '#c6d8ec' }}
                    color={['#ff6d78', '#ffb457', '#59f0b0', '#27d8ff', '#ff5ec4']}
                  />
                </div>
              </Card>
            </Col>

            <Col xs={24} xl={8}>
              <Card className="sectionCard" title="任务状态分布" bordered={false}>
                <div className="chartWrap">
                  <Pie
                    data={classificationTaskStatusData}
                    angleField="value"
                    colorField="type"
                    radius={0.82}
                    legend={{ position: 'bottom', itemLabelFill: '#c6d8ec' }}
                    label={{ text: 'type', style: { fill: '#e9f6ff', fontSize: 12 } }}
                    color={['#27d8ff', '#4d8dff', '#59f0b0', '#ffb457', '#ff6d78']}
                  />
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 0 }}>
            <Col xs={24} xl={10}>
              <Card className="sectionCard" title="治理风险雷达" bordered={false}>
                <div className="eventList">
                  {highRiskItems.map((item) => (
                    <div className="eventRow" key={item.title}>
                      <div className="eventMain">
                        <Text className="eventTitle">{item.title}</Text>
                        <Tag className="screenTag" color={item.color}>
                          {item.value}
                        </Tag>
                      </div>
                      <div className="eventMeta">{item.description}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 18 }}>
                  <div className="chartLegend">
                    <div className="legendItem">
                      <span className="legendDot" style={{ background: '#27d8ff', color: '#27d8ff' }} />
                      全局治理完成度
                    </div>
                  </div>
                  <Progress
                    percent={governanceWaveData.values[0]}
                    strokeColor={{ from: '#27d8ff', to: '#59f0b0' }}
                    trailColor="rgba(255,255,255,0.08)"
                  />
                </div>
              </Card>
            </Col>

            <Col xs={24} xl={14}>
              <Card className="sectionCard" title="最近全局动态" bordered={false}>
                <div className="eventList">
                  {eventItems.map((item) => (
                    <div className="eventRow" key={item.id}>
                      <div className="eventMain">
                        <div>
                          <div className="eventTitle">{item.title}</div>
                          <Text type="secondary">{item.type}</Text>
                        </div>
                        <Badge status={item.type === '资产导入' ? 'processing' : 'success'} text={item.status} />
                      </div>
                      <div className="eventMeta">
                        <span>负责人：{item.owner}</span>
                        <span>{item.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      </div>
    </PageContainer>
  );
};

export default BigScreen;
