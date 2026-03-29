import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, Drawer, Table, Tag, message } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import {
  listFullDataItems,
  type FullDataItem,
} from '@/services/data-overview/overviewStore';

interface SampleDataItem {
  id: number;
  sampleData: string;
  updateTime: string;
}

const FullDataList: React.FC = () => {
  const actionRef = useRef<ActionType | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [rows, setRows] = useState<FullDataItem[]>([]);
  const [sampleDrawerVisible, setSampleDrawerVisible] = useState(false);
  const [currentSampleData, setCurrentSampleData] = useState<SampleDataItem[]>([]);
  const [currentFieldName, setCurrentFieldName] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadRows = async () => {
      const data = await listFullDataItems();
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
    {
      title: '序号',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      align: 'center' as const,
    },
    {
      title: '样本数据',
      dataIndex: 'sampleData',
      key: 'sampleData',
      align: 'center' as const,
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      key: 'updateTime',
      width: 180,
      align: 'center' as const,
    },
  ];

  const showSampleData = (record: FullDataItem) => {
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

  const columns: ProColumns<FullDataItem>[] = [
    { title: 'ID', dataIndex: 'id', width: 80, search: false, align: 'center' },
    { title: '字段名称', dataIndex: 'fieldName', align: 'center', valueType: 'text' },
    { title: '字段注释', dataIndex: 'fieldComment', align: 'center', valueType: 'text' },
    { title: '字段库表', dataIndex: 'fieldTable', align: 'center', valueType: 'text' },
    { title: '数据类型', dataIndex: 'dataType', align: 'center', valueType: 'text' },
    { title: '数据分类', dataIndex: 'dataCategory', align: 'center', valueType: 'text' },
    {
      title: '数据分级',
      dataIndex: 'dataLevel',
      align: 'center',
      render: (_, record) => {
        const levelMap = {
          public: { color: 'green', text: '公开' },
          internal: { color: 'orange', text: '内部' },
          confidential: { color: 'red', text: '机密' },
          secret: { color: 'volcano', text: '绝密' },
        };
        const level = levelMap[record.dataLevel];
        return <Tag color={level.color}>{level.text}</Tag>;
      },
    },
    {
      title: '是否敏感',
      dataIndex: 'isSensitive',
      align: 'center',
      render: (_, record) => <Tag color={record.isSensitive ? 'red' : 'green'}>{record.isSensitive ? '是' : '否'}</Tag>,
    },
    { title: '所属分组', dataIndex: 'groupName', align: 'center', valueType: 'text' },
    {
      title: '是否脱敏',
      dataIndex: 'isDesensitized',
      align: 'center',
      render: (_, record) => <Tag color={record.isDesensitized ? 'green' : 'default'}>{record.isDesensitized ? '是' : '否'}</Tag>,
    },
    {
      title: '是否加密',
      dataIndex: 'isEncrypted',
      align: 'center',
      render: (_, record) => <Tag color={record.isEncrypted ? 'green' : 'default'}>{record.isEncrypted ? '是' : '否'}</Tag>,
    },
    {
      title: '样本',
      dataIndex: 'sample',
      align: 'center',
      search: false,
      render: (_, record) => (
        <Button type="link" onClick={() => showSampleData(record)}>
          查看样本
        </Button>
      ),
    },
    { title: '更新时间', dataIndex: 'updateTime', align: 'center', valueType: 'dateTime', search: false },
  ];

  return (
    <PageContainer>
      {contextHolder}
      <ProTable<FullDataItem>
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 120,
          span: {
            xs: 24,
            sm: 12,
            md: 8,
            lg: 8,
            xl: 6,
            xxl: 6,
          },
          defaultCollapsed: true,
        }}
        toolBarRender={() => [
          <Button
            key="export"
            onClick={() => {
              messageApi.info('导出数据功能待接入');
            }}
          >
            导出数据
          </Button>,
        ]}
        request={async (params) => {
          const {
            fieldName,
            fieldComment,
            fieldTable,
            dataType,
            dataCategory,
            dataLevel,
            isSensitive,
            isDesensitized,
            isEncrypted,
            groupName,
          } = params as Record<string, any>;

          let filteredData = rows;
          if (fieldName) filteredData = filteredData.filter((item) => item.fieldName.includes(String(fieldName)));
          if (fieldComment) filteredData = filteredData.filter((item) => item.fieldComment.includes(String(fieldComment)));
          if (fieldTable) filteredData = filteredData.filter((item) => item.fieldTable.includes(String(fieldTable)));
          if (dataType) filteredData = filteredData.filter((item) => item.dataType === dataType);
          if (dataCategory) filteredData = filteredData.filter((item) => item.dataCategory === dataCategory);
          if (dataLevel) filteredData = filteredData.filter((item) => item.dataLevel === dataLevel);
          if (isSensitive !== undefined) filteredData = filteredData.filter((item) => item.isSensitive === (isSensitive === true || isSensitive === 'true'));
          if (isDesensitized !== undefined) filteredData = filteredData.filter((item) => item.isDesensitized === (isDesensitized === true || isDesensitized === 'true'));
          if (isEncrypted !== undefined) filteredData = filteredData.filter((item) => item.isEncrypted === (isEncrypted === true || isEncrypted === 'true'));
          if (groupName) filteredData = filteredData.filter((item) => item.groupName === groupName);

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
        tableStyle={{
          textAlign: 'center',
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

export default FullDataList;
