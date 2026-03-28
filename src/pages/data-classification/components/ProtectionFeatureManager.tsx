import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import {
  Badge,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useEffect, useMemo, useState } from 'react';
import {
  createProtectionFeature,
  deleteProtectionFeature,
  getProtectionFeatureMatcherLabel,
  listProtectionFeatures,
  PROTECTION_FEATURE_MATCHER_OPTIONS,
  type ProtectionFeatureFormValues,
  type ProtectionFeatureRecord,
  type ProtectionFeatureType,
  updateProtectionFeature,
  updateProtectionFeatureStatus,
} from '@/services/data-classification/protectionFeatureStore';

const { Search, TextArea } = Input;
const { Paragraph } = Typography;

interface ProtectionFeatureManagerProps {
  featureType: ProtectionFeatureType;
  title: string;
  description: string;
  sceneLabel?: string;
  featurePointLabel: string;
  sceneOptions: string[];
  createButtonText: string;
  showFeatureCode?: boolean;
  showScene?: boolean;
  showPriority?: boolean;
  defaultSceneValue?: string;
  defaultPriority?: number;
}

const ProtectionFeatureManager: React.FC<ProtectionFeatureManagerProps> = ({
  featureType,
  title,
  description,
  sceneLabel = '适用场景',
  featurePointLabel,
  sceneOptions,
  createButtonText,
  showFeatureCode = true,
  showScene = true,
  showPriority = true,
  defaultSceneValue = '通用场景',
  defaultPriority = 50,
}) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<ProtectionFeatureFormValues>();
  const [features, setFeatures] = useState<ProtectionFeatureRecord[]>([]);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sceneFilter, setSceneFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<ProtectionFeatureRecord | null>(null);

  const loadFeatures = async () => {
    const data = await listProtectionFeatures(featureType);
    setFeatures(data);
  };

  useEffect(() => {
    loadFeatures();
  }, [featureType]);

  const filteredFeatures = useMemo(() => {
    return features.filter((feature) => {
      const matchesKeyword =
        !keyword ||
        [
          feature.featureName,
          feature.featureCode,
          feature.scene,
          feature.featurePoint,
          feature.expression,
          feature.sampleValue,
          feature.description,
        ].some((value) => value.toLowerCase().includes(keyword.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || feature.status === statusFilter;
      const matchesScene = sceneFilter === 'all' || feature.scene === sceneFilter;

      return matchesKeyword && matchesStatus && matchesScene;
    });
  }, [features, keyword, sceneFilter, statusFilter]);

  const totalCount = features.length;
  const activeCount = features.filter((feature) => feature.status === 'active').length;
  const averageConfidence = totalCount
    ? Math.round(features.reduce((sum, feature) => sum + feature.confidence, 0) / totalCount)
    : 0;

  const searchPlaceholder = [
    '搜索特征名称',
    showFeatureCode ? '编码' : null,
    showScene ? sceneLabel : null,
    '表达式',
  ]
    .filter(Boolean)
    .join('、');

  const openCreateModal = () => {
    setEditingFeature(null);
    setModalOpen(true);
    form.setFieldsValue({
      featureName: '',
      featureCode: '',
      scene: sceneOptions[0] ?? defaultSceneValue,
      featurePoint: '',
      matcher: 'regex',
      expression: '',
      sampleValue: '',
      confidence: 85,
      priority: defaultPriority,
      status: 'active',
      description: '',
    });
  };

  const openEditModal = (feature: ProtectionFeatureRecord) => {
    setEditingFeature(feature);
    setModalOpen(true);
    form.setFieldsValue({
      featureName: feature.featureName,
      featureCode: feature.featureCode,
      scene: feature.scene,
      featurePoint: feature.featurePoint,
      matcher: feature.matcher,
      expression: feature.expression,
      sampleValue: feature.sampleValue,
      confidence: feature.confidence,
      priority: feature.priority,
      status: feature.status,
      description: feature.description,
    });
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const normalizedValues: ProtectionFeatureFormValues = {
      ...values,
      featureCode: showFeatureCode
        ? values.featureCode.trim()
        : editingFeature?.featureCode ?? `${featureType.toUpperCase()}_${Date.now()}`,
      scene: showScene
        ? values.scene.trim()
        : editingFeature?.scene ?? defaultSceneValue,
      priority: showPriority
        ? values.priority
        : editingFeature?.priority ?? defaultPriority,
    };

    const duplicatedCode = features.some(
      (feature) =>
        feature.featureCode === normalizedValues.featureCode && feature.id !== editingFeature?.id,
    );

    if (showFeatureCode && duplicatedCode) {
      messageApi.error('特征编码已存在，请更换后重试');
      return;
    }

    if (editingFeature) {
      const updated = await updateProtectionFeature(editingFeature.id, normalizedValues);
      if (!updated) {
        messageApi.error('特征更新失败，请重试');
        return;
      }
      messageApi.success('特征已更新');
    } else {
      await createProtectionFeature(featureType, normalizedValues);
      messageApi.success('特征已创建');
    }

    setModalOpen(false);
    setEditingFeature(null);
    form.resetFields();
    loadFeatures();
  };

  const handleDelete = (feature: ProtectionFeatureRecord) => {
    Modal.confirm({
      title: '确认删除特征',
      content: `确定要删除特征“${feature.featureName}”吗？`,
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        const deleted = await deleteProtectionFeature(feature.id);
        if (!deleted) {
          messageApi.error('删除失败，请重试');
          return;
        }

        messageApi.success('特征已删除');
        loadFeatures();
      },
    });
  };

  const handleStatusChange = async (feature: ProtectionFeatureRecord, checked: boolean) => {
    const nextStatus = checked ? 'active' : 'inactive';
    const updated = await updateProtectionFeatureStatus(feature.id, nextStatus);
    if (!updated) {
      messageApi.error('状态更新失败，请重试');
      return;
    }

    messageApi.success(`已${checked ? '启用' : '停用'}特征`);
    loadFeatures();
  };

  const columns: ColumnsType<ProtectionFeatureRecord> = [
    {
      title: '特征名称',
      dataIndex: 'featureName',
      key: 'featureName',
      width: 180,
    },
  ];

  if (showFeatureCode) {
    columns.push({
      title: '特征编码',
      dataIndex: 'featureCode',
      key: 'featureCode',
      width: 160,
      render: (value: string) => <code>{value}</code>,
    });
  }

  if (showScene) {
    columns.push({
      title: sceneLabel,
      dataIndex: 'scene',
      key: 'scene',
      width: 120,
      render: (value: string) => <Tag color="blue">{value}</Tag>,
    });
  }

  columns.push(
    {
      title: featurePointLabel,
      dataIndex: 'featurePoint',
      key: 'featurePoint',
      width: 220,
      render: (value: string) => (
        <Tooltip title={value}>
          <span
            style={{
              display: 'inline-block',
              maxWidth: 220,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {value}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '识别方式',
      dataIndex: 'matcher',
      key: 'matcher',
      width: 120,
      render: (value: ProtectionFeatureRecord['matcher']) => getProtectionFeatureMatcherLabel(value),
    },
    {
      title: '识别表达式',
      dataIndex: 'expression',
      key: 'expression',
      width: 220,
      render: (value: string) => (
        <Tooltip title={value}>
          <span
            style={{
              display: 'inline-block',
              maxWidth: 220,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {value}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '样例值',
      dataIndex: 'sampleValue',
      key: 'sampleValue',
      width: 180,
      render: (value: string) => (
        <Tooltip title={value}>
          <span
            style={{
              display: 'inline-block',
              maxWidth: 180,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {value}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '置信度',
      dataIndex: 'confidence',
      key: 'confidence',
      width: 100,
      render: (value: number) => `${value}%`,
    },
  );

  if (showPriority) {
    columns.push({
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 90,
    });
  }

  columns.push(
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (value: ProtectionFeatureRecord['status'], record: ProtectionFeatureRecord) => (
        <Space size={8}>
          <Badge status={value === 'active' ? 'success' : 'default'} text={value === 'active' ? '启用' : '停用'} />
          <Switch
            size="small"
            checked={value === 'active'}
            onChange={(checked) => handleStatusChange(record, checked)}
          />
        </Space>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 170,
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, record: ProtectionFeatureRecord) => (
        <Space size={4}>
          <Tooltip title="编辑特征">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)} />
          </Tooltip>
          <Tooltip title="删除特征">
            <Button danger type="text" size="small" icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
          </Tooltip>
        </Space>
      ),
    },
  );

  return (
    <PageContainer
      header={{
        title,
        subTitle: description,
      }}
    >
      {contextHolder}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="特征总数" value={totalCount} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="已启用" value={activeCount} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="平均置信度" value={averageConfidence} suffix="%" />
          </Card>
        </Col>
      </Row>

      <Card
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadFeatures}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
              {createButtonText}
            </Button>
          </Space>
        }
      >
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={10}>
            <Search
              allowClear
              placeholder={searchPlaceholder}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </Col>
          {showScene ? (
            <Col xs={24} md={7}>
              <Select
                style={{ width: '100%' }}
                value={sceneFilter}
                onChange={setSceneFilter}
                options={[
                  { value: 'all', label: `全部${sceneLabel}` },
                  ...sceneOptions.map((item) => ({ value: item, label: item })),
                ]}
              />
            </Col>
          ) : null}
          <Col xs={24} md={7}>
            <Select
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as 'all' | 'active' | 'inactive')}
              options={[
                { value: 'all', label: '全部状态' },
                { value: 'active', label: '启用' },
                { value: 'inactive', label: '停用' },
              ]}
            />
          </Col>
        </Row>

        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
          特征配置当前使用本地数据保存，后续接入后端接口时可直接替换仓库层逻辑。
        </Paragraph>

        <Table<ProtectionFeatureRecord>
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={filteredFeatures}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
          }}
          scroll={{ x: 1800 }}
        />
      </Card>

      <Modal
        title={editingFeature ? '编辑特征' : createButtonText}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => {
          setModalOpen(false);
          setEditingFeature(null);
          form.resetFields();
        }}
        destroyOnClose
        width={820}
      >
        <Form<ProtectionFeatureFormValues> form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="特征名称"
                name="featureName"
                rules={[{ required: true, message: '请输入特征名称' }]}
              >
                <Input placeholder="请输入特征名称" maxLength={40} />
              </Form.Item>
            </Col>
            {showFeatureCode ? (
              <Col span={12}>
                <Form.Item
                  label="特征编码"
                  name="featureCode"
                  rules={[{ required: true, message: '请输入特征编码' }]}
                >
                  <Input placeholder="请输入特征编码" maxLength={40} />
                </Form.Item>
              </Col>
            ) : null}
          </Row>

          <Row gutter={16}>
            {showScene ? (
              <Col span={12}>
                <Form.Item
                  label={sceneLabel}
                  name="scene"
                  rules={[{ required: true, message: `请选择${sceneLabel}` }]}
                >
                  <Select options={sceneOptions.map((item) => ({ value: item, label: item }))} />
                </Form.Item>
              </Col>
            ) : null}
            <Col span={showScene ? 12 : 24}>
              <Form.Item
                label={featurePointLabel}
                name="featurePoint"
                rules={[{ required: true, message: `请输入${featurePointLabel}` }]}
              >
                <Input placeholder={`请输入${featurePointLabel}`} maxLength={80} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="识别方式"
                name="matcher"
                rules={[{ required: true, message: '请选择识别方式' }]}
              >
                <Select options={PROTECTION_FEATURE_MATCHER_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="置信度"
                name="confidence"
                rules={[{ required: true, message: '请输入置信度' }]}
              >
                <InputNumber min={0} max={100} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            {showPriority ? (
              <Col span={8}>
                <Form.Item
                  label="优先级"
                  name="priority"
                  rules={[{ required: true, message: '请输入优先级' }]}
                >
                  <InputNumber min={0} max={999} precision={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            ) : null}
          </Row>

          <Form.Item
            label="识别表达式"
            name="expression"
            rules={[{ required: true, message: '请输入识别表达式' }]}
          >
            <TextArea rows={3} placeholder="请输入正则、关键字或枚举特征表达式" maxLength={300} showCount />
          </Form.Item>

          <Form.Item
            label="样例值"
            name="sampleValue"
            rules={[{ required: true, message: '请输入样例值' }]}
          >
            <Input placeholder="请输入样例值" maxLength={120} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="状态"
                name="status"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select
                  options={[
                    { value: 'active', label: '启用' },
                    { value: 'inactive', label: '停用' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="说明" name="description">
            <TextArea rows={3} placeholder="补充说明特征适用边界或注意事项" maxLength={300} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default ProtectionFeatureManager;
