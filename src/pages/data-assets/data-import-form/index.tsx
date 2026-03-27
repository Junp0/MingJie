import {
  CheckCircleOutlined,
  DatabaseOutlined,
  ExperimentOutlined,
  ProfileOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useLocation, useNavigate } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Steps,
  Switch,
  Tag,
  Typography,
  message,
} from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  createImportTask,
  linkClassificationTaskToImport,
  type DataAssetImportFormValues,
  type ImportScheduleMode,
  type ImportSourceType,
} from '@/services/data-assets/importTaskStore';
import {
  createClassificationTask,
  type ClassificationTaskDataType,
  type ClassificationTaskFormValues,
} from '@/services/data-classification/classificationTaskStore';
import { listClassificationTemplates } from '@/services/data-classification/templateStore';
import { listAssetGroupSelectOptions } from '@/services/data-assets/assetGroupStore';

const { TextArea } = Input;
const { Text } = Typography;

interface ImportWorkflowFormValues extends Omit<DataAssetImportFormValues, 'executeAt' | 'description'> {
  executeAt?: dayjs.Dayjs;
  description?: string;
  createClassificationTask: boolean;
  classificationTaskName?: string;
  classificationPriority?: ClassificationTaskFormValues['priority'];
  classificationTemplateId?: string;
  classificationDescription?: string;
}

const SOURCE_TYPE_OPTIONS: Array<{ value: ImportSourceType; label: string }> = [
  { value: 'database', label: '数据库' },
  { value: 'file', label: '文件' },
  { value: 'api', label: 'API' },
  { value: 'message_queue', label: '消息队列' },
];

const CONNECTOR_TYPE_OPTIONS: Record<ImportSourceType, Array<{ value: string; label: string; port?: number }>> = {
  database: [
    { value: 'MySQL', label: 'MySQL', port: 3306 },
    { value: 'PostgreSQL', label: 'PostgreSQL', port: 5432 },
    { value: 'Oracle', label: 'Oracle', port: 1521 },
    { value: 'SQLServer', label: 'SQL Server', port: 1433 },
    { value: 'MongoDB', label: 'MongoDB', port: 27017 },
  ],
  file: [
    { value: 'CSV文件', label: 'CSV 文件' },
    { value: 'Excel文件', label: 'Excel 文件' },
    { value: 'Parquet文件', label: 'Parquet 文件' },
  ],
  api: [
    { value: 'REST API', label: 'REST API', port: 443 },
    { value: 'GraphQL API', label: 'GraphQL API', port: 443 },
    { value: 'Webhook', label: 'Webhook', port: 443 },
  ],
  message_queue: [
    { value: 'Kafka', label: 'Kafka', port: 9092 },
    { value: 'RocketMQ', label: 'RocketMQ', port: 9876 },
    { value: 'RabbitMQ', label: 'RabbitMQ', port: 5672 },
  ],
};

