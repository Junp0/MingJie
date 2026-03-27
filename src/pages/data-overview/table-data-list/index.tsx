import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { useLocation } from '@umijs/max';
import { Button, Card, Empty, List, Space, Tag, Tree, Typography, message } from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  listDataAssets,
  type DataAssetLevel,
  type DataAssetRecord,
} from '@/services/data-assets/dataAssetStore';

const { Text } = Typography;

interface DatabaseInstance {
  ip: string;
  status: 'online' | 'offline';
  databases: DatabaseItem[];
}

interface DatabaseItem {
  id: string;
  assetId: string;
  assetName: string;
  name: string;
  type: string;
  status: 'online' | 'offline';
  tables: TableItem[];
}

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

interface FieldItem {
  id: string;
  fieldName: string;
  fieldComment: string;
  dataType: string;
  dataCategory: string;
  dataLevel: DataAssetLevel;
  isSensitive: boolean;
  isDesensitized: boolean;
  isEncrypted: boolean;
  groupName: string;
  sampleData: string[];
  updateTime: string;
}

interface TableListItem extends TableItem {
  databaseName: string;
  instanceIp: string;
}

interface FieldListItem extends FieldItem {
  databaseName: string;
  tableName: string;
  instanceIp: string;
}

const FIELD_TEMPLATES = [
  { fieldName: 'id', fieldComment: '主键ID', dataType: 'BIGINT', dataCategory: '标识信息' },
  { fieldName: 'name', fieldComment: '名称', dataType: 'VARCHAR(100)', dataCategory: '个人信息' },
  { fieldName: 'code', fieldComment: '编码', dataType: 'VARCHAR(32)', dataCategory: '标识信息' },
  { fieldName: 'mobile', fieldComment: '手机号', dataType: 'VARCHAR(20)', dataCategory: '联系方式' },
  { fieldName: 'amount', fieldComment: '金额', dataType: 'DECIMAL(10,2)', dataCategory: '财务信息' },
  { fieldName: 'created_at', fieldComment: '创建时间', dataType: 'DATETIME', dataCategory: '标识信息' },
  { fieldName: 'updated_at', fieldComment: '更新时间', dataType: 'DATETIME', dataCategory: '标识信息' },
  { fieldName: 'remark', fieldComment: '备注', dataType: 'VARCHAR(255)', dataCategory: '商品信息' },
];

const normalizeAssetName = (value: string) => value.replace(/_db$/i, '');

const mapAssetStatusToDatabaseStatus = (
  status: DataAssetRecord['status'],
): DatabaseInstance['status'] => (status === 'active' ? 'online' : 'offline');

const mapAssetStatusToTableStatus = (
  status: DataAssetRecord['status'],
): TableItem['status'] => {
  if (status === 'archived') {
    return 'maintenance';
  }

  return status === 'active' ? 'online' : 'offline';
};

const buildFieldMocks = (
  asset: DataAssetRecord,
  tableName: string,
  tableIndex: number,
): FieldItem[] => {
  const fieldCount = Math.max(
    3,
    Math.min(8, Math.ceil(asset.fieldCount / Math.max(1, Math.min(asset.tableCount || 1, 6)))),
  );

  return Array.from({ length: fieldCount }, (_, fieldIndex) => {
    const template = FIELD_TEMPLATES[fieldIndex % FIELD_TEMPLATES.length];

    return {
      id: `${asset.id}-table-${tableIndex + 1}-field-${fieldIndex + 1}`,
      fieldName: `${template.fieldName}_${fieldIndex + 1}`,
      fieldComment: `${tableName}${template.fieldComment}`,
      dataType: template.dataType,
      dataCategory: template.dataCategory,
      dataLevel: asset.dataLevel,
      isSensitive: ['confidential', 'secret'].includes(asset.dataLevel),
      isDesensitized: asset.dataLevel !== 'public',
      isEncrypted: asset.dataLevel === 'secret',
      groupName: asset.assetGroupName,
      sampleData: [`${asset.name}_${fieldIndex + 1}_A`, `${asset.name}_${fieldIndex + 1}_B`],
      updateTime: asset.updateTime,
    };
  });
};

