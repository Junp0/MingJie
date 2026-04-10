import { listDataAssets } from "@/services/data-assets/dataAssetStore";
import {
  createClassificationTask,
  deleteClassificationTask,
  listClassificationTasks,
  updateClassificationTask,
  type ClassificationTaskFormValues,
  type ClassificationTaskRecord,
  type ClassificationTaskScheduleMode,
} from "@/services/data-classification/classificationTaskStore";
import { listClassificationTemplates } from "@/services/data-classification/templateStore";
import type { ActionType, ProColumns } from "@ant-design/pro-components";
import { PageContainer, ProTable } from "@ant-design/pro-components";
import {
  Badge,
  Button,
  DatePicker,
  Descriptions,
  Form,
  Input,
  Modal,
  Progress,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import React, { useRef, useState } from "react";
import { parseBeijingDateTime } from "@/utils/datetime";

type TaskModalFormValues = {
  taskName: string;
  dataType: ClassificationTaskFormValues["dataType"];
  scheduleMode: ClassificationTaskScheduleMode;
  dataAssetIds: string[];
  templateId?: string;
  executeAt?: Dayjs;
};

type TaskModalMode = "create" | "edit";

const DATA_TYPE_OPTIONS = [
  { value: "database", label: "数据库" },
  { value: "file", label: "文件" },
  { value: "api", label: "API" },
] as const;

const SCHEDULE_MODE_OPTIONS = [
  { value: "auto_after_import", label: "导入完成后自动执行" },
  { value: "single", label: "单次执行" },
] as const;

const SCHEDULE_MODE_LABEL_MAP: Record<ClassificationTaskScheduleMode, string> = {
  auto_after_import: "导入完成后自动执行",
  single: "单次执行",
};

const STATUS_TEXT_MAP: Record<ClassificationTaskRecord["status"], string> = {
  waiting_import: "等待导入",
  pending: "待执行",
  running: "执行中",
  completed: "已完成",
  failed: "执行失败",
  stopped: "已停止",
};

const STATUS_BADGE_MAP: Record<
  ClassificationTaskRecord["status"],
  "default" | "processing" | "success" | "error" | "warning"
> = {
  waiting_import: "warning",
  pending: "default",
  running: "processing",
  completed: "success",
  failed: "error",
  stopped: "warning",
};

const renderAssetTags = (assetNames: string[]) => {
  if (!assetNames.length) return "-";

  return (
    <Space size={[0, 6]} wrap>
      {assetNames.map((assetName) => (
        <Tag key={assetName} color="blue" style={{ marginInlineEnd: 0 }}>
          {assetName}
        </Tag>
      ))}
    </Space>
  );
};

const ClassificationTasks: React.FC = () => {
  const actionRef = useRef<ActionType | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<TaskModalFormValues>();
  const scheduleMode = Form.useWatch("scheduleMode", form);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<TaskModalMode>("create");
  const [submitting, setSubmitting] = useState(false);
  const [editingTask, setEditingTask] =
    useState<ClassificationTaskRecord | null>(null);
  const [detailTask, setDetailTask] = useState<ClassificationTaskRecord | null>(
    null
  );
  const [templateOptions, setTemplateOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [assetOptions, setAssetOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);

  React.useEffect(() => {
    const loadOptions = async () => {
      try {
        const [templates, assets] = await Promise.all([
          listClassificationTemplates(),
          listDataAssets(),
        ]);

        setTemplateOptions(
          templates.map((template) => ({
            value: template.id,
            label: template.templateName,
          }))
        );
        setAssetOptions(
          assets.map((asset) => ({
            value: asset.id,
            label: asset.name,
          }))
        );
      } catch (error) {
        console.error("Failed to load classification task options", error);
        messageApi.error("任务配置项加载失败，请刷新后重试");
      }
    };

    void loadOptions();
  }, [messageApi]);

  const closeTaskModal = () => {
    setModalOpen(false);
    setSubmitting(false);
    setEditingTask(null);
    form.resetFields();
  };

  const openCreateModal = () => {
    setModalMode("create");
    setEditingTask(null);
    setModalOpen(true);
    form.setFieldsValue({
      taskName: "",
      dataType: "database",
      scheduleMode: "auto_after_import",
      dataAssetIds: [],
      templateId: undefined,
      executeAt: undefined,
    });
  };

  const openEditModal = (record: ClassificationTaskRecord) => {
    setModalMode("edit");
    setEditingTask(record);
    setModalOpen(true);
    form.setFieldsValue({
      taskName: record.taskName,
      dataType: record.dataType,
      scheduleMode: record.scheduleMode,
      dataAssetIds: record.dataAssetIds,
      templateId: record.templateId,
      executeAt: record.executeAt
        ? parseBeijingDateTime(record.executeAt) ?? undefined
        : undefined,
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload: ClassificationTaskFormValues = {
        taskName: values.taskName,
        dataType: values.dataType,
        scheduleMode: values.scheduleMode,
        dataAssetIds: values.dataAssetIds,
        templateId: values.templateId,
        executeAt: values.executeAt?.format("YYYY-MM-DD HH:mm:ss"),
      };

      setSubmitting(true);

      if (modalMode === "edit" && editingTask) {
        await updateClassificationTask(editingTask.id, payload);
        messageApi.success("分类分级任务已更新");
      } else {
        await createClassificationTask(payload, {
          taskSource: "classification-center",
          sourceLabel: "任务中心",
          creator: "当前用户",
        });
        messageApi.success("分类分级任务已创建");
      }

      closeTaskModal();
      actionRef.current?.reload();
    } catch (error) {
      if (error instanceof Error && error.message) {
        console.error(error);
      }
      if (!submitting) {
        messageApi.error("请先完善任务信息");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ProColumns<ClassificationTaskRecord>[] = [
    {
      title: "任务名称",
      dataIndex: "taskName",
      valueType: "text",
      align: "center",
    },
    {
      title: "数据类型",
      dataIndex: "dataType",
      valueType: "select",
      valueEnum: {
        database: { text: "数据库" },
        file: { text: "文件" },
        api: { text: "API" },
      },
      align: "center",
    },
    {
      title: "数据资产",
      dataIndex: "dataAssetNames",
      search: false,
      align: "center",
      width: 320,
      render: (_, record) => renderAssetTags(record.dataAssetNames),
    },
    {
      title: "关联模板",
      dataIndex: "templateId",
      valueType: "select",
      align: "center",
      fieldProps: {
        options: templateOptions,
      },
      render: (_, record) => record.templateName || "-",
    },
    {
      title: "执行策略",
      dataIndex: "scheduleMode",
      valueType: "select",
      align: "center",
      valueEnum: {
        auto_after_import: { text: "导入完成后自动执行" },
        single: { text: "单次执行" },
      },
      render: (_, record) => SCHEDULE_MODE_LABEL_MAP[record.scheduleMode],
    },
    {
      title: "任务执行时间",
      dataIndex: "executeAt",
      search: false,
      align: "center",
      render: (_, record) => record.executeAt || "-",
    },
    {
      title: "状态",
      dataIndex: "status",
      valueType: "select",
      valueEnum: {
        waiting_import: { text: "等待导入" },
        pending: { text: "待执行" },
        running: { text: "执行中" },
        completed: { text: "已完成" },
        failed: { text: "执行失败" },
        stopped: { text: "已停止" },
      },
      render: (_, record) => (
        <Badge
          status={STATUS_BADGE_MAP[record.status] as never}
          text={STATUS_TEXT_MAP[record.status]}
        />
      ),
      align: "center",
    },
    {
      title: "进展",
      dataIndex: "progress",
      search: false,
      align: "center",
      render: (_, record) => (
        <div style={{ minWidth: 140 }}>
          <Progress percent={record.progress} size="small" />
        </div>
      ),
    },
    {
      title: "创建人",
      dataIndex: "creator",
      valueType: "text",
      align: "center",
      search: false,
    },
    {
      title: "创建时间",
      dataIndex: "createTime",
      valueType: "dateTime",
      align: "center",
      search: false,
    },
    {
      title: "操作",
      dataIndex: "option",
      valueType: "option",
      width: 160,
      fixed: "right",
      render: (_, record) => [
        <Button
          key="detail"
          type="link"
          size="small"
          style={{ padding: 0 }}
          onClick={() => setDetailTask(record)}
        >
          查看详情
        </Button>,
        <Button
          key="edit"
          type="link"
          size="small"
          style={{ padding: 0 }}
          onClick={() => openEditModal(record)}
        >
          编辑
        </Button>,
        <Button
          key="delete"
          danger
          type="link"
          size="small"
          style={{ padding: 0 }}
          onClick={() => {
            Modal.confirm({
              title: "确认删除分类分级任务",
              content:
                "删除后将移除该分类分级任务本身，但不会删除已经导入的数据资产。",
              okText: "确认删除",
              cancelText: "取消",
              okButtonProps: { danger: true },
              onOk: async () => {
                await deleteClassificationTask(record.id);
                if (detailTask?.id === record.id) {
                  setDetailTask(null);
                }
                if (editingTask?.id === record.id) {
                  closeTaskModal();
                }
                messageApi.success("分类分级任务已删除");
                actionRef.current?.reload();
              },
            });
          }}
        >
          删除
        </Button>,
      ],
      align: "center",
    },
  ];

  return (
    <PageContainer className="nothingPage" title="Classification Tasks" subTitle="统一管理分类任务创建、模板绑定、执行计划与任务进度。">
      {contextHolder}
      <ProTable<ClassificationTaskRecord>
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 110,
          defaultCollapsed: true,
        }}
        toolBarRender={() => [
          <Button key="addTask" type="primary" onClick={openCreateModal}>
            新增任务
          </Button>,
        ]}
        request={async (params) => {
          const { taskName, dataType, templateId, status } = params;
          let data = await listClassificationTasks();

          if (taskName) {
            data = data.filter((item) =>
              item.taskName.includes(String(taskName))
            );
          }
          if (dataType) {
            data = data.filter((item) => item.dataType === dataType);
          }
          if (templateId) {
            data = data.filter((item) => item.templateId === templateId);
          }
          if (status) {
            data = data.filter((item) => item.status === status);
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
        title={modalMode === "edit" ? "编辑分类分级任务" : "新增分类分级任务"}
        open={modalOpen}
        onOk={handleSubmit}
        confirmLoading={submitting}
        onCancel={closeTaskModal}
        destroyOnClose
      >
        <Form<TaskModalFormValues> form={form} layout="vertical">
          <Form.Item
            label="任务名称"
            name="taskName"
            rules={[{ required: true, message: "请输入任务名称" }]}
          >
            <Input placeholder="请输入任务名称" />
          </Form.Item>
          <Form.Item
            label="数据类型"
            name="dataType"
            rules={[{ required: true, message: "请选择数据类型" }]}
          >
            <Select options={DATA_TYPE_OPTIONS.map((item) => ({ ...item }))} />
          </Form.Item>
          <Form.Item
            label="执行策略"
            name="scheduleMode"
            rules={[{ required: true, message: "请选择执行策略" }]}
          >
            <Select
              options={SCHEDULE_MODE_OPTIONS.map((item) => ({ ...item }))}
            />
          </Form.Item>
          <Form.Item
            label="数据资产"
            name="dataAssetIds"
            rules={[
              {
                required: true,
                type: "array",
                min: 1,
                message: "请选择数据资产",
              },
            ]}
          >
            <Select
              mode="multiple"
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="请选择一个或多个数据资产"
              options={assetOptions}
            />
          </Form.Item>
          <Form.Item
            label="关联模板"
            name="templateId"
            rules={[{ required: true, message: "请选择关联模板" }]}
          >
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="请选择分类分级模板"
              options={templateOptions}
            />
          </Form.Item>
          {scheduleMode === "single" && (
          <Form.Item
            label="任务执行时间"
            name="executeAt"
            rules={[{ required: true, message: "请选择任务执行时间" }]}
          >
            <DatePicker
              showTime
              style={{ width: "100%" }}
              format="YYYY-MM-DD HH:mm:ss"
              placeholder="请选择任务执行时间"
            />
          </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title="任务详情"
        open={Boolean(detailTask)}
        footer={[
          <Button key="close" onClick={() => setDetailTask(null)}>
            关闭
          </Button>,
        ]}
        onCancel={() => setDetailTask(null)}
        width={760}
      >
        {detailTask ? (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="任务名称">
              {detailTask.taskName}
            </Descriptions.Item>
            <Descriptions.Item label="数据类型">
              {DATA_TYPE_OPTIONS.find(
                (item) => item.value === detailTask.dataType
              )?.label || detailTask.dataType}
            </Descriptions.Item>
            <Descriptions.Item label="数据资产" span={2}>
              {renderAssetTags(detailTask.dataAssetNames)}
            </Descriptions.Item>
            <Descriptions.Item label="关联模板">
              {detailTask.templateName || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="执行策略">
              {SCHEDULE_MODE_LABEL_MAP[detailTask.scheduleMode]}
            </Descriptions.Item>
            <Descriptions.Item label="任务执行时间">
              {detailTask.executeAt || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Badge
                status={STATUS_BADGE_MAP[detailTask.status] as never}
                text={STATUS_TEXT_MAP[detailTask.status]}
              />
            </Descriptions.Item>
            <Descriptions.Item label="进展">
              <Progress percent={detailTask.progress} size="small" />
            </Descriptions.Item>
            <Descriptions.Item label="创建人">
              {detailTask.creator}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {detailTask.createTime}
            </Descriptions.Item>
            <Descriptions.Item label="任务来源">
              {detailTask.sourceLabel}
            </Descriptions.Item>
            <Descriptions.Item label="来源说明">
              <Typography.Text type="secondary">
                {detailTask.taskSource === "asset-import"
                  ? "由导入流程自动创建"
                  : "由任务中心手工创建"}
              </Typography.Text>
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </Modal>
    </PageContainer>
  );
};

export default ClassificationTasks;
