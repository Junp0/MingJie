import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { FormattedMessage, useIntl } from '@umijs/max';
import { Button, message, Tag, Card, Tree, List, Space, Typography } from 'antd';
import React, { useRef, useState } from 'react';

const { Title, Text } = Typography;

// 数据库实例接口
interface DatabaseInstance {
  ip: string;
  status: 'online' | 'offline';
  databases: DatabaseItem[];
}

// 数据库接口
interface DatabaseItem {
  id: string;
  name: string;
  type: string;
  status: 'online' | 'offline';
  tables: TableItem[];
}

// 表接口
interface TableItem {
  id: string;
  name: string;
  databaseId: string;
  rowCount: number;
  size: number;
  status: 'online' | 'offline' | 'maintenance';
  lastSyncTime: string;
  syncStatus: 'success' | 'failed' | 'syncing';
  fields: FieldItem[];
}

// 字段接口
interface FieldItem {
  id: string;
  fieldName: string;
  fieldComment: string;
  dataType: string;
  dataCategory: string;
  dataLevel: 'public' | 'internal' | 'confidential' | 'secret';
  isSensitive: boolean;
  isDesensitized: boolean;
  isEncrypted: boolean;
  groupName: string;
  sampleData: string[];
  updateTime: string;
}



const TableDataList: React.FC = () => {
  const actionRef = useRef<ActionType | null>(null);
  const intl = useIntl();
  const [messageApi, contextHolder] = message.useMessage();
  
  // 选中的数据库实例、数据库名和表
  const [selectedDatabaseInstance, setSelectedDatabaseInstance] = useState<string | null>(null);
  const [selectedDatabaseName, setSelectedDatabaseName] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<TableItem | null>(null);
  const [selectedFields, setSelectedFields] = useState<FieldItem[]>([]);

  // 模拟数据库实例数据
  const mockDatabaseInstances: DatabaseInstance[] = [
    {
      ip: '192.168.1.100',
      status: 'online',
      databases: [
        {
          id: 'db1',
          name: 'user_management',
          type: 'MySQL',
          status: 'online',
          tables: [
            {
              id: 'table1',
              name: 'users',
              databaseId: 'db1',
              rowCount: 15000,
              size: 2048000,
              status: 'online',
              lastSyncTime: '2024-01-21 15:30:00',
              syncStatus: 'success',
              fields: [
                {
                  id: 'field1',
                  fieldName: 'user_id',
                  fieldComment: '用户ID',
                  dataType: 'BIGINT',
                  dataCategory: '标识信息',
                  dataLevel: 'internal',
                  isSensitive: false,
                  isDesensitized: false,
                  isEncrypted: false,
                  groupName: '用户基础信息组',
                  sampleData: ['1001', '1002', '1003'],
                  updateTime: '2024-01-21 15:30:00',
                },
                {
                  id: 'field2',
                  fieldName: 'user_name',
                  fieldComment: '用户姓名',
                  dataType: 'VARCHAR(50)',
                  dataCategory: '个人信息',
                  dataLevel: 'confidential',
                  isSensitive: true,
                  isDesensitized: true,
                  isEncrypted: false,
                  groupName: '用户基础信息组',
                  sampleData: ['张三', '李四', '王五'],
                  updateTime: '2024-01-21 15:30:00',
                },
              ],
            },
            {
              id: 'table2',
              name: 'user_profiles',
              databaseId: 'db1',
              rowCount: 15000,
              size: 1024000,
              status: 'online',
              lastSyncTime: '2024-01-21 16:00:00',
              syncStatus: 'success',
              fields: [
                {
                  id: 'field3',
                  fieldName: 'profile_id',
                  fieldComment: '档案ID',
                  dataType: 'BIGINT',
                  dataCategory: '标识信息',
                  dataLevel: 'internal',
                  isSensitive: false,
                  isDesensitized: false,
                  isEncrypted: false,
                  groupName: '用户档案组',
                  sampleData: ['2001', '2002', '2003'],
                  updateTime: '2024-01-21 16:00:00',
                },
              ],
            },
          ],
        },
        {
          id: 'db2',
          name: 'log_management',
          type: 'MySQL',
          status: 'online',
          tables: [
            {
              id: 'table4',
              name: 'access_logs',
              databaseId: 'db2',
              rowCount: 100000,
              size: 5120000,
              status: 'online',
              lastSyncTime: '2024-01-21 14:30:00',
              syncStatus: 'success',
              fields: [
                {
                  id: 'field5',
                  fieldName: 'log_id',
                  fieldComment: '日志ID',
                  dataType: 'BIGINT',
                  dataCategory: '标识信息',
                  dataLevel: 'internal',
                  isSensitive: false,
                  isDesensitized: false,
                  isEncrypted: false,
                  groupName: '日志信息组',
                  sampleData: ['3001', '3002', '3003'],
                  updateTime: '2024-01-21 14:30:00',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      ip: '192.168.1.101',
      status: 'online',
      databases: [
        {
          id: 'db3',
          name: 'ecommerce',
          type: 'MySQL',
          status: 'online',
          tables: [
            {
              id: 'table3',
              name: 'orders',
              databaseId: 'db3',
              rowCount: 50000,
              size: 8192000,
              status: 'online',
              lastSyncTime: '2024-01-21 14:45:00',
              syncStatus: 'syncing',
              fields: [
                {
                  id: 'field4',
                  fieldName: 'order_id',
                  fieldComment: '订单ID',
                  dataType: 'VARCHAR(32)',
                  dataCategory: '标识信息',
                  dataLevel: 'internal',
                  isSensitive: false,
                  isDesensitized: false,
                  isEncrypted: false,
                  groupName: '订单信息组',
                  sampleData: ['ORD001', 'ORD002', 'ORD003'],
                  updateTime: '2024-01-21 14:45:00',
                },
              ],
            },
          ],
        },
      ],
    },
  ];



  // 字段信息表格列定义
  const fieldColumns: ProColumns<FieldItem>[] = [
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
      title: '数据类型',
      dataIndex: 'dataType',
      align: 'center',
      valueType: 'select',
      valueEnum: {
        'BIGINT': { text: 'BIGINT' },
        'VARCHAR(32)': { text: 'VARCHAR(32)' },
        'VARCHAR(50)': { text: 'VARCHAR(50)' },
        'VARCHAR(100)': { text: 'VARCHAR(100)' },
        'DECIMAL(10,2)': { text: 'DECIMAL(10,2)' },
        'DATETIME': { text: 'DATETIME' },
      },
    },
    {
      title: '数据分类',
      dataIndex: 'dataCategory',
      align: 'center',
      valueType: 'select',
      valueEnum: {
        '标识信息': { text: '标识信息' },
        '个人信息': { text: '个人信息' },
        '联系方式': { text: '联系方式' },
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
        public: { text: '公开', status: 'Success' },
        internal: { text: '内部', status: 'Warning' },
        confidential: { text: '机密', status: 'Error' },
        secret: { text: '绝密', status: 'Error' },
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

  ];

  // 处理数据库实例和数据库名选择
  const handleDatabaseInstanceSelect = (selectedKeys: React.Key[], info: any) => {
    const selectedKey = selectedKeys[0] as string;
    
    // 检查是否是数据库实例选择
    const instance = mockDatabaseInstances.find(inst => inst.ip === selectedKey);
    if (instance) {
      // 选择的是数据库实例
      setSelectedDatabaseInstance(selectedKey);
      setSelectedDatabaseName(null);
      setSelectedTable(null);
      setSelectedFields([]);
      return;
    }
    
    // 检查是否是数据库名选择
    const keyParts = selectedKey.split('-');
    if (keyParts.length === 2) {
      const [instanceIp, databaseName] = keyParts;
      setSelectedDatabaseInstance(instanceIp);
      setSelectedDatabaseName(databaseName);
      setSelectedTable(null);
      setSelectedFields([]);
    }
  };



  // 处理表选择
  const handleTableSelect = (table: TableItem) => {
    setSelectedTable(table);
    setSelectedFields(table.fields);
  };

  // 获取当前选中的数据库实例
  const getCurrentInstance = () => {
    return mockDatabaseInstances.find(instance => instance.ip === selectedDatabaseInstance);
  };

  // 获取当前选中的数据库
  const getCurrentDatabase = () => {
    const instance = getCurrentInstance();
    return instance?.databases.find(db => db.name === selectedDatabaseName);
  };

  return (
    <PageContainer>
      {contextHolder}
      <div style={{ display: 'flex', height: 'calc(100vh - 200px)' }}>
        {/* 库目录 - 15% */}
        <Card 
          title="库目录" 
          style={{ width: '15%', minWidth: '180px' }}
          bodyStyle={{ padding: '8px', height: '100%', overflow: 'auto' }}
        >
          <Tree
            treeData={mockDatabaseInstances.map(instance => ({
              key: instance.ip,
              title: (
                <div>
                  <div style={{ fontWeight: 'bold' }}>{instance.ip}</div>
                  <Tag color={instance.status === 'online' ? 'green' : 'red'}>
                    {instance.status === 'online' ? '在线' : '离线'}
                  </Tag>
                </div>
              ),
              children: instance.databases.map(db => ({
                key: `${instance.ip}-${db.name}`,
                title: (
                  <div>
                    <div>{db.name}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {db.tables.length} 个表
                    </div>
                  </div>
                ),
              })),
            }))}
            onSelect={handleDatabaseInstanceSelect}
            defaultExpandAll
          />
        </Card>

        {/* 表目录 - 15% */}
        <Card 
          title="表目录" 
          style={{ width: '15%', minWidth: '180px' }}
          bodyStyle={{ padding: '8px', height: '100%', overflow: 'auto' }}
        >
          {selectedDatabaseInstance && selectedDatabaseName ? (
            <List
              dataSource={getCurrentDatabase()?.tables || []}
              renderItem={(table) => (
                <List.Item
                  style={{ 
                    cursor: 'pointer',
                    backgroundColor: selectedTable?.id === table.id ? '#f0f0f0' : 'transparent',
                    padding: '8px',
                    borderRadius: '4px',
                    marginBottom: '4px'
                  }}
                  onClick={() => handleTableSelect(table)}
                >
                  <div style={{ width: '100%' }}>
                    <div style={{ fontWeight: 'bold' }}>{table.name}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      行数: {table.rowCount.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      大小: {(table.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                    <Space size="small" style={{ marginTop: '4px' }}>
                      <Tag color={
                        table.status === 'online' ? 'green' : 
                        table.status === 'maintenance' ? 'orange' : 'red'
                      }>
                        {table.status === 'online' ? '在线' : 
                         table.status === 'maintenance' ? '维护中' : '离线'}
                      </Tag>
                      <Tag color={
                        table.syncStatus === 'success' ? 'green' : 
                        table.syncStatus === 'syncing' ? 'blue' : 'red'
                      }>
                        {table.syncStatus === 'success' ? '同步成功' : 
                         table.syncStatus === 'syncing' ? '同步中' : '同步失败'}
                      </Tag>
                    </Space>
                  </div>
                </List.Item>
              )}
            />
          ) : selectedDatabaseInstance ? (
            <div style={{ textAlign: 'center', color: '#999', marginTop: '50px' }}>
              请选择数据库名
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#999', marginTop: '50px' }}>
              请先选择数据库实例
            </div>
          )}
        </Card>

        {/* 字段信息 - 70% */}
        <Card 
          title={
            <div>
              字段信息
              {selectedDatabaseInstance && selectedDatabaseName && selectedTable && (
                <Text style={{ marginLeft: '8px', fontSize: '14px', color: '#666' }}>
                  {selectedDatabaseInstance} / {selectedDatabaseName} / {selectedTable.name}
                </Text>
              )}
            </div>
          }
          style={{ width: '70%', flex: 1 }}
          bodyStyle={{ padding: '8px', height: '100%' }}
        >
          {selectedTable ? (
            <ProTable<FieldItem>
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
                    messageApi.info('导出字段数据');
                  }}
                >
                  导出数据
                </Button>,
              ]}
              request={async (params) => {
                // 模拟API请求
                const { current = 1, pageSize = 10, ...restParams } = params;
                
                // 模拟筛选
                let filteredData = selectedFields;
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
              columns={fieldColumns}
              pagination={{
                defaultPageSize: 10,
                showSizeChanger: true,
              }}
              tableStyle={{
                textAlign: 'center',
              }}
            />
          ) : selectedDatabaseInstance && selectedDatabaseName ? (
            <div style={{ textAlign: 'center', color: '#999', marginTop: '50px' }}>
              请先选择数据表
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#999', marginTop: '50px' }}>
              请先选择数据库实例和数据库名
            </div>
          )}
        </Card>
      </div>


    </PageContainer>
  );
};

export default TableDataList; 