const buildTableMocks = (asset: DataAssetRecord): TableItem[] => {
  const baseName = normalizeAssetName(asset.name);
  const tableCount = Math.max(1, Math.min(asset.tableCount || 1, 6));
  const perTableRowCount = Math.max(1, Math.floor((asset.recordCount || tableCount) / tableCount));
  const perTableSize = Math.max(1024, Math.floor((asset.size || 1024 * tableCount) / tableCount));

  return Array.from({ length: tableCount }, (_, index) => {
    const tableName = tableCount === 1 ? `${baseName}_main` : `${baseName}_${index + 1}`;

    return {
      id: `${asset.id}-table-${index + 1}`,
      name: tableName,
      databaseId: asset.id,
      rowCount: perTableRowCount + index * 100,
      size: perTableSize,
      status: mapAssetStatusToTableStatus(asset.status),
      lastSyncTime: asset.lastSyncTime,
      syncStatus: asset.syncStatus,
      fields: buildFieldMocks(asset, tableName, index),
    };
  });
};

const buildDatabaseInstances = (assets: DataAssetRecord[]): DatabaseInstance[] => {
  const groupedAssets = new Map<string, DataAssetRecord[]>();

  assets.forEach((asset) => {
    const current = groupedAssets.get(asset.ipAddress) ?? [];
    current.push(asset);
    groupedAssets.set(asset.ipAddress, current);
  });

  return Array.from(groupedAssets.entries())
    .map(([ip, grouped]) => {
      const status: DatabaseInstance['status'] = grouped.some(
        (asset) => asset.status === 'active',
      )
        ? 'online'
        : 'offline';

      return {
        ip,
        status,
        databases: grouped.map((asset) => ({
          id: asset.id,
          assetId: asset.id,
          assetName: asset.name,
          name: normalizeAssetName(asset.name),
          type: asset.sourceType,
          status: mapAssetStatusToDatabaseStatus(asset.status),
          tables: buildTableMocks(asset),
        })),
      };
    })
    .sort((left, right) => left.ip.localeCompare(right.ip));
};

