import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Badge, Button, Drawer, Table, Tag, message } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import {
  listMissedDataItems,
  type MissedDataItem,
} from '@/services/data-overview/overviewStore';

interface SampleDataItem {
  id: number;
  sampleData: string;
  updateTime: string;
}

const MissedDataList: React.FC = () => {
  const actionRef = useRef<ActionType | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [rows, setRows] = useState<MissedDataItem[]>([]);
  const [sampleDrawerVisible, setSampleDrawerVisible] = useState(false);
  const [currentSampleData, setCurrentSampleData] = useState<SampleDataItem[]>([]);
  const [currentFieldName, setCurrentFieldName] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadRows = async () => {
      const data = await listMissedDataItems();
      if (!cancelled) {
        setRows(data);
      }
    };

    void loadRows();

    return () => {
      cancelled = true;
    };
  }, []);

  const sampleColumns = [
    { title: '序号', dataIndex: 'id', key: 'id', width: 80 },
    { title: '样本数据', dataIndex: 'sampleData', key: 'sampleData' },
    { title: '更新时间', dataIndex: 'updateTime', key: 'updateTime', width: 180 },
  ];

  const showSampleData = (record: MissedDataItem) => {
    setCurrentSampleData(
      record.sampleData.map((sampleData, index) => ({
        id: index + 1,
        sampleData,
        updateTime: record.updateTime,
      })),
    );
    setCurrentFieldName(record.fieldName);
    setSampleDrawerVisible(true);
  };

  const columns: ProColumns<MissedDataItem>[] = [
    { title: 'ID', dataIndex: 'id', width: 80, search: false, align: 'center' },
    { title: '字段名称', dataIndex: 'fieldName', valueType: 'text', align: 'center' },
    { title: '字段注释', dataIndex: 'fieldComment', valueType: 'text', align: 'center' },
    { title: '字段库表', dataIndex: 'fieldTable', valueType: 'text', align: 'center' },
    { title: '数据类型', dataIndex: 'dataType', valueType: 'text', align: 'center' },
    { title: '所属分组', dataIndex: 'groupName', valueType: 'text', align: 'center' },
    {
      title: '缺失次数',
      dataIndex: 'missCount',
      valueType: 'digit',
      align: 'center',
    },
    {
      title: '缺失率',
      dataIndex: 'missRate',
      valueType: 'digit',
      align: 'center',
      render: (_, record) => `${record.missRate}%`,
    },
    {
      title: '来源',
      dataIndex: 'source',
      valueType: 'text',
      align: 'center',
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      align: 'center',
      render: (_, record) => {
        const colorMap = {
          high: 'red',
          medium: 'orange',
          low: 'blue',
        } as const;
        return <Tag color={colorMap[record.priority]}>{record.priority}</Tag>;
      },
    },
    {
      title: '风险状态',
      dataIndex: 'status',
      align: 'center',
      render: (_, record) => {
        const statusMap = {
          high: { status: 'error', text: '高' },
          medium: { status: 'warning', text: '中' },
          low: { status: 'success', text: '低' },
        } as const;
        const status = statusMap[record.status];
        return <Badge status={status.status as never} text={status.text} />;
      },
    },
    {
      title: '样本',
      dataIndex: 'sample',
      search: false,
      align: 'center',
      render: (_, record) => (
        <Button type="link" onClick={() => showSampleData(record)}>
          查看样本
        </Button>
      ),
    },
    {
      title: '最新检测时间',
      dataIndex: 'lastCheckTime',
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
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            type="link"
            size="small"
            style={{ padding: 0, margin: 0 }}
            onClick={() => messageApi.info(`刷新: ${record.key}`)}
          >
            刷新
          </Button>
          <Button
            type="link"
            size="small"
            style={{ padding: 0, margin: 0 }}
            onClick={() => messageApi.info(`优化规则: ${record.key}`)}
          >
            优化规则
          </Button>
        </div>
      ),
      align: 'center',
    },
  ];

  return (
    <PageContainer>
      {contextHolder}
      <ProTable<MissedDataItem>
        actionRef={actionRef}
        rowKey="id"
        search={{ labelWidth: 120 }}
        toolBarRender={() => [
          <Button key="batchRefresh" type="primary" onClick={() => messageApi.info('批量刷新功能待接入')}>
            批量刷新
          </Button>,
          <Button key="export" onClick={() => messageApi.info('导出清单功能待接入')}>
            导出清单
          </Button>,
        ]}
        request={async (params) => {
          const {
            fieldName,
            fieldComment,
            fieldTable,
            dataType,
            groupName,
            status,
            priority,
            source,
          } = params as Record<string, any>;

          let filteredData = rows;
          if (fieldName) filteredData = filteredData.filter((item) => item.fieldName.includes(String(fieldName)));
          if (fieldComment) filteredData = filteredData.filter((item) => item.fieldComment.includes(String(fieldComment)));
          if (fieldTable) filteredData = filteredData.filter((item) => item.fieldTable.includes(String(fieldTable)));
          if (dataType) filteredData = filteredData.filter((item) => item.dataType === dataType);
          if (groupName) filteredData = filteredData.filter((item) => item.groupName === groupName);
          if (status) filteredData = filteredData.filter((item) => item.status === status);
          if (priority) filteredData = filteredData.filter((item) => item.priority === priority);
          if (source) filteredData = filteredData.filter((item) => item.source === source);

          return {
            data: filteredData,
            success: true,
            total: filteredData.length,
          };
        }}
        columns={columns}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
        }}
      />

      <Drawer
        title={`${currentFieldName} - 样本数据`}
        placement="right"
        width={600}
        onClose={() => setSampleDrawerVisible(false)}
        open={sampleDrawerVisible}
      >
        <Table columns={sampleColumns} dataSource={currentSampleData} pagination={false} size="small" />
      </Drawer>
    </PageContainer>
  );
};

export default MissedDataList;
