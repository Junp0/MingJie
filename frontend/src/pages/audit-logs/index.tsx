import {
  listAuditLogs,
  type AuditLogCategory,
  type AuditLogRecord,
  type AuditLogResult,
} from "@/services/audit/auditLogStore";
import { PageContainer, ProTable } from "@ant-design/pro-components";
import { Button, Descriptions, Modal, Space, Tag, Typography } from "antd";
import React, { useState } from "react";

const { Paragraph } = Typography;

const CATEGORY_OPTIONS: Record<
  AuditLogCategory,
  { text: string; color: string }
> = {
  AUTH: { text: "认证登录", color: "blue" },
  ASSET_GROUP: { text: "资产分组", color: "geekblue" },
  IMPORT_TASK: { text: "导入任务", color: "processing" },
  CLASSIFICATION_TASK: { text: "分类分级任务", color: "purple" },
  AUTO_SCAN: { text: "自动扫描", color: "cyan" },
  TEMPLATE: { text: "分类模板", color: "gold" },
  PROTECTION_FEATURE: { text: "保护特征", color: "volcano" },
};

const RESULT_OPTIONS: Record<AuditLogResult, { text: string; color: string }> = {
  SUCCESS: { text: "成功", color: "success" },
  FAILED: { text: "失败", color: "error" },
  RUNNING: { text: "运行中", color: "processing" },
  INFO: { text: "信息", color: "default" },
};

const renderJson = (value?: Record<string, unknown> | null) => {
  if (!value || Object.keys(value).length === 0) {
    return "无";
  }

  return (
    <pre
      style={{
        margin: 0,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {JSON.stringify(value, null, 2)}
    </pre>
  );
};

const AuditLogsPage: React.FC = () => {
  const [detailLog, setDetailLog] = useState<AuditLogRecord | null>(null);

  return (
    <PageContainer title="审计日志">
      <ProTable<AuditLogRecord>
        rowKey="id"
        request={async (params) => {
          const response = await listAuditLogs({
            current: params.current,
            pageSize: params.pageSize,
            category: params.category as AuditLogCategory | undefined,
            result: params.result as AuditLogResult | undefined,
            keyword: params.keyword as string | undefined,
          });

          return {
            data: response.items,
            total: response.total,
            success: true,
          };
        }}
        columns={[
          {
            title: "关键字",
            dataIndex: "keyword",
            hideInTable: true,
          },
          {
            title: "时间",
            dataIndex: "createdAt",
            search: false,
            width: 180,
          },
          {
            title: "类别",
            dataIndex: "category",
            valueType: "select",
            width: 140,
            valueEnum: Object.fromEntries(
              Object.entries(CATEGORY_OPTIONS).map(([key, value]) => [
                key,
                { text: value.text },
              ])
            ),
            render: (_, record) => (
              <Tag color={CATEGORY_OPTIONS[record.category].color}>
                {CATEGORY_OPTIONS[record.category].text}
              </Tag>
            ),
          },
          {
            title: "动作",
            dataIndex: "action",
            search: false,
            width: 180,
          },
          {
            title: "结果",
            dataIndex: "result",
            valueType: "select",
            width: 120,
            valueEnum: Object.fromEntries(
              Object.entries(RESULT_OPTIONS).map(([key, value]) => [
                key,
                { text: value.text },
              ])
            ),
            render: (_, record) => (
              <Tag color={RESULT_OPTIONS[record.result].color}>
                {RESULT_OPTIONS[record.result].text}
              </Tag>
            ),
          },
          {
            title: "操作人",
            dataIndex: "actorName",
            search: false,
            width: 140,
            render: (_, record) => record.actorName || "系统",
          },
          {
            title: "目标对象",
            dataIndex: "targetName",
            search: false,
            ellipsis: true,
            render: (_, record) => record.targetName || "-",
          },
          {
            title: "摘要",
            dataIndex: "detail",
            search: false,
            ellipsis: true,
            render: (_, record) => record.detail || "-",
          },
          {
            title: "操作",
            dataIndex: "option",
            valueType: "option",
            width: 90,
            render: (_, record) => [
              <Button
                key="detail"
                type="link"
                size="small"
                style={{ padding: 0 }}
                onClick={() => setDetailLog(record)}
              >
                查看
              </Button>,
            ],
          },
        ]}
        pagination={{ pageSize: 20, showSizeChanger: true }}
        search={{ labelWidth: 80 }}
        toolBarRender={false}
      />

      <Modal
        title="日志详情"
        open={Boolean(detailLog)}
        footer={null}
        onCancel={() => setDetailLog(null)}
        width={760}
      >
        {detailLog ? (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="时间">
                {detailLog.createdAt}
              </Descriptions.Item>
              <Descriptions.Item label="类别">
                {CATEGORY_OPTIONS[detailLog.category].text}
              </Descriptions.Item>
              <Descriptions.Item label="动作">
                {detailLog.action}
              </Descriptions.Item>
              <Descriptions.Item label="结果">
                {RESULT_OPTIONS[detailLog.result].text}
              </Descriptions.Item>
              <Descriptions.Item label="操作人">
                {detailLog.actorName || "系统"}
              </Descriptions.Item>
              <Descriptions.Item label="目标对象">
                {detailLog.targetName || "-"}
              </Descriptions.Item>
            </Descriptions>

            <div>
              <Paragraph strong style={{ marginBottom: 8 }}>
                摘要
              </Paragraph>
              <Paragraph style={{ marginBottom: 0 }}>
                {detailLog.detail || "无"}
              </Paragraph>
            </div>

            <div>
              <Paragraph strong style={{ marginBottom: 8 }}>
                元数据
              </Paragraph>
              {renderJson(detailLog.metadata)}
            </div>
          </Space>
        ) : null}
      </Modal>
    </PageContainer>
  );
};

export default AuditLogsPage;
