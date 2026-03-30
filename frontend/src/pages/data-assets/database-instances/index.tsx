import {
  deleteImportTask,
  listImportTasks,
  updateImportTaskStatus,
  type DataAssetImportRecord,
} from "@/services/data-assets/importTaskStore";
import type { ActionType, ProColumns } from "@ant-design/pro-components";
import { PageContainer, ProTable } from "@ant-design/pro-components";
import { useNavigate } from "@umijs/max";
import { Button, Input, Modal, Progress, Tag, message } from "antd";
import React, { useRef, useState } from "react";

const { Search } = Input;

const DataAssetImport: React.FC = () => {
  const actionRef = useRef<ActionType | null>(null);
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [globalSearchValue, setGlobalSearchValue] = useState("");

  const columns: ProColumns<DataAssetImportRecord>[] = [
    {
      title: "数据源类型",
      dataIndex: "sourceType",
      search: false,
      render: (_, record) => {
        const typeMap = {
          database: { text: record.databaseType || "数据库", color: "blue" },
          file: { text: record.databaseType || "文件", color: "green" },
          api: { text: record.databaseType || "API", color: "orange" },
          message_queue: {
            text: record.databaseType || "消息队列",
            color: "purple",
          },
        };
        const type = typeMap[record.sourceType];
        return <Tag color={type.color}>{type.text}</Tag>;
      },
      align: "center",
    },
    {
      title: "数据资产名称",
      dataIndex: "sourceName",
      search: false,
      align: "center",
    },
    {
      title: "接入地址",
      dataIndex: "ipAddress",
      search: false,
      align: "center",
    },
    {
      title: "端口号",
      dataIndex: "port",
      search: false,
      align: "center",
    },
    {
      title: "状态",
      dataIndex: "status",
      search: false,
      render: (_, record) => {
        const statusMap = {
          pending: { color: "default", text: "等待中" },
          running: { color: "blue", text: "运行中" },
          completed: { color: "green", text: "已完成" },
          failed: { color: "red", text: "失败" },
          stopped: { color: "orange", text: "已停止" },
        };
        const status = statusMap[record.status];
        return <Tag color={status.color}>{status.text}</Tag>;
      },
      align: "center",
    },
    {
      title: "进度",
      dataIndex: "progress",
      search: false,
      width: 120,
      render: (_, record) => (
        <Progress
          percent={record.progress}
          size="small"
          status={record.status === "failed" ? "exception" : undefined}
        />
      ),
      align: "center",
    },
    {
      title: "资产分组",
      dataIndex: "assetGroupName",
      search: false,
      align: "center",
      render: (_, record) => record.assetGroupName || "-",
    },
    {
      title: "创建人",
      dataIndex: "creator",
      search: false,
      align: "center",
    },
    {
      title: "分类任务",
      dataIndex: "classificationTaskEnabled",
      search: false,
      align: "center",
      render: (_, record) =>
        record.classificationTaskEnabled ? (
          <Tag color="processing">已关联</Tag>
        ) : (
          <Tag>未关联</Tag>
        ),
    },
    {
      title: "最后同步时间",
      dataIndex: "lastSyncTime",
      search: false,
      align: "center",
      render: (_, record) => record.lastSyncTime || "-",
    },
    {
      title: "操作",
      dataIndex: "option",
      valueType: "option",
      width: 200,
      fixed: "right",
      render: (_, record) => (
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Button
            type="link"
            size="small"
            style={{ padding: 0, margin: 0 }}
            onClick={() => navigate(`/data-assets/import-detail/${record.id}`)}
          >
            查看详情
          </Button>
          {record.status === "pending" || record.status === "stopped" ? (
            <Button
              type="link"
              size="small"
              style={{ padding: 0, margin: 0 }}
              onClick={async () => {
                const updated = await updateImportTaskStatus(record.id, "running");
                messageApi.success(
                  updated?.status === "completed"
                    ? updated.classificationTriggeredAt
                      ? `导入已完成，并已触发关联分类分级任务`
                      : `导入已完成：${record.sourceName}`
                    : `已启动：${record.sourceName}`
                );
                actionRef.current?.reload();
              }}
            >
              启动
            </Button>
          ) : null}
          {record.status === "running" ? (
            <Button
              type="link"
              size="small"
              style={{ padding: 0, margin: 0 }}
              onClick={async () => {
                const updated = await updateImportTaskStatus(
                  record.id,
                  "completed"
                );
                if (updated?.classificationTriggeredAt) {
                  messageApi.success(`导入已完成，并已触发关联分类分级任务`);
                } else {
                  messageApi.success(`导入已完成：${record.sourceName}`);
                }
                actionRef.current?.reload();
              }}
            >
              完成
            </Button>
          ) : null}
          {record.status === "running" ? (
            <Button
              type="link"
              size="small"
              style={{ padding: 0, margin: 0 }}
              onClick={async () => {
                await updateImportTaskStatus(record.id, "stopped");
                messageApi.success(`已停止：${record.sourceName}`);
                actionRef.current?.reload();
              }}
            >
              停止
            </Button>
          ) : null}
          <Button
            danger
            type="link"
            size="small"
            style={{ padding: 0, margin: 0 }}
            onClick={() => {
              Modal.confirm({
                title: "确认删除导入任务",
                content:
                  "删除导入任务会自动删除对应数据资产，并解除或清理关联的分类分级任务关系；如果该分类任务仅由本次导入创建且不再关联其他资产，也会一并删除。",
                okText: "确认删除",
                cancelText: "取消",
                okButtonProps: { danger: true },
                onOk: async () => {
                  await deleteImportTask(record.id);
                  messageApi.success(`已删除导入任务：${record.sourceName}`);
                  actionRef.current?.reload();
                },
              });
            }}
          >
            删除
          </Button>
        </div>
      ),
      align: "center",
    },
  ];

  return (
    <PageContainer>
      {contextHolder}
      <ProTable<DataAssetImportRecord>
        actionRef={actionRef}
        rowKey="id"
        search={false}
        toolBarRender={() => [
          <Search
            key="globalSearch"
            placeholder="请输入关键词搜索数据资产名称、接入地址、资产分组或创建人"
            allowClear
            enterButton
            style={{ width: 420 }}
            onSearch={(value) => {
              setGlobalSearchValue(value);
              actionRef.current?.reload();
            }}
          />,
          <Button
            key="add"
            type="primary"
            onClick={() => navigate("/data-assets/data-import-form")}
          >
            新增任务
          </Button>,
        ]}
        request={async () => {
          let data = await listImportTasks();

          if (globalSearchValue) {
            data = data.filter((item) =>
              [
                item.sourceName,
                item.ipAddress,
                item.creator,
                item.assetGroupName,
                item.description,
              ]
                .join(" ")
                .includes(globalSearchValue)
            );
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
        tableStyle={{
          textAlign: "center",
        }}
      />
    </PageContainer>
  );
};

export default DataAssetImport;