const TableDataList: React.FC = () => {
  const actionRef = useRef<ActionType | null>(null);
  const location = useLocation();
  const [messageApi, contextHolder] = message.useMessage();
  const [selectedDatabaseInstance, setSelectedDatabaseInstance] = useState<string | null>(null);
  const [selectedDatabaseId, setSelectedDatabaseId] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<TableListItem | null>(null);

  const databaseInstances = useMemo(() => buildDatabaseInstances(listDataAssets()), []);

  const databaseMap = useMemo(() => {
    const entries: Array<[string, { instanceIp: string; database: DatabaseItem }]> = [];

    databaseInstances.forEach((instance) => {
      instance.databases.forEach((database) => {
        entries.push([database.id, { instanceIp: instance.ip, database }]);
      });
    });

    return new Map(entries);
  }, [databaseInstances]);

  const fieldColumns: ProColumns<FieldListItem>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 140,
      search: false,
      align: 'center',
    },
    {
      title: '所属数据库',
      dataIndex: 'databaseName',
      align: 'center',
      valueType: 'text',
    },
    {
      title: '所属表',
      dataIndex: 'tableName',
      align: 'center',
      valueType: 'text',
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
        BIGINT: { text: 'BIGINT' },
        'VARCHAR(20)': { text: 'VARCHAR(20)' },
        'VARCHAR(32)': { text: 'VARCHAR(32)' },
        'VARCHAR(100)': { text: 'VARCHAR(100)' },
        'VARCHAR(255)': { text: 'VARCHAR(255)' },
        'DECIMAL(10,2)': { text: 'DECIMAL(10,2)' },
        DATETIME: { text: 'DATETIME' },
      },
    },
    {
      title: '数据分类',
      dataIndex: 'dataCategory',
      align: 'center',
      valueType: 'select',
      valueEnum: {
        标识信息: { text: '标识信息' },
        个人信息: { text: '个人信息' },
        联系方式: { text: '联系方式' },
        财务信息: { text: '财务信息' },
        商品信息: { text: '商品信息' },
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
        <Tag color={record.isSensitive ? 'red' : 'green'}>{record.isSensitive ? '是' : '否'}</Tag>
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

  const handleTableSelect = (table: TableListItem | null) => {
    setSelectedTable(table);
  };

  const handleDatabaseTreeSelect = (selectedKeys: React.Key[]) => {
    const selectedKey = String(selectedKeys[0] ?? '');

    if (!selectedKey) {
      return;
    }

    if (selectedKey.startsWith('instance:')) {
      const instanceIp = selectedKey.replace('instance:', '');
      setSelectedDatabaseInstance(instanceIp);
      setSelectedDatabaseId(null);
      setSelectedTable(null);
      return;
    }

    if (selectedKey.startsWith('database:')) {
      const databaseId = selectedKey.replace('database:', '');
      const matched = databaseMap.get(databaseId);

      if (!matched) {
        return;
      }

      setSelectedDatabaseInstance(matched.instanceIp);
      setSelectedDatabaseId(databaseId);
      setSelectedTable(null);
    }
  };

  const getCurrentInstance = () =>
    databaseInstances.find((instance) => instance.ip === selectedDatabaseInstance) ?? null;

  const getCurrentDatabase = () =>
    getCurrentInstance()?.databases.find((database) => database.id === selectedDatabaseId) ?? null;

  const currentInstance = getCurrentInstance();
  const currentDatabase = getCurrentDatabase();

  const currentTables = useMemo<TableListItem[]>(() => {
    if (!currentInstance) {
      return [];
    }

    if (currentDatabase) {
      return currentDatabase.tables.map((table) => ({
        ...table,
        databaseName: currentDatabase.name,
        instanceIp: currentInstance.ip,
      }));
    }

    return currentInstance.databases.flatMap((database) =>
      database.tables.map((table) => ({
        ...table,
        databaseName: database.name,
        instanceIp: currentInstance.ip,
      })),
    );
  }, [currentDatabase, currentInstance]);

  const currentFields = useMemo<FieldListItem[]>(() => {
    if (selectedTable) {
      return selectedTable.fields.map((field) => ({
        ...field,
        databaseName: selectedTable.databaseName,
        tableName: selectedTable.name,
        instanceIp: selectedTable.instanceIp,
      }));
    }

    if (!currentInstance) {
      return [];
    }

    if (currentDatabase) {
      return currentDatabase.tables.flatMap((table) =>
        table.fields.map((field) => ({
          ...field,
          databaseName: currentDatabase.name,
          tableName: table.name,
          instanceIp: currentInstance.ip,
        })),
      );
    }

    return currentInstance.databases.flatMap((database) =>
      database.tables.flatMap((table) =>
        table.fields.map((field) => ({
          ...field,
          databaseName: database.name,
          tableName: table.name,
          instanceIp: currentInstance.ip,
        })),
      ),
    );
  }, [currentDatabase, currentInstance, selectedTable]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const assetId = params.get('assetId');

    if (!assetId) {
      return;
    }

    const matched = databaseMap.get(assetId);
    if (!matched) {
      messageApi.warning('未在库表数据列表中找到对应的数据资产');
      return;
    }

    setSelectedDatabaseInstance(matched.instanceIp);
    setSelectedDatabaseId(matched.database.id);
    setSelectedTable(null);
  }, [databaseMap, location.search, messageApi]);

  const selectedTreeKeys = selectedDatabaseId
    ? [`database:${selectedDatabaseId}`]
    : selectedDatabaseInstance
      ? [`instance:${selectedDatabaseInstance}`]
      : [];
  const fieldScopeLabel = selectedTable
    ? `${selectedTable.instanceIp} / ${selectedTable.databaseName} / ${selectedTable.name}`
    : currentDatabase
      ? `${currentInstance?.ip ?? ''} / ${currentDatabase.name}`
      : currentInstance
        ? `${currentInstance.ip} / 全部数据库`
        : '';
  const fieldScopeKey = selectedTable
    ? `table:${selectedTable.instanceIp}:${selectedTable.databaseName}:${selectedTable.id}`
    : currentDatabase
      ? `database:${currentInstance?.ip ?? ''}:${currentDatabase.id}`
      : currentInstance
        ? `instance:${currentInstance.ip}`
        : 'empty';

  return (
    <PageContainer>
      {contextHolder}
      <div style={{ display: 'flex', height: 'calc(100vh - 200px)' }}>
        <Card
          title="库目录"
          style={{ width: '18%', minWidth: '220px' }}
          bodyStyle={{ padding: '8px', height: '100%', overflow: 'auto' }}
        >
          <Tree
            selectedKeys={selectedTreeKeys}
            defaultExpandAll
            onSelect={handleDatabaseTreeSelect}
            treeData={databaseInstances.map((instance) => ({
              key: `instance:${instance.ip}`,
              title: (
                <div>
                  <div style={{ fontWeight: 'bold' }}>{instance.ip}</div>
                  <Tag color={instance.status === 'online' ? 'green' : 'red'}>
                    {instance.status === 'online' ? '在线' : '离线'}
                  </Tag>
                </div>
              ),
              children: instance.databases.map((database) => ({
                key: `database:${database.id}`,
                title: (
                  <div>
                    <div>{database.name}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      {database.tables.length} 个表 / {database.type}
                    </div>
                  </div>
                ),
              })),
            }))}
          />
        </Card>

        <Card
          title="表目录"
          style={{ width: '18%', minWidth: '220px' }}
          bodyStyle={{ padding: '8px', height: '100%', overflow: 'auto' }}
        >
          {currentInstance ? (
            <List
              dataSource={currentTables}
              renderItem={(table) => (
                <List.Item
                  style={{
                    cursor: 'pointer',
                    backgroundColor:
                      selectedTable?.id === table.id &&
                      selectedTable?.databaseName === table.databaseName
                        ? '#f0f5ff'
                        : 'transparent',
                    padding: '8px',
                    borderRadius: '4px',
                    marginBottom: '4px',
                  }}
                  onClick={() => handleTableSelect(table)}
                >
                  <div style={{ width: '100%' }}>
                    <div style={{ fontWeight: 'bold' }}>{table.name}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>数据库: {table.databaseName}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      行数: {table.rowCount.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      大小: {(table.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                    <Space size="small" style={{ marginTop: '4px' }}>
                      <Tag
                        color={
                          table.status === 'online'
                            ? 'green'
                            : table.status === 'maintenance'
                              ? 'orange'
                              : 'red'
                        }
                      >
                        {table.status === 'online'
                          ? '在线'
                          : table.status === 'maintenance'
                            ? '维护中'
                            : '离线'}
                      </Tag>
                      <Tag
                        color={
                          table.syncStatus === 'success'
                            ? 'green'
                            : table.syncStatus === 'syncing'
                              ? 'blue'
                              : 'red'
                        }
                      >
                        {table.syncStatus === 'success'
                          ? '同步成功'
                          : table.syncStatus === 'syncing'
                            ? '同步中'
                            : '同步失败'}
                      </Tag>
                    </Space>
                  </div>
                </List.Item>
              )}
            />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="请先选择数据资产"
              style={{ marginTop: 48 }}
            />
          )}
        </Card>

        <Card
          title={
            <div>
              字段信息
              {fieldScopeLabel && (
                <Text style={{ marginLeft: 8, fontSize: 14, color: '#666' }}>
                  {fieldScopeLabel}
                </Text>
              )}
            </div>
          }
          style={{ width: '64%', flex: 1 }}
          bodyStyle={{ padding: '8px', height: '100%' }}
        >
          {currentInstance ? (
            <ProTable<FieldListItem>
              actionRef={actionRef}
              rowKey={(record) =>
                `${record.instanceIp}-${record.databaseName}-${record.tableName}-${record.id}`
              }
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
              params={{ scopeKey: fieldScopeKey }}
              toolBarRender={() => [
                <Button key="export" onClick={() => messageApi.info('导出字段数据')}>
                  导出数据
                </Button>,
              ]}
              request={async (params) => {
                const {
                  scopeKey: _scopeKey,
                  databaseName,
                  tableName,
                  fieldName,
                  fieldComment,
                  dataType,
                  dataCategory,
                  dataLevel,
                  isSensitive,
                  isDesensitized,
                  isEncrypted,
                  groupName,
                } = params as Record<string, any>;

                let filteredData = currentFields;

                if (databaseName) {
                  filteredData = filteredData.filter((item) =>
                    item.databaseName.includes(String(databaseName)),
                  );
                }
                if (tableName) {
                  filteredData = filteredData.filter((item) =>
                    item.tableName.includes(String(tableName)),
                  );
                }
                if (fieldName) {
                  filteredData = filteredData.filter((item) =>
                    item.fieldName.includes(String(fieldName)),
                  );
                }
                if (fieldComment) {
                  filteredData = filteredData.filter((item) =>
                    item.fieldComment.includes(String(fieldComment)),
                  );
                }
                if (dataType) {
                  filteredData = filteredData.filter((item) => item.dataType === dataType);
                }
                if (dataCategory) {
                  filteredData = filteredData.filter((item) => item.dataCategory === dataCategory);
                }
                if (dataLevel) {
                  filteredData = filteredData.filter((item) => item.dataLevel === dataLevel);
                }
                if (isSensitive !== undefined) {
                  filteredData = filteredData.filter(
                    (item) => item.isSensitive === (isSensitive === true || isSensitive === 'true'),
                  );
                }
                if (isDesensitized !== undefined) {
                  filteredData = filteredData.filter(
                    (item) =>
                      item.isDesensitized ===
                      (isDesensitized === true || isDesensitized === 'true'),
                  );
                }
                if (isEncrypted !== undefined) {
                  filteredData = filteredData.filter(
                    (item) => item.isEncrypted === (isEncrypted === true || isEncrypted === 'true'),
                  );
                }
                if (groupName) {
                  filteredData = filteredData.filter((item) => item.groupName === groupName);
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
              tableStyle={{ textAlign: 'center' }}
            />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="请先选择数据资产"
              style={{ marginTop: 48 }}
            />
          )}
        </Card>
      </div>
    </PageContainer>
  );
};

export default TableDataList;
