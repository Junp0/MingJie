import {
  deleteImportTask,
  getImportTaskById,
  updateImportTaskStatus,
  type DataAssetImportRecord,
  type ImportedColumnRecord,
  type ImportedTableRecord,
} from "@/services/data-assets/importTaskStore";
import {
  getClassificationTaskById,
  type ClassificationTaskRecord,
} from "@/services/data-classification/classificationTaskStore";
import { ArrowLeftOutlined, DatabaseOutlined, EditOutlined, LinkOutlined } from "@ant-design/icons";
import { PageContainer } from "@ant-design/pro-components";
import { useNavigate, useParams } from "@umijs/max";
import {
  Button,
  Card,
  Collapse,
  Descriptions,
  Empty,
  Modal,
  Progress,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import React, { useEffect, useMemo, useState } from "react";

const { Paragraph, Text } = Typography;

const renderDeletedLabel = (
  value: string,
  deleted: boolean,
  deletedAt?: string
) => (
  <Space size={8} wrap>
    <Text delete={deleted} type={deleted ? "secondary" : undefined}>
      {value}
    </Text>
    {deleted ? (
      <Tag color="red">{deletedAt ? `已删除 ${deletedAt}` : "已删除"}</Tag>
    ) : null}
  </Space>
);

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
  const [hideDeletedObjects, setHideDeletedObjects] = useState(true);

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

  const tableColumns = [
    {
      title: "数据表",
      dataIndex: "tableName",
      key: "tableName",
      render: (_: string, record: ImportedTableRecord) =>
        renderDeletedLabel(record.tableName, record.isDeleted, record.deletedAt),
    },
    {
      title: "表注释",
      dataIndex: "tableComment",
      key: "tableComment",
      render: (value: string, record: ImportedTableRecord) => (
        <Text delete={record.isDeleted} type={record.isDeleted ? "secondary" : undefined}>
          {value || "-"}
        </Text>
      ),
    },
    {
      title: "字段数",
      key: "columnCount",
      width: 100,
      align: "center" as const,
      render: (_: unknown, record: ImportedTableRecord) => record.columns.length,
    },
    {
      title: "记录数",
      dataIndex: "rowCount",
      key: "rowCount",
      width: 120,
      align: "center" as const,
      render: (value: number) => value.toLocaleString(),
    },
    {
      title: "状态",
      key: "status",
      width: 120,
      align: "center" as const,
      render: (_: unknown, record: ImportedTableRecord) => (
        <Tag color={record.isDeleted ? "red" : "green"}>
          {record.isDeleted ? "已删除" : "正常"}
        </Tag>
      ),
    },
  ];

  const columnColumns = [
    {
      title: "字段名",
      dataIndex: "columnName",
      key: "columnName",
      render: (_: string, record: ImportedColumnRecord) =>
        renderDeletedLabel(record.columnName, record.isDeleted, record.deletedAt),
    },
    {
      title: "字段注释",
      dataIndex: "columnComment",
      key: "columnComment",
      render: (value: string, record: ImportedColumnRecord) => (
        <Text delete={record.isDeleted} type={record.isDeleted ? "secondary" : undefined}>
          {value || "-"}
        </Text>
      ),
    },
    {
      title: "字段类型",
      dataIndex: "columnType",
      key: "columnType",
      width: 180,
      align: "center" as const,
      render: (value: string, record: ImportedColumnRecord) => (
        <Text delete={record.isDeleted} type={record.isDeleted ? "secondary" : undefined}>
          {value}
        </Text>
      ),
    },
    {
      title: "分类结果",
      dataIndex: "dataCategory",
      key: "dataCategory",
      width: 160,
      align: "center" as const,
      render: (value: string, record: ImportedColumnRecord) => (
        <Text delete={record.isDeleted} type={record.isDeleted ? "secondary" : undefined}>
          {value || "未分类"}
        </Text>
      ),
    },
    {
      title: "数据分级",
      dataIndex: "dataLevel",
      key: "dataLevel",
      width: 140,
      align: "center" as const,
      render: (value: string | undefined, record: ImportedColumnRecord) => (
        <Text delete={record.isDeleted} type={record.isDeleted ? "secondary" : undefined}>
          {value || "-"}
        </Text>
      ),
    },
    {
      title: "状态",
      key: "status",
      width: 120,
      align: "center" as const,
      render: (_: unknown, record: ImportedColumnRecord) => (
        <Tag color={record.isDeleted ? "red" : "green"}>
          {record.isDeleted ? "已删除" : "正常"}
        </Tag>
      ),
    },
  ];

  const allSchemaTables = useMemo(() => {
    if (!importTask) return [];
    return importTask.schemaTables;
  }, [importTask]);

  const visibleSchemaTables = useMemo(
    () =>
      hideDeletedObjects
        ? allSchemaTables
            .filter((table) => !table.isDeleted)
            .map((table) => ({
              ...table,
              columns: table.columns.filter((column) => !column.isDeleted),
            }))
        : allSchemaTables,
    [hideDeletedObjects, allSchemaTables]
  );

  const groupedByDatabase = useMemo(() => {
    const map = new Map<string, typeof visibleSchemaTables>();
    for (const table of visibleSchemaTables) {
      const key = table.databaseName || "未知库";
      const group = map.get(key) ?? [];
      group.push(table);
      map.set(key, group);
    }
    return Array.from(map.entries()).map(([databaseName, tables]) => ({
      databaseName,
      tables,
    }));
  }, [visibleSchemaTables]);

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
        <Button
          key="edit"
          icon={<EditOutlined />}
          onClick={() => navigate(`/data-assets/data-import-form/${importTask.id}`)}
        >
          编辑
        </Button>,
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
              {renderDeletedLabel(
                importTask.assetName || importTask.sourceName,
                importTask.assetDeleted,
                importTask.assetDeletedAt
              )}
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
                {linkedClassificationTask.status === "waiting_import"
                  ? "等待导入"
                  : linkedClassificationTask.status === "pending"
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

        <Card
          title="当前库表结构"
          size="small"
          extra={
            <Space wrap>
              <Space size={8}>
                <Text type="secondary">隐藏已删除</Text>
                <Switch
                  checked={hideDeletedObjects}
                  onChange={setHideDeletedObjects}
                />
              </Space>
              {importTask.assetDeleted ? (
                <Tag color="red">该数据库在最近一次导入中已标记删除</Tag>
              ) : null}
            </Space>
          }
        >
          {groupedByDatabase.length ? (
            <Collapse
              defaultActiveKey={groupedByDatabase.map((g) => g.databaseName)}
              items={groupedByDatabase.map((group) => ({
                key: group.databaseName,
                label: (
                  <Space>
                    <DatabaseOutlined />
                    <Text strong>{group.databaseName}</Text>
                    <Tag>{group.tables.length} 张表</Tag>
                  </Space>
                ),
                children: (
                  <Table
                    columns={tableColumns}
                    dataSource={group.tables}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    bordered
                    expandable={{
                      expandedRowRender: (tableRecord: ImportedTableRecord) => (
                        <Table
                          columns={columnColumns}
                          dataSource={tableRecord.columns}
                          rowKey="id"
                          pagination={false}
                          size="small"
                          bordered
                        />
                      ),
                      rowExpandable: (tableRecord: ImportedTableRecord) =>
                        tableRecord.columns.length > 0,
                    }}
                  />
                ),
              }))}
            />
          ) : (
            <Empty
              description="当前暂无可展示的表结构"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
          <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
            已存在的表和字段会保留原有分类分级结果；仅新增字段保持初始未分类状态；
            本次导入缺失的库表字段会保留历史记录并以删除线展示。
          </Paragraph>
        </Card>
      </Space>
    </PageContainer>
  );
};

export default ImportDetail;
