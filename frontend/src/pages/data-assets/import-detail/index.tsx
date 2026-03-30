import {
  deleteImportTask,
  getImportTaskById,
  updateImportTaskStatus,
  type DataAssetImportRecord,
} from "@/services/data-assets/importTaskStore";
import {
  getClassificationTaskById,
  type ClassificationTaskRecord,
} from "@/services/data-classification/classificationTaskStore";
import { ArrowLeftOutlined, LinkOutlined } from "@ant-design/icons";
import { PageContainer } from "@ant-design/pro-components";
import { useNavigate, useParams } from "@umijs/max";
import {
  Button,
  Card,
  Descriptions,
  Empty,
  Modal,
  Progress,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import React, { useEffect, useMemo, useState } from "react";

const { Paragraph, Text } = Typography;

const ImportDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [messageApi, contextHolder] = message.useMessage();
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [importTask, setImportTask] = useState<DataAssetImportRecord | null>(
    null
  );
  const [linkedClassificationTask, setLinkedClassificationTask] =
    useState<ClassificationTaskRecord | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadTaskDetail = async () => {
      if (!id) {
        setImportTask(null);
        setLinkedClassificationTask(null);
        return;
      }

      const nextImportTask = await getImportTaskById(id);
      if (cancelled) {
        return;
      }

      setImportTask(nextImportTask);

      if (!nextImportTask?.classificationTaskId) {
        setLinkedClassificationTask(null);
        return;
      }

      const nextClassificationTask = await getClassificationTaskById(
        nextImportTask.classificationTaskId
      );
      if (!cancelled) {
        setLinkedClassificationTask(nextClassificationTask);
      }
    };

    void loadTaskDetail();

    return () => {
      cancelled = true;
    };
  }, [id, refreshSeed]);

  const importTaskData = useMemo(() => {
    if (!importTask) {
      return [];
    }

    return [
      {
        id: `${importTask.id}-1`,
        sequence: 1,
        databaseName: importTask.databaseName,
        importProgress: importTask.progress,
        importStatus: importTask.status,
        importCompleteTime:
          importTask.status === "completed"
            ? importTask.endTime || importTask.updateTime
            : "-",
        totalTables: importTask.importedTableCount,
        importedRecords: importTask.importedRecordCount,
      },
    ];
  }, [importTask]);

  const importTaskColumns = [
    {
      title: "序号",
      dataIndex: "sequence",
      key: "sequence",
      width: 80,
      align: "center" as const,
    },
    {
      title: "数据资产名称",
      dataIndex: "databaseName",
      key: "databaseName",
      align: "center" as const,
    },
    {
      title: "导入进度",
      dataIndex: "importProgress",
      key: "importProgress",
      width: 160,
      render: (progress: number, record: { importStatus: string }) => (
        <Progress
          percent={progress}
          size="small"
          status={record.importStatus === "failed" ? "exception" : undefined}
        />
      ),
      align: "center" as const,
    },
    {
      title: "导入状态",
      dataIndex: "importStatus",
      key: "importStatus",
      width: 100,
      render: (status: string) => {
        const statusMap = {
          pending: { color: "default", text: "等待中" },
          running: { color: "blue", text: "运行中" },
          completed: { color: "green", text: "已完成" },
          failed: { color: "red", text: "失败" },
          stopped: { color: "orange", text: "已停止" },
        };
        const statusInfo = statusMap[status as keyof typeof statusMap];
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      },
      align: "center" as const,
    },
    {
      title: "导入完成时间",
      dataIndex: "importCompleteTime",
      key: "importCompleteTime",
      width: 180,
      align: "center" as const,
    },
    {
      title: "总表数",
      dataIndex: "totalTables",
      key: "totalTables",
      width: 100,
      align: "center" as const,
    },
    {
      title: "已导入记录",
      dataIndex: "importedRecords",
      key: "importedRecords",
      width: 140,
      render: (count: number) => count.toLocaleString(),
      align: "center" as const,
    },
  ];

  if (!importTask) {
    return (
      <PageContainer
        title="导入任务详情"
        onBack={() => navigate("/data-assets/data-import")}
        backIcon={<ArrowLeftOutlined />}
      >
        <Card>
          <Empty
            description="未找到导入任务"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="导入任务详情"
      onBack={() => navigate("/data-assets/data-import")}
      backIcon={<ArrowLeftOutlined />}
      extra={[
        importTask.status === "pending" || importTask.status === "stopped" ? (
          <Button
            key="start"
            type="primary"
            onClick={async () => {
              const updated = await updateImportTaskStatus(
                importTask.id,
                "running"
              );
              setRefreshSeed((current) => current + 1);
              if (updated?.status === "completed") {
                messageApi.success(
                  updated.classificationTriggeredAt
                    ? "导入已完成，并已触发关联分类分级任务"
                    : "导入任务已完成"
                );
              } else {
                messageApi.success("导入任务已启动");
              }
            }}
          >
            启动导入
          </Button>
        ) : null,
        importTask.status === "running" ? (
          <Button
            key="complete"
            type="primary"
            onClick={async () => {
              const updated = await updateImportTaskStatus(
                importTask.id,
                "completed"
              );
              setRefreshSeed((current) => current + 1);
              if (updated?.classificationTriggeredAt) {
                messageApi.success("导入已完成，并已触发关联分类分级任务");
              } else {
                messageApi.success("导入任务已完成");
              }
            }}
          >
            完成导入
          </Button>
        ) : null,
        importTask.status === "running" ? (
          <Button
            key="stop"
            onClick={async () => {
              await updateImportTaskStatus(importTask.id, "stopped");
              setRefreshSeed((current) => current + 1);
              messageApi.success("导入任务已停止");
            }}
          >
            停止导入
          </Button>
        ) : null,
        <Button
          key="delete"
          danger
          onClick={() => {
            Modal.confirm({
              title: "确认删除导入任务",
              content:
                "删除导入任务会自动删除对应数据资产，并解除或清理关联的分类分级任务关系；如果该分类任务仅由本次导入创建且不再关联其他资产，也会一并删除。",
              okText: "确认删除",
              cancelText: "取消",
              okButtonProps: { danger: true },
              onOk: async () => {
                await deleteImportTask(importTask.id);
                messageApi.success("导入任务已删除，关联数据已按提示执行清理");
                navigate("/data-assets/data-import");
              },
            });
          }}
        >
          删除导入任务
        </Button>,
      ].filter(Boolean)}
    >
      {contextHolder}
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Card title="基础详情" size="small">
          <Descriptions column={3} bordered>
            <Descriptions.Item label="创建人">
              {importTask.creator}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {importTask.createTime}
            </Descriptions.Item>
            <Descriptions.Item label="最近修改时间">
              {importTask.updateTime}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="数据资产详情" size="small">
          <Descriptions column={2} bordered>
            <Descriptions.Item label="数据资产名称">
              {importTask.sourceName}
            </Descriptions.Item>
            <Descriptions.Item label="接入类型">
              <Tag color="blue">{importTask.databaseType}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="接入地址">
              {importTask.ipAddress}
            </Descriptions.Item>
            <Descriptions.Item label="端口号">
              {importTask.port}
            </Descriptions.Item>
            <Descriptions.Item label="访问账号">
              {importTask.username}
            </Descriptions.Item>
            <Descriptions.Item label="资产分组">
              {importTask.assetGroupName}
            </Descriptions.Item>
            <Descriptions.Item label="任务状态">
              <Tag
                color={
                  importTask.status === "running"
                    ? "blue"
                    : importTask.status === "completed"
                    ? "green"
                    : "default"
                }
              >
                {importTask.status === "running"
                  ? "运行中"
                  : importTask.status === "completed"
                  ? "已完成"
                  : importTask.status === "failed"
                  ? "失败"
                  : importTask.status === "stopped"
                  ? "已停止"
                  : "等待中"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="整体进度">
              <Progress percent={importTask.progress} size="small" />
            </Descriptions.Item>
            <Descriptions.Item label="同步策略">
              {importTask.scheduleLabel}
            </Descriptions.Item>
            {importTask.executeAt ? (
              <Descriptions.Item label="执行时间">
                {importTask.executeAt}
              </Descriptions.Item>
            ) : null}
            <Descriptions.Item label="任务描述" span={2}>
              {importTask.description}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card
          title="关联分类分级任务"
          size="small"
          extra={
            linkedClassificationTask ? (
              <Tag icon={<LinkOutlined />} color="processing">
                已关联
              </Tag>
            ) : (
              <Tag>未关联</Tag>
            )
          }
        >
          {linkedClassificationTask ? (
            <Descriptions column={2} bordered>
              <Descriptions.Item label="任务名称">
                {linkedClassificationTask.taskName}
              </Descriptions.Item>
              <Descriptions.Item label="任务来源">
                {linkedClassificationTask.sourceLabel}
              </Descriptions.Item>
              <Descriptions.Item label="数据类型">
                {linkedClassificationTask.dataType === "database"
                  ? "数据库"
                  : linkedClassificationTask.dataType === "file"
                  ? "文件"
                  : "API"}
              </Descriptions.Item>
              <Descriptions.Item label="任务执行时间">
                {linkedClassificationTask.executeAt || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="数据资产" span={2}>
                {linkedClassificationTask.dataAssetNames.length
                  ? linkedClassificationTask.dataAssetNames.join("、")
                  : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="关联模板">
                {linkedClassificationTask.templateName || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="任务状态">
                {linkedClassificationTask.status === "pending"
                  ? "待执行"
                  : linkedClassificationTask.status === "running"
                  ? "执行中"
                  : linkedClassificationTask.status === "completed"
                  ? "已完成"
                  : linkedClassificationTask.status === "failed"
                  ? "执行失败"
                  : "已停止"}
              </Descriptions.Item>
              <Descriptions.Item label="任务描述" span={2}>
                {linkedClassificationTask.description}
              </Descriptions.Item>
            </Descriptions>
          ) : (
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              当前导入任务未同步创建分类分级任务。后续仍可在“数据分类分级 /
              分类分级任务”中单独创建。
            </Paragraph>
          )}
        </Card>

        <Card title="导入执行情况" size="small">
          <Table
            columns={importTaskColumns}
            dataSource={importTaskData}
            rowKey="id"
            pagination={false}
            size="small"
            bordered
          />
        </Card>
      </Space>
    </PageContainer>
  );
};

export default ImportDetail;
