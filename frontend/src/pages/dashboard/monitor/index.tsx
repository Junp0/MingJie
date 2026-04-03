import {
  AlertOutlined,
  ClusterOutlined,
  DatabaseOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { Badge, Card, Col, Progress, Row, Space, Table, Tag, Typography } from 'antd';
import React from 'react';
import { useDashboardData } from '../shared/useDashboardData';

const { Paragraph, Text } = Typography;

const statusBadgeMap = {
  waiting_import: 'warning',
  pending: 'default',
  running: 'processing',
  completed: 'success',
  failed: 'error',
  stopped: 'warning',
} as const;

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
      render: (value: keyof typeof statusBadgeMap) => (
        <Badge status={statusBadgeMap[value] as never} text={value} />
      ),
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 180,
      render: (value: number) => <Progress percent={value} size="small" />,
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
      render: (value: keyof typeof statusBadgeMap) => (
        <Badge status={statusBadgeMap[value] as never} text={value} />
      ),
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 180,
      render: (value: number) => <Progress percent={value} size="small" />,
    },
  ];

  const riskItems = [
    {
      title: '导入失败任务',
      count: failedImports.length,
      description: failedImports.length ? `最近失败任务：${failedImports[0].sourceName}` : '当前无导入失败任务',
      color: failedImports.length ? '#ff4d4f' : '#52c41a',
    },
    {
      title: '分类失败任务',
      count: failedClassificationTasks.length,
      description: failedClassificationTasks.length ? `最近失败任务：${failedClassificationTasks[0].taskName}` : '当前无分类失败任务',
      color: failedClassificationTasks.length ? '#fa541c' : '#52c41a',
    },
    {
      title: '归档资产分组',
      count: archivedGroups.length,
      description: archivedGroups.length ? `待复核分组：${archivedGroups[0].name}` : '当前无归档分组',
      color: archivedGroups.length ? '#faad14' : '#52c41a',
    },
    {
      title: '停用治理特征',
      count: disabledFeatures.length,
      description: disabledFeatures.length ? `最近停用：${disabledFeatures[0].featureName}` : '当前无停用特征',
      color: disabledFeatures.length ? '#722ed1' : '#52c41a',
    },
  ];

  return (
    <PageContainer
      header={{
        title: '平台监控页',
        subTitle: '监控导入流程、分类分级任务与治理能力状态。',
      }}
    >
      <Row gutter={[16, 16]} style={{ marginBottom: 8 }}>
        <Col xs={24} md={6}>
          <Card>
            <Space>
              <DatabaseOutlined style={{ color: '#1677ff' }} />
              <div>
                <div style={{ color: '#8c8c8c', fontSize: 12 }}>运行中的导入任务</div>
                <div style={{ fontSize: 24, fontWeight: 600 }}>
                  {importTasks.filter((task) => task.status === 'running').length}
                </div>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Space>
              <ClusterOutlined style={{ color: '#722ed1' }} />
              <div>
                <div style={{ color: '#8c8c8c', fontSize: 12 }}>运行中的分类任务</div>
                <div style={{ fontSize: 24, fontWeight: 600 }}>
                  {classificationTasks.filter((task) => task.status === 'running').length}
                </div>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Space>
              <AlertOutlined style={{ color: '#fa8c16' }} />
              <div>
                <div style={{ color: '#8c8c8c', fontSize: 12 }}>待处理异常</div>
                <div style={{ fontSize: 24, fontWeight: 600 }}>
                  {failedImports.length + failedClassificationTasks.length + archivedGroups.length}
                </div>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Space>
              <SafetyCertificateOutlined style={{ color: '#13c2c2' }} />
              <div>
                <div style={{ color: '#8c8c8c', fontSize: 12 }}>治理特征总数</div>
                <div style={{ fontSize: 24, fontWeight: 600 }}>
                  {maskingFeatures.length + encryptionFeatures.length}
                </div>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card title="导入流程监控">
            <Paragraph type="secondary">
              重点关注导入任务的执行状态、同步策略和完成度，确保资产接入链路稳定运行。
            </Paragraph>
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
          <Card title="分类分级任务监控">
            <Paragraph type="secondary">
              统一观察任务中心与导入流程创建的分类分级任务执行状态，确保分析链路连贯。
            </Paragraph>
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

      <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
        {riskItems.map((item) => (
          <Col xs={24} md={12} xl={6} key={item.title}>
            <Card>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 8,
                }}
              >
                <Text strong>{item.title}</Text>
                <Tag color={item.color}>{item.count}</Tag>
              </div>
              <Text type="secondary">{item.description}</Text>
            </Card>
          </Col>
        ))}
      </Row>
    </PageContainer>
  );
};

export default Monitor;
