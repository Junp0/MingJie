import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { FormattedMessage, useIntl } from '@umijs/max';
import { Button, message, Tag, Badge, Drawer, Table } from 'antd';
import React, { useRef, useState } from 'react';

// 未命中数据接口
interface MissedDataItem {
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
  key: string;
  missCount: number;
  missRate: number;
  lastCheckTime: string;
  status: 'high' | 'medium' | 'low';
  source: string;
  priority: 'high' | 'medium' | 'low';
  sampleData: string[];
  updateTime: string;
}

// 样本数据接口
interface SampleDataItem {
  id: number;
  sampleData: string;
  updateTime: string;
}

const CheckDataList: React.FC = () => {
  const actionRef = useRef<ActionType | null>(null);
  const intl = useIntl();
  const [messageApi, contextHolder] = message.useMessage();
  const [sampleDrawerVisible, setSampleDrawerVisible] = useState(false);
  const [currentSampleData, setCurrentSampleData] = useState<SampleDataItem[]>([]);
  const [currentFieldName, setCurrentFieldName] = useState('');

  // 模拟数据
  const mockData: MissedDataItem[] = [
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
      key: 'user:profile:1001',
      missCount: 156,
      missRate: 23.5,
      lastCheckTime: '2024-01-21 16:30:00',
      status: 'high',
      source: 'Redis缓存',
      priority: 'high',
      sampleData: ['张三', '李四', '王五', '赵六'],
      updateTime: '2024-01-21 16:30:00',
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
      key: 'user:phone:1001',
      missCount: 89,
      missRate: 15.2,
      lastCheckTime: '2024-01-21 16:25:00',
      status: 'medium',
      source: 'Redis缓存',
      priority: 'medium',
      sampleData: ['138****1234', '139****5678', '137****9012'],
      updateTime: '2024-01-21 16:25:00',
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
      key: 'order:amount:3001',
      missCount: 234,
      missRate: 45.8,
      lastCheckTime: '2024-01-21 16:20:00',
      status: 'high',
      source: 'Memcached',
      priority: 'high',
      sampleData: ['299.99', '599.50', '1299.00', '89.90'],
      updateTime: '2024-01-21 16:20:00',
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
      key: 'product:name:4001',
      missCount: 12,
      missRate: 2.1,
      lastCheckTime: '2024-01-21 16:15:00',
      status: 'low',
      source: 'Redis缓存',
      priority: 'low',
      sampleData: ['iPhone 15', 'MacBook Pro', 'iPad Air', 'Apple Watch'],
      updateTime: '2024-01-21 16:15:00',
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
      key: 'user:idcard:1001',
      missCount: 67,
      missRate: 12.3,
      lastCheckTime: '2024-01-21 16:10:00',
      status: 'medium',
      source: 'Redis缓存',
      priority: 'medium',
      sampleData: ['110***********1234', '310***********5678'],
      updateTime: '2024-01-21 16:10:00',
    },
  ];

  // 样本数据表格列定义
  const sampleColumns = [
    {
      title: '序号',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '样本数据',
      dataIndex: 'sampleData',
      key: 'sampleData',
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      key: 'updateTime',
      width: 180,
    },
  ];

  // 显示样本数据的函数
  const showSampleData = (record: MissedDataItem) => {
    const sampleDataList: SampleDataItem[] = record.sampleData.map((data, index) => ({
      id: index + 1,
      sampleData: data,
      updateTime: record.updateTime,
    }));
    setCurrentSampleData(sampleDataList);
    setCurrentFieldName(record.fieldName);
    setSampleDrawerVisible(true);
  };

  const columns: ProColumns<MissedDataItem>[] = [
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
      valueType: 'text',
      align: 'center',
    },
    {
      title: '字段注释',
      dataIndex: 'fieldComment',
      valueType: 'text',
      align: 'center',
    },
    {
      title: '字段库表',
      dataIndex: 'fieldTable',
      valueType: 'select',
      valueEnum: {
        'users': { text: '用户表' },
        'orders': { text: '订单表' },
        'products': { text: '产品表' },
      },
      align: 'center',
    },
    {
      title: '数据类型',
      dataIndex: 'dataType',
      valueType: 'select',
      valueEnum: {
        'VARCHAR(11)': { text: 'VARCHAR(11)' },
        'VARCHAR(18)': { text: 'VARCHAR(18)' },
        'VARCHAR(50)': { text: 'VARCHAR(50)' },
        'VARCHAR(100)': { text: 'VARCHAR(100)' },
        'DECIMAL(10,2)': { text: 'DECIMAL(10,2)' },
        'INT': { text: 'INT' },
        'DATETIME': { text: 'DATETIME' },
      },
      align: 'center',
    },

    {
      title: '所属分组',
      dataIndex: 'groupName',
      valueType: 'select',
      valueEnum: {
        '用户基础信息组': { text: '用户基础信息组' },
        '订单信息组': { text: '订单信息组' },
        '产品信息组': { text: '产品信息组' },
      },
      align: 'center',
    },
    {
      title: '样本数据',
      dataIndex: 'sampleData',
      search: false,
      render: (_, record) => (
        <span style={{ fontSize: '12px', color: '#666' }}>
          {record.sampleData.length > 0 ? record.sampleData[0] : '-'}
        </span>
      ),
      align: 'center',
    },
    {
      title: '样本',
      dataIndex: 'sample',
      search: false,
      render: (_, record) => (
        <Button
          type="link"
          onClick={() => showSampleData(record)}
        >
          查看样本
        </Button>
      ),
      align: 'center',
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
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            type="link"
            size="small"
            style={{ padding: '0', margin: '0' }}
            onClick={() => {
              messageApi.info(`刷新: ${record.key}`);
            }}
          >
            刷新
          </Button>
          <Button
            type="link"
            size="small"
            style={{ padding: '0', margin: '0' }}
            onClick={() => {
              messageApi.info(`优化规则: ${record.key}`);
            }}
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
        search={{
          labelWidth: 120,
        }}
        toolBarRender={() => [
          <Button
            key="batchRefresh"
            type="primary"
            onClick={() => {
              messageApi.info('批量刷新');
            }}
          >
            批量刷新
          </Button>,
          <Button
            key="export"
            onClick={() => {
              messageApi.info('导出清单');
            }}
          >
            导出清单
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

          if (restParams.groupName) {
            filteredData = filteredData.filter(item => 
              item.groupName === restParams.groupName
            );
          }
          if (restParams.status) {
            filteredData = filteredData.filter(item => 
              item.status === restParams.status
            );
          }
          if (restParams.priority) {
            filteredData = filteredData.filter(item => 
              item.priority === restParams.priority
            );
          }
          if (restParams.source) {
            filteredData = filteredData.filter(item => 
              item.source === restParams.source
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

export default CheckDataList; 