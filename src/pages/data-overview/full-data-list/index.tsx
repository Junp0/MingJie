import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { FormattedMessage, useIntl } from '@umijs/max';
import { Button, message, Tag, Drawer, Table } from 'antd';
import React, { useRef, useState } from 'react';

// 模拟数据接口
interface FullDataItem {
  id: string;
  fieldName: string;
  fieldComment: string;
  fieldTable: string;
  dataType: string;
  dataCategory: string;
  dataLevel: 'public' | 'internal' | 'confidential' | 'secret';
  isSensitive: boolean;
  isDesensitized: boolean;
  isEncrypted: boolean;
  groupName: string;
  sampleData: string[];
  updateTime: string;
  status: 'active' | 'inactive' | 'processing';
}

// 样本数据接口
interface SampleDataItem {
  id: number;
  sampleData: string;
  updateTime: string;
}

const FullDataList: React.FC = () => {
  const actionRef = useRef<ActionType | null>(null);
  const intl = useIntl();
  const [messageApi, contextHolder] = message.useMessage();
  const [sampleDrawerVisible, setSampleDrawerVisible] = useState(false);
  const [currentSampleData, setCurrentSampleData] = useState<SampleDataItem[]>([]);
  const [currentFieldName, setCurrentFieldName] = useState('');

  // 模拟数据
  const mockData: FullDataItem[] = [
    {
      id: '1',
      fieldName: 'user_name',
      fieldComment: '用户姓名',
      fieldTable: 'users',
      dataType: 'VARCHAR(50)',
      dataCategory: '个人信息',
      dataLevel: 'confidential',
      isSensitive: true,
      isDesensitized: true,
      isEncrypted: false,
      groupName: '用户基础信息组',
      sampleData: ['张三', '李四', '王五', '赵六'],
      updateTime: '2024-01-20 14:20:00',
      status: 'active',
    },
    {
      id: '2',
      fieldName: 'phone_number',
      fieldComment: '手机号码',
      fieldTable: 'users',
      dataType: 'VARCHAR(11)',
      dataCategory: '联系方式',
      dataLevel: 'secret',
      isSensitive: true,
      isDesensitized: true,
      isEncrypted: true,
      groupName: '用户基础信息组',
      sampleData: ['138****1234', '139****5678', '137****9012'],
      updateTime: '2024-01-21 16:45:00',
      status: 'active',
    },
    {
      id: '3',
      fieldName: 'order_amount',
      fieldComment: '订单金额',
      fieldTable: 'orders',
      dataType: 'DECIMAL(10,2)',
      dataCategory: '财务信息',
      dataLevel: 'internal',
      isSensitive: false,
      isDesensitized: false,
      isEncrypted: false,
      groupName: '订单信息组',
      sampleData: ['299.99', '599.50', '1299.00', '89.90'],
      updateTime: '2024-01-19 13:30:00',
      status: 'active',
    },
    {
      id: '4',
      fieldName: 'product_name',
      fieldComment: '产品名称',
      fieldTable: 'products',
      dataType: 'VARCHAR(100)',
      dataCategory: '商品信息',
      dataLevel: 'public',
      isSensitive: false,
      isDesensitized: false,
      isEncrypted: false,
      groupName: '产品信息组',
      sampleData: ['iPhone 15', 'MacBook Pro', 'iPad Air', 'Apple Watch'],
      updateTime: '2024-01-18 11:20:00',
      status: 'processing',
    },
    {
      id: '5',
      fieldName: 'id_card',
      fieldComment: '身份证号',
      fieldTable: 'users',
      dataType: 'VARCHAR(18)',
      dataCategory: '身份信息',
      dataLevel: 'secret',
      isSensitive: true,
      isDesensitized: true,
      isEncrypted: true,
      groupName: '用户基础信息组',
      sampleData: ['110***********1234', '310***********5678'],
      updateTime: '2024-01-17 09:15:00',
      status: 'active',
    },
  ];

  // 样本数据表格列定义
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

  // 显示样本数据的函数
  const showSampleData = (record: FullDataItem) => {
    const sampleDataList: SampleDataItem[] = record.sampleData.map((data, index) => ({
      id: index + 1,
      sampleData: data,
      updateTime: record.updateTime,
    }));
    setCurrentSampleData(sampleDataList);
    setCurrentFieldName(record.fieldName);
    setSampleDrawerVisible(true);
  };

  const columns: ProColumns<FullDataItem>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
      search: false,
      align: 'center',
    },
    {
      title: '字段名称',
      dataIndex: 'fieldName',
      align: 'center',
      valueType: 'text',
    },
    {
      title: '字段注释',
      dataIndex: 'fieldComment',
      align: 'center',
      valueType: 'text',
    },
    {
      title: '字段库表',
      dataIndex: 'fieldTable',
      align: 'center',
      valueType: 'select',
      valueEnum: {
        'users': { text: '用户表' },
        'orders': { text: '订单表' },
        'products': { text: '产品表' },
      },
    },
    {
      title: '数据类型',
      dataIndex: 'dataType',
      align: 'center',
      valueType: 'select',
      valueEnum: {
        'VARCHAR(50)': { text: 'VARCHAR(50)' },
        'VARCHAR(11)': { text: 'VARCHAR(11)' },
        'VARCHAR(18)': { text: 'VARCHAR(18)' },
        'VARCHAR(100)': { text: 'VARCHAR(100)' },
        'DECIMAL(10,2)': { text: 'DECIMAL(10,2)' },
        'INT': { text: 'INT' },
        'DATETIME': { text: 'DATETIME' },
      },
    },
    {
      title: '数据分类',
      dataIndex: 'dataCategory',
      align: 'center',
      valueType: 'select',
      valueEnum: {
        '个人信息': { text: '个人信息' },
        '联系方式': { text: '联系方式' },
        '身份信息': { text: '身份信息' },
        '财务信息': { text: '财务信息' },
        '商品信息': { text: '商品信息' },
      },
    },
    {
      title: '数据分级',
      dataIndex: 'dataLevel',
      align: 'center',
      valueType: 'select',
      valueEnum: {
        public: {
          text: '公开',
          status: 'Success',
        },
        internal: {
          text: '内部',
          status: 'Warning',
        },
        confidential: {
          text: '机密',
          status: 'Error',
        },
        secret: {
          text: '绝密',
          status: 'Error',
        },
      },
      render: (_, record) => {
        const levelMap = {
          public: { color: 'green', text: '公开' },
          internal: { color: 'orange', text: '内部' },
          confidential: { color: 'red', text: '机密' },
          secret: { color: 'red', text: '绝密' },
        };
        const level = levelMap[record.dataLevel];
        return <Tag color={level.color}>{level.text}</Tag>;
      },
    },
    {
      title: '是否敏感',
      dataIndex: 'isSensitive',
      align: 'center',
      valueType: 'select',
      valueEnum: {
        true: { text: '是', status: 'Error' },
        false: { text: '否', status: 'Success' },
      },
      render: (_, record) => (
        <Tag color={record.isSensitive ? 'red' : 'green'}>
          {record.isSensitive ? '是' : '否'}
        </Tag>
      ),
    },
    {
      title: '所属分组',
      dataIndex: 'groupName',
      align: 'center',
      valueType: 'select',
      valueEnum: {
        '用户基础信息组': { text: '用户基础信息组' },
        '订单信息组': { text: '订单信息组' },
        '产品信息组': { text: '产品信息组' },
      },
    },

    {
      title: '是否脱敏',
      dataIndex: 'isDesensitized',
      align: 'center',
      valueType: 'select',
      valueEnum: {
        true: { text: '是', status: 'Success' },
        false: { text: '否', status: 'Default' },
      },
      render: (_, record) => (
        <Tag color={record.isDesensitized ? 'green' : 'default'}>
          {record.isDesensitized ? '是' : '否'}
        </Tag>
      ),
    },
    {
      title: '是否加密',
      dataIndex: 'isEncrypted',
      align: 'center',
      valueType: 'select',
      valueEnum: {
        true: { text: '是', status: 'Success' },
        false: { text: '否', status: 'Default' },
      },
      render: (_, record) => (
        <Tag color={record.isEncrypted ? 'green' : 'default'}>
          {record.isEncrypted ? '是' : '否'}
        </Tag>
      ),
    },
    {
      title: '样本',
      dataIndex: 'sample',
      align: 'center',
      search: false,
      render: (_, record) => (
        <Button
          type="link"
          onClick={() => showSampleData(record)}
        >
          查看样本
        </Button>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      align: 'center',
      valueType: 'dateTime',
      search: false,
    },
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
              messageApi.info('导出数据');
            }}
          >
            导出数据
          </Button>,
        ]}
        request={async (params) => {
          // 模拟API请求
          const { current = 1, pageSize = 10, ...restParams } = params;

          // 模拟筛选
          let filteredData = mockData;
          if (restParams.fieldName) {
            filteredData = filteredData.filter(item =>
              item.fieldName.includes(restParams.fieldName)
            );
          }
          if (restParams.fieldComment) {
            filteredData = filteredData.filter(item =>
              item.fieldComment.includes(restParams.fieldComment)
            );
          }
          if (restParams.fieldTable) {
            filteredData = filteredData.filter(item =>
              item.fieldTable === restParams.fieldTable
            );
          }
          if (restParams.dataType) {
            filteredData = filteredData.filter(item =>
              item.dataType === restParams.dataType
            );
          }
          if (restParams.dataCategory) {
            filteredData = filteredData.filter(item =>
              item.dataCategory === restParams.dataCategory
            );
          }
          if (restParams.dataLevel) {
            filteredData = filteredData.filter(item =>
              item.dataLevel === restParams.dataLevel
            );
          }
          if (restParams.isSensitive !== undefined) {
            filteredData = filteredData.filter(item =>
              item.isSensitive === (restParams.isSensitive === 'true')
            );
          }
          if (restParams.isDesensitized !== undefined) {
            filteredData = filteredData.filter(item =>
              item.isDesensitized === (restParams.isDesensitized === 'true')
            );
          }
          if (restParams.isEncrypted !== undefined) {
            filteredData = filteredData.filter(item =>
              item.isEncrypted === (restParams.isEncrypted === 'true')
            );
          }
          if (restParams.groupName) {
            filteredData = filteredData.filter(item =>
              item.groupName === restParams.groupName
            );
          }

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

      {/* 样本数据抽屉 */}
      <Drawer
        title={`${currentFieldName} - 样本数据`}
        placement="right"
        width={600}
        onClose={() => setSampleDrawerVisible(false)}
        open={sampleDrawerVisible}
      >
        <Table
          columns={sampleColumns}
          dataSource={currentSampleData}
          pagination={false}
          size="small"
        />
      </Drawer>
    </PageContainer>
  );
};

export default FullDataList; 