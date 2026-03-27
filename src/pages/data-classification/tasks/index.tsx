import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import {
  Badge,
  Button,
  Form,
  Input,
  Modal,
  Progress,
  Select,
  Tag,
  message,
} from 'antd';
import React, { useMemo, useRef, useState } from 'react';
import {
  createClassificationTask,
  listClassificationTasks,
  type ClassificationTaskFormValues,
  type ClassificationTaskRecord,
} from '@/services/data-classification/classificationTaskStore';
import { listClassificationTemplates } from '@/services/data-classification/templateStore';

const ClassificationTasks: React.FC = () => {
  const actionRef = useRef<ActionType | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<ClassificationTaskFormValues>();
  const [modalOpen, setModalOpen] = useState(false);

  const templateOptions = useMemo(
    () =>
      listClassificationTemplates().map((template) => ({
        value: template.id,
        label: template.templateName,
      })),
    [],
  );

  const columns: ProColumns<ClassificationTaskRecord>[] = [
    {
      title: '任务名称',
      dataIndex: 'taskName',
      valueType: 'text',
      align: 'center',
    },
    {
      title: '任务来源',
      dataIndex: 'sourceLabel',
      valueType: 'select',
      valueEnum: {
        '任务中心': { text: '任务中心' },
        '导入流程': { text: '导入流程' },
      },
      render: (_, record) => (
        <Tag color={record.taskSource === 'asset-import' ? 'blue' : 'purple'}>{record.sourceLabel}</Tag>
      ),
      align: 'center',
    },
    {
      title: '数据源',
      dataIndex: 'dataSource',
      valueType: 'text',
      align: 'center',
    },
    {
      title: '数据类型',
      dataIndex: 'dataType',
      valueType: 'select',
      valueEnum: {
        database: { text: '数据库' },
        file: { text: '文件' },
        api: { text: 'API' },
      },
      align: 'center',
    },
    {
      title: '分类类型',
      dataIndex: 'classificationType',
      valueType: 'select',
      valueEnum: {
        automatic: { text: '自动分类' },
        manual: { text: '人工复核' },
        hybrid: { text: '混合分类' },
      },
      align: 'center',
    },
    {
      title: '关联模板',
      dataIndex: 'templateName',
      valueType: 'text',
      search: false,
      align: 'center',
      render: (_, record) => record.templateName || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: {
        pending: { text: '待执行' },
        running: { text: '执行中' },
        completed: { text: '已完成' },
        failed: { text: '执行失败' },
        stopped: { text: '已停止' },
      },
      render: (_, record) => {
        const statusConfig = {
          pending: { color: 'default', text: '待执行' },
          running: { color: 'processing', text: '执行中' },
          completed: { color: 'success', text: '已完成' },
          failed: { color: 'error', text: '执行失败' },
          stopped: { color: 'warning', text: '已停止' },
        };
        const config = statusConfig[record.status];
        return <Badge status={config.color as never} text={config.text} />;
      },
      align: 'center',
    },
    {
      title: '进度',
      dataIndex: 'progress',
      search: false,
      render: (_, record) => (
        <div style={{ width: 120 }}>
          <Progress percent={record.progress} size="small" />
        </div>
      ),
      align: 'center',
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      valueType: 'select',
      valueEnum: {
        high: { text: '高' },
        medium: { text: '中' },
        low: { text: '低' },
      },
      render: (_, record) => {
        const color = record.priority === 'high' ? '#ff4d4f' : record.priority === 'medium' ? '#faad14' : '#52c41a';
        return <Tag color={color}>{record.priority === 'high' ? '高' : record.priority === 'medium' ? '中' : '低'}</Tag>;
      },
      align: 'center',
    },
    {
      title: '创建人',
      dataIndex: 'creator',
      valueType: 'text',
      align: 'center',
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      valueType: 'dateTime',
      search: false,
      align: 'center',
    },
    {
      title: '操作',
      dataIndex: 'option',
      valueType: 'option',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            type="link"
            size="small"
            style={{ padding: 0, margin: 0 }}
            onClick={() => {
              messageApi.info(`查看详情: ${record.taskName}`);
            }}
          >
            查看详情
          </Button>
          <Button
            type="link"
            size="small"
            style={{ padding: 0, margin: 0 }}
            onClick={() => {
              messageApi.info(`编辑任务: ${record.taskName}`);
            }}
          >
            编辑
          </Button>
        </div>
      ),
      align: 'center',
    },
  ];

  const handleCreateTask = async () => {
    const values = await form.validateFields();
    const selectedTemplate = templateOptions.find((item) => item.value === values.templateId);

    createClassificationTask(
      {
        ...values,
        templateName: selectedTemplate?.label,
      },
      {
        taskSource: 'classification-center',
        sourceLabel: '任务中心',
        creator: '当前用户',
      },
    );

    messageApi.success('分类分级任务已创建');
    setModalOpen(false);
    form.resetFields();
    actionRef.current?.reload();
  };

  return (
    <PageContainer>
      {contextHolder}
      <ProTable<ClassificationTaskRecord>
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 120,
          defaultCollapsed: true,
        }}
        toolBarRender={() => [
          <Button
            key="addTask"
            type="primary"
            onClick={() => {
              setModalOpen(true);
              form.setFieldsValue({
                taskName: '',
                dataSource: '',
                dataType: 'database',
                classificationType: 'automatic',
                priority: 'medium',
                description: '',
              });
            }}
          >
            新增任务
          </Button>,
        ]}
        request={async (params) => {
          const { taskName, status, sourceLabel } = params;
          let data = listClassificationTasks();

          if (taskName) {
            data = data.filter((item) => item.taskName.includes(String(taskName)));
          }
          if (status) {
            data = data.filter((item) => item.status === status);
          }
          if (sourceLabel) {
            data = data.filter((item) => item.sourceLabel === sourceLabel);
          }

          return {
            data,
            success: true,
            total: data.length,
          };
        }}
        columns={columns}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
        }}
      />

      <Modal
        title="新增分类分级任务"
        open={modalOpen}
        onOk={handleCreateTask}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        destroyOnClose
      >
        <Form<ClassificationTaskFormValues> form={form} layout="vertical">
          <Form.Item
            label="任务名称"
            name="taskName"
            rules={[{ required: true, message: '请输入任务名称' }]}
          >
            <Input placeholder="请输入任务名称" />
          </Form.Item>
          <Form.Item
            label="数据源"
            name="dataSource"
            rules={[{ required: true, message: '请输入数据源名称' }]}
          >
            <Input placeholder="请输入数据源名称" />
          </Form.Item>
          <Form.Item label="数据类型" name="dataType" rules={[{ required: true, message: '请选择数据类型' }]}>
            <Select
              options={[
                { value: 'database', label: '数据库' },
                { value: 'file', label: '文件' },
                { value: 'api', label: 'API' },
              ]}
            />
          </Form.Item>
          <Form.Item
            label="分类方式"
            name="classificationType"
            rules={[{ required: true, message: '请选择分类方式' }]}
          >
            <Select
              options={[
                { value: 'automatic', label: '自动分类' },
                { value: 'manual', label: '人工复核' },
                { value: 'hybrid', label: '混合分类' },
              ]}
            />
          </Form.Item>
          <Form.Item
            label="优先级"
            name="priority"
            rules={[{ required: true, message: '请选择优先级' }]}
          >
            <Select
              options={[
                { value: 'high', label: '高优先级' },
                { value: 'medium', label: '中优先级' },
                { value: 'low', label: '低优先级' },
              ]}
            />
          </Form.Item>
          <Form.Item label="关联模板" name="templateId">
            <Select allowClear placeholder="请选择分类分级模板" options={templateOptions} />
          </Form.Item>
          <Form.Item label="任务描述" name="description" rules={[{ required: true, message: '请输入任务描述' }]}>
            <Input.TextArea rows={4} placeholder="请输入任务描述" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default ClassificationTasks;
