import {
  AlertOutlined,
  ClusterOutlined,
  DatabaseOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { Badge, Card, Col, Progress, Row, Table, Tag, Typography } from 'antd';
import React from 'react';
import { useDashboardData } from '../shared/useDashboardData';
import './index.less';

const { Text } = Typography;

const statusBadgeMap = {
  waiting_import: 'warning',
  pending: 'default',
  running: 'processing',
  completed: 'success',
  failed: 'error',
  stopped: 'warning',
} as const;

const statusTextMap: Record<string, string> = {
  waiting_import: '等待导入',
  pending: '待执行',
  running: '执行中',
  completed: '已完成',
  failed: '失败',
  stopped: '已停止',
};

const Monitor: React.FC = () => {
  const {
    importTasks,
    classificationTasks,
    assetGroups,
    maskingFeatures,
    encryptionFeatures,
  } = useDashboardData();

  const failedImports = importTasks.filter((task) => task.status === 'failed');
  const failedClassificationTasks = classificationTasks.filter((task) => task.status === 'failed');
  const archivedGroups = assetGroups.filter((group) => group.status === 'archived');
  const disabledFeatures = [...maskingFeatures, ...encryptionFeatures].filter((feature) => feature.status === 'inactive');

  const kpiItems = [
    {
      label: '运行中的导入任务',
      value: importTasks.filter((task) => task.status === 'running').length,
      icon: <DatabaseOutlined style={{ fontSize: 64 }} />,
      colorClass: 'kpiBlue',
    },
    {
      label: '运行中的分类任务',
      value: classificationTasks.filter((task) => task.status === 'running').length,
      icon: <ClusterOutlined style={{ fontSize: 64 }} />,
      colorClass: 'kpiPurple',
    },
    {
      label: '待处理异常',
      value: failedImports.length + failedClassificationTasks.length + archivedGroups.length,
      icon: <AlertOutlined style={{ fontSize: 64 }} />,
      colorClass: 'kpiOrange',
    },
    {
      label: '治理特征总数',
      value: maskingFeatures.length + encryptionFeatures.length,
      icon: <SafetyCertificateOutlined style={{ fontSize: 64 }} />,
      colorClass: 'kpiCyan',
    },
  ];

  const importColumns = [
    {
      title: '导入任务',
      dataIndex: 'sourceName',
      key: 'sourceName',
      render: (value: string) => <Text strong>{value}</Text>,
    },
    {
      title: '同步策略',
      dataIndex: 'scheduleLabel',
      key: 'scheduleLabel',
      width: 220,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (value: string) => (
        <Badge
          status={statusBadgeMap[value as keyof typeof statusBadgeMap] as never}
          text={statusTextMap[value] ?? value}
        />
      ),
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 180,
      render: (value: number) => (
        <Progress
          percent={value}
          size="small"
          strokeColor={{ from: '#1677ff', to: '#13c2c2' }}
        />
      ),
    },
  ];

  const classificationColumns = [
    {
      title: '分类任务',
      dataIndex: 'taskName',
      key: 'taskName',
      render: (value: string) => <Text strong>{value}</Text>,
    },
    {
      title: '来源',
      dataIndex: 'sourceLabel',
      key: 'sourceLabel',
      width: 120,
      render: (value: string) => <Tag color={value === '导入流程' ? 'blue' : 'purple'}>{value}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (value: string) => (
        <Badge
          status={statusBadgeMap[value as keyof typeof statusBadgeMap] as never}
          text={statusTextMap[value] ?? value}
        />
      ),
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 180,
      render: (value: number) => (
        <Progress
          percent={value}
          size="small"
          strokeColor={{ from: '#722ed1', to: '#eb2f96' }}
        />
      ),
    },
  ];

  const riskItems = [
    {
      title: '导入失败任务',
      count: failedImports.length,
      description: failedImports.length ? `最近：${failedImports[0].sourceName}` : '暂无异常',
      severityClass: failedImports.length ? 'riskDanger' : 'riskOk',
      countColor: failedImports.length ? '#ff4d4f' : '#52c41a',
    },
    {
      title: '分类失败任务',
      count: failedClassificationTasks.length,
      description: failedClassificationTasks.length ? `最近：${failedClassificationTasks[0].taskName}` : '暂无异常',
      severityClass: failedClassificationTasks.length ? 'riskDanger' : 'riskOk',
      countColor: failedClassificationTasks.length ? '#fa541c' : '#52c41a',
    },
    {
      title: '归档资产分组',
      count: archivedGroups.length,
      description: archivedGroups.length ? `待复核：${archivedGroups[0].name}` : '暂无异常',
      severityClass: archivedGroups.length ? 'riskWarning' : 'riskOk',
      countColor: archivedGroups.length ? '#faad14' : '#52c41a',
    },
    {
      title: '停用治理特征',
      count: disabledFeatures.length,
      description: disabledFeatures.length ? `最近：${disabledFeatures[0].featureName}` : '暂无异常',
      severityClass: disabledFeatures.length ? 'riskInfo' : 'riskOk',
      countColor: disabledFeatures.length ? '#722ed1' : '#52c41a',
    },
  ];

  const activeSignals =
    importTasks.filter((task) => task.status === 'running').length +
    classificationTasks.filter((task) => task.status === 'running').length;

  return (
    <PageContainer
      className="monitorPage"
      header={{
        title: 'Operations Monitor',
        subTitle: '集中监控运行任务、失败流程、归档分组与停用治理特征。',
      }}
    >
      {/* KPI Cards */}
      <Row gutter={[24, 24]} style={{ marginBottom: 16 }} className="kpiRow">
        {kpiItems.map((item) => (
          <Col xs={24} sm={12} xl={6} key={item.label}>
            <Card className={`kpiCard ${item.colorClass}`} bordered={false}>
              <div className="kpiIconBg">{item.icon}</div>
              <div className="kpiValue">{item.value}</div>
              <div className="kpiLabel">{item.label}</div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Monitoring Tables */}
      <Row gutter={[24, 24]}>
        <Col xs={24} xl={12}>
          <Card className="tableCard" title="导入流程监控" bordered={false}>
            <div className="tableSubtext">重点关注导入任务的执行状态与完成进度</div>
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              columns={importColumns}
              dataSource={importTasks.slice(0, 6)}
            />
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card className="tableCard" title="分类分级任务监控" bordered={false}>
            <div className="tableSubtext">统一观察任务中心与导入流程创建的分类任务</div>
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              columns={classificationColumns}
              dataSource={classificationTasks.slice(0, 6)}
            />
          </Card>
        </Col>
      </Row>

      {/* Risk Cards */}
      <Row gutter={[24, 24]} style={{ marginTop: 16 }} className="riskRow">
        {riskItems.map((item) => (
          <Col xs={24} sm={12} xl={6} key={item.title}>
            <Card className={`riskCard ${item.severityClass}`} bordered={false}>
              <div className="riskHead">
                <span className="riskTitle">{item.title}</span>
                <span className="riskCount" style={{ background: item.countColor, color: '#fff' }}>
                  {item.count}
                </span>
              </div>
              <div className="riskDesc">{item.description}</div>
            </Card>
          </Col>
        ))}
      </Row>
    </PageContainer>
  );
};

export default Monitor;