const SCHEDULE_MODE_OPTIONS: Array<{ value: ImportScheduleMode; label: string }> = [
  { value: 'single', label: '单次同步' },
  { value: 'daily', label: '每日' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
];

const PRIORITY_OPTIONS: Array<{
  value: ClassificationTaskFormValues['priority'];
  label: string;
}> = [
  { value: 'high', label: '高优先级' },
  { value: 'medium', label: '中优先级' },
  { value: 'low', label: '低优先级' },
];

const mapImportSourceTypeToTaskDataType = (sourceType: ImportSourceType): ClassificationTaskDataType => {
  switch (sourceType) {
    case 'database':
      return 'database';
    case 'file':
      return 'file';
    default:
      return 'api';
  }
};

const DataImportForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm<ImportWorkflowFormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const sourceType = Form.useWatch('sourceType', form) ?? 'database';
  const sourceName = Form.useWatch('sourceName', form);
  const createClassificationTaskSwitch = Form.useWatch('createClassificationTask', form);
  const scheduleMode = Form.useWatch('scheduleMode', form);

  const templateOptions = useMemo(
    () =>
      listClassificationTemplates().map((template) => ({
        value: template.id,
        label: template.templateName,
      })),
    [],
  );
  const defaultTemplateOption = useMemo(
    () => templateOptions.find((item) => item.label === '标准分类分级模板') ?? templateOptions[0],
    [templateOptions],
  );

  const assetGroupOptions = useMemo(() => listAssetGroupSelectOptions(), []);
  const discoveryPreset = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const portValue = params.get('port');
    const parsedPort = portValue ? Number(portValue) : undefined;

    return {
      sourceType: (params.get('sourceType') as ImportSourceType | null) ?? undefined,
      databaseType: params.get('databaseType') ?? undefined,
      ipAddress: params.get('ipAddress') ?? undefined,
      port: Number.isFinite(parsedPort) ? parsedPort : undefined,
      assetGroupId: params.get('assetGroupId') ?? undefined,
      from: params.get('from') ?? undefined,
    };
  }, [location.search]);
  const backPath = discoveryPreset.from === 'asset-discovery'
    ? '/data-assets/auto-scan'
    : discoveryPreset.from === 'asset-list'
      ? '/data-assets/data-asset-list'
      : '/data-assets/data-import';
  const connectorOptions = useMemo(() => {
    const baseOptions = CONNECTOR_TYPE_OPTIONS[sourceType];

    if (
      sourceType === 'database' &&
      discoveryPreset.databaseType &&
      !baseOptions.some((item) => item.value === discoveryPreset.databaseType)
    ) {
      return [
        ...baseOptions,
        {
          value: discoveryPreset.databaseType,
          label: discoveryPreset.databaseType,
          port: discoveryPreset.port,
        },
      ];
    }

    return baseOptions;
  }, [discoveryPreset.databaseType, discoveryPreset.port, sourceType]);

  useEffect(() => {
    if (createClassificationTaskSwitch && sourceName) {
      const currentTaskName = form.getFieldValue('classificationTaskName');
      if (!currentTaskName || /_数据分类分级任务$/.test(currentTaskName)) {
        form.setFieldsValue({
          classificationTaskName: `${sourceName}_数据分类分级任务`,
        });
      }
    }
  }, [createClassificationTaskSwitch, form, sourceName]);

  useEffect(() => {
    if (defaultTemplateOption && !form.getFieldValue('classificationTemplateId')) {
      form.setFieldsValue({
        classificationTemplateId: defaultTemplateOption.value,
      });
    }
  }, [defaultTemplateOption, form]);

  useEffect(() => {
    if (
      !discoveryPreset.ipAddress &&
      !discoveryPreset.port &&
      !discoveryPreset.databaseType &&
      !discoveryPreset.assetGroupId
    ) {
      return;
    }

    form.setFieldsValue({
      sourceType: discoveryPreset.sourceType ?? 'database',
      databaseType: discoveryPreset.databaseType ?? form.getFieldValue('databaseType') ?? 'MySQL',
      ipAddress: discoveryPreset.ipAddress ?? form.getFieldValue('ipAddress'),
      port: discoveryPreset.port ?? form.getFieldValue('port') ?? 3306,
      assetGroupId: discoveryPreset.assetGroupId ?? form.getFieldValue('assetGroupId'),
    });
  }, [discoveryPreset, form]);

  const handleSourceTypeChange = (value: ImportSourceType) => {
    const firstConnector = CONNECTOR_TYPE_OPTIONS[value][0];
    form.setFieldsValue({
      databaseType: firstConnector?.value,
      port: firstConnector?.port ?? 0,
    });
  };

  const handleConnectorChange = (value: string) => {
    const matched = connectorOptions.find((item) => item.value === value);
    if (typeof matched?.port === 'number') {
      form.setFieldsValue({ port: matched.port });
    }
  };

  const validateStepOne = async () => {
    await form.validateFields([
      'sourceName',
      'sourceType',
      'databaseType',
      'ipAddress',
      'port',
      'username',
      'password',
      'assetGroupId',
      'scheduleMode',
      'executeAt',
    ]);

  };

  const validateStepTwo = async () => {
    if (!form.getFieldValue('createClassificationTask')) {
      return;
    }

    await form.validateFields([
      'classificationTaskName',
      'classificationPriority',
      'classificationTemplateId',
    ]);
  };

  const handleNext = async () => {
    try {
      await validateStepOne();

      const currentSourceName = form.getFieldValue('sourceName');
      const currentTaskName = form.getFieldValue('classificationTaskName');
      const shouldCreateTask = form.getFieldValue('createClassificationTask');

      if (shouldCreateTask && currentSourceName && (!currentTaskName || /_数据分类分级任务$/.test(currentTaskName))) {
        form.setFieldsValue({
          classificationTaskName: `${currentSourceName}_数据分类分级任务`,
        });
      }

      setCurrentStep(1);
    } catch (_error) {
      messageApi.error('请先完善数据资产属性');
    }
  };

  const handleSubmit = async () => {
    try {
      await validateStepOne();
      await validateStepTwo();
      const values = await form.validateFields();

      setSubmitting(true);

      const importTask = createImportTask(
        {
          sourceName: values.sourceName,
          sourceType: values.sourceType,
          databaseType: values.databaseType,
          ipAddress: values.ipAddress,
          port: values.port,
          username: values.username,
          password: values.password,
          assetGroupId: values.assetGroupId,
          assetGroupName:
            assetGroupOptions.find((item) => item.value === values.assetGroupId)?.label ?? '未分组',
          scheduleMode: values.scheduleMode,
          executeAt: values.executeAt?.format('YYYY-MM-DD HH:mm:ss'),
          description: values.description ?? '',
        },
        {
          creator: '当前用户',
        },
      );

      let createdClassificationTaskId: string | undefined;

      if (values.createClassificationTask) {
        const selectedTemplate = templateOptions.find(
          (template) => template.value === values.classificationTemplateId,
        );

        const classificationTask = createClassificationTask(
          {
            taskName: values.classificationTaskName ?? `${values.sourceName}_数据分类分级任务`,
            dataSource: values.sourceName,
            dataType: mapImportSourceTypeToTaskDataType(values.sourceType),
            classificationType: 'automatic',
            priority: values.classificationPriority ?? 'medium',
            description: values.classificationDescription ?? '',
            templateId: values.classificationTemplateId,
            templateName: selectedTemplate?.label,
          },
          {
            taskSource: 'asset-import',
            sourceLabel: '导入流程',
            importTaskId: importTask.id,
            creator: '当前用户',
          },
        );

        createdClassificationTaskId = classificationTask.id;
        linkClassificationTaskToImport(importTask.id, classificationTask.id);
      }

      messageApi.success(
        createdClassificationTaskId
          ? '导入任务和分类分级任务已创建'
          : '导入任务已创建',
      );
      navigate(`/data-assets/import-detail/${importTask.id}`);
    } catch (_error) {
      if (!submitting) {
        messageApi.error('请先完善表单信息');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    {
      title: '定义数据资产属性',
      description: '配置数据源、分组和同步策略',
      icon: <DatabaseOutlined />,
    },
    {
      title: '设计分类分级任务',
      description: '控制是否同步创建分类分级任务',
      icon: <ExperimentOutlined />,
    },
  ];

  return (
    <PageContainer
      title="新增数据资产导入任务"
      onBack={() => navigate(backPath)}
    >
      {contextHolder}

      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <Card style={{ marginBottom: 24 }}>
          <Steps current={currentStep} items={steps} />
        </Card>

        <Form<ImportWorkflowFormValues>
          form={form}
          layout="vertical"
          initialValues={{
            sourceType: 'database',
            databaseType: 'MySQL',
            port: 3306,
            scheduleMode: 'daily',
            createClassificationTask: true,
            classificationPriority: 'medium',
          }}
        >
          <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
            <Card title="第一步：定义数据资产属性" styles={{ body: { paddingBlock: 20 } }}>
              {discoveryPreset.from === 'asset-discovery' ? (
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 20 }}
                  message="已从数据资产发现带入连接信息"
                  description="IP、端口和数据库类型已自动预填，请继续补充资产名称、访问凭证、资产分组和同步策略。"
                />
              ) : null}
              <Row gutter={20}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="数据资产名称"
                    name="sourceName"
                    rules={[{ required: true, message: '请输入数据资产名称' }]}
                  >
                    <Input placeholder="例如：crm_customer_db" maxLength={50} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="数据源类型"
                    name="sourceType"
                    rules={[{ required: true, message: '请选择数据源类型' }]}
                  >
                    <Select
                      options={SOURCE_TYPE_OPTIONS}
                      onChange={(value) => handleSourceTypeChange(value as ImportSourceType)}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={20}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="接入类型"
                    name="databaseType"
                    rules={[{ required: true, message: '请选择接入类型' }]}
                  >
                    <Select options={connectorOptions} onChange={handleConnectorChange} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="接入地址"
                    name="ipAddress"
                    rules={[{ required: true, message: '请输入接入地址' }]}
                  >
                    <Input
                      placeholder={
                        sourceType === 'file'
                          ? '例如：/data/import/customer.csv'
                          : sourceType === 'api'
                            ? '例如：https://api.example.com/v1/customer'
                            : '例如：192.168.1.100'
                      }
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={20}>
                <Col xs={24} md={8}>
                  <Form.Item
                    label="端口号"
                    name="port"
                    rules={[{ required: true, message: '请输入端口号' }]}
                  >
                    <InputNumber min={0} max={65535} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item
                    label="访问账号"
                    name="username"
                    rules={[{ required: true, message: '请输入访问账号' }]}
                  >
                    <Input placeholder="请输入访问账号" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item
                    label="访问凭证"
                    name="password"
                    rules={[{ required: true, message: '请输入访问凭证' }]}
                  >
                    <Input.Password placeholder="请输入访问凭证" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label="资产分组"
                name="assetGroupId"
                rules={[{ required: true, message: '请选择资产分组' }]}
              >
                <Select
                  showSearch
                  placeholder="请选择资产分组"
                  options={assetGroupOptions}
                  optionFilterProp="label"
                />
              </Form.Item>

              <Row gutter={20}>
                <Col xs={24} md={8}>
                  <Form.Item
                    label="同步策略"
                    name="scheduleMode"
                    rules={[{ required: true, message: '请选择同步策略' }]}
                  >
                    <Select options={SCHEDULE_MODE_OPTIONS} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={16}>
                  <Form.Item
                    label={scheduleMode === 'single' ? '执行时间' : '首次执行时间'}
                    name="executeAt"
                    rules={[{ required: true, message: '请选择执行时间' }]}
                  >
                    <DatePicker
                      showTime
                      format="YYYY-MM-DD HH:mm"
                      placeholder={
                        scheduleMode === 'single'
                          ? '请选择单次同步执行时间'
                          : '请选择首次执行时间'
                      }
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="任务描述" name="description">
                <TextArea
                  rows={4}
                  placeholder="补充说明导入目标、同步策略和业务背景"
                  maxLength={300}
                  showCount
                />
              </Form.Item>
            </Card>
          </div>

          <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Card title="第二步：设计数据分类分级任务">
                <Row gutter={[16, 16]} align="middle">
                  <Col span={18}>
                    <Space direction="vertical" size={4}>
                      <Space>
                        <ProfileOutlined />
                        <Text strong>同步创建分类分级任务</Text>
                        <Tag color="processing">独立任务来源：导入流程</Tag>
                      </Space>
                      <Text type="secondary">
                        这里创建的分类分级任务会进入“数据分类分级 / 分类分级任务”列表，并以“导入流程”作为来源标识；
                        在分类分级任务页手动创建的任务仍会保留为“任务中心”来源，两个入口互不冲突。
                      </Text>
                    </Space>
                  </Col>
                  <Col span={6} style={{ textAlign: 'right' }}>
                    <Form.Item name="createClassificationTask" valuePropName="checked" noStyle>
                      <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              <Card
                title="导入资产摘要"
                extra={<Tag icon={<CheckCircleOutlined />} color="blue">将始终创建导入任务</Tag>}
              >
                <Row gutter={[16, 12]}>
                  <Col xs={24} md={8}>
                    <Text type="secondary">数据资产名称：</Text>
                    <Text strong>{sourceName || '-'}</Text>
                  </Col>
                  <Col xs={24} md={8}>
                    <Text type="secondary">数据源类型：</Text>
                    <Text>{SOURCE_TYPE_OPTIONS.find((item) => item.value === sourceType)?.label ?? '-'}</Text>
                  </Col>
                  <Col xs={24} md={8}>
                    <Text type="secondary">接入类型：</Text>
                    <Text>{form.getFieldValue('databaseType') || '-'}</Text>
                  </Col>
                  <Col span={24}>
                    <Text type="secondary">资产分组：</Text>
                    <Text>{assetGroupOptions.find((item) => item.value === form.getFieldValue('assetGroupId'))?.label || '-'}</Text>
                  </Col>
                  <Col span={24}>
                    <Text type="secondary">{scheduleMode === 'single' ? '执行时间：' : '首次执行时间：'}</Text>
                    <Text>
                      {form.getFieldValue('executeAt')
                        ? dayjs(form.getFieldValue('executeAt')).format('YYYY-MM-DD HH:mm')
                        : '-'}
                    </Text>
                  </Col>
                </Row>
              </Card>

              {createClassificationTaskSwitch ? (
                <Card title="分类分级任务参数">
                  <Row gutter={20}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        label="任务名称"
                        name="classificationTaskName"
                        rules={[{ required: true, message: '请输入分类分级任务名称' }]}
                      >
                        <Input placeholder="请输入分类分级任务名称" maxLength={60} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        label="关联模板"
                        name="classificationTemplateId"
                        rules={[{ required: true, message: '请选择分类分级模板' }]}
                      >
                        <Select placeholder="请选择分类分级模板" options={templateOptions} />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={20}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        label="优先级"
                        name="classificationPriority"
                        rules={[{ required: true, message: '请选择优先级' }]}
                      >
                        <Select options={PRIORITY_OPTIONS} />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item label="任务描述" name="classificationDescription">
                    <TextArea rows={4} placeholder="请输入分类分级任务描述" maxLength={300} showCount />
                  </Form.Item>
                </Card>
              ) : (
                <Alert
                  type="info"
                  showIcon
                  message="已关闭同步创建分类分级任务"
                  description="本次仅创建数据资产导入任务，后续如需分类分级任务，仍可在“数据分类分级 / 分类分级任务”页面单独创建。"
                />
              )}
            </Space>
          </div>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Space size="large">
            {currentStep > 0 ? <Button onClick={() => setCurrentStep(0)}>上一步</Button> : null}
            {currentStep === 0 ? (
              <Button type="primary" onClick={handleNext}>
                下一步
              </Button>
            ) : (
              <Button type="primary" loading={submitting} onClick={handleSubmit}>
                提交并创建任务
              </Button>
            )}
            <Button onClick={() => navigate(backPath)}>取消</Button>
          </Space>
        </div>
      </div>
    </PageContainer>
  );
};

export default DataImportForm;
