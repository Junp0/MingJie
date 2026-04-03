import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { useLocation } from '@umijs/max';
import { Button, Card, Drawer, Empty, List, Space, Switch, Table, Tag, Tree, Typography, message } from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  listDatabaseInstances,
} from '@/services/data-overview/overviewStore';
import {
  buildSampleDataItems,
  createFieldDisplayColumns,
  sampleColumns,
  type OverviewFieldDisplayRecord,
  type SampleDataItem,
} from '../shared/fieldDisplay';

const { Text } = Typography;

interface DatabaseInstance {
  ip: string;
  port: number;
  status: 'online' | 'offline';
  databases: DatabaseItem[];
}

interface DatabaseItem {
  id: string;
  assetId: string;
  assetName: string;
  name: string;
  port: number;
  type: string;
  status: 'online' | 'offline';
  isDeleted: boolean;
  tables: TableItem[];
}

interface TableItem {
  id: string;
  name: string;
  databaseId: string;
  assetName: string;
  port: number;
  rowCount: number;
  size: number;
  status: 'online' | 'offline' | 'maintenance';
  lastSyncTime: string;
  syncStatus: 'success' | 'failed' | 'syncing';
  isDeleted: boolean;
  fields: FieldItem[];
}

interface FieldItem {
  id: string;
  fieldName: string;
  fieldComment: string;
  fieldTable: string;
  dataType: string;
  dataCategory: OverviewFieldDisplayRecord['dataCategory'];
  dataTypeName: string;
  classificationPathNames: string[];
  dataLevel: OverviewFieldDisplayRecord['dataLevel'];
  levelCode: OverviewFieldDisplayRecord['levelCode'];
  isSensitive: boolean;
  maskingStatus: OverviewFieldDisplayRecord['maskingStatus'];
  encryptionStatus: OverviewFieldDisplayRecord['encryptionStatus'];
  groupName: string;
  rootGroupName: string;
  assetGroupPathNames: string[];
  sampleData: string[];
  updateTime: string;
  isDeleted: boolean;
  tableIsDeleted: boolean;
  databaseIsDeleted: boolean;
}

interface TableListItem extends TableItem {
  databaseName: string;
  instanceIp: string;
  databaseIsDeleted: boolean;
}

interface FieldListItem extends FieldItem {
  assetName: string;
  databaseName: string;
  tableName: string;
  port: number;
  instanceIp: string;
  fieldTable: string;
}

const getDatabaseFieldSummary = (database: DatabaseItem) => {
  const activeTables = database.tables.filter((table) => !table.isDeleted);
  const allFields = activeTables.flatMap((table) =>
    table.fields.filter((field) => !field.isDeleted),
  );
  const levelCounter = {
    public: 0,
    internal: 0,
    confidential: 0,
    secret: 0,
    unknown: 0,
  };

  allFields.forEach((field) => {
    if (field.dataLevel === 'public') {
      levelCounter.public += 1;
    } else if (field.dataLevel === 'internal') {
      levelCounter.internal += 1;
    } else if (field.dataLevel === 'confidential') {
      levelCounter.confidential += 1;
    } else if (field.dataLevel === 'secret') {
      levelCounter.secret += 1;
    } else {
      levelCounter.unknown += 1;
    }
  });

  return {
    tableCount: activeTables.length,
    fieldCount: allFields.length,
    levelCounter,
  };
};

const LEVEL_COUNT_TAGS: Array<{
  key: keyof ReturnType<typeof getDatabaseFieldSummary>["levelCounter"];
  label: string;
  color: string;
}> = [
  { key: "public", label: "公开", color: "green" },
  { key: "internal", label: "内部", color: "blue" },
  { key: "confidential", label: "敏感", color: "orange" },
  { key: "secret", label: "核心", color: "red" },
  { key: "unknown", label: "未分级", color: "default" },
];

const renderDeletedText = (value: string, deleted: boolean) => (
  <Text delete={deleted} type={deleted ? 'secondary' : undefined}>
    {value}
  </Text>
);

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

const TableDataList: React.FC = () => {
  const actionRef = useRef<ActionType | null>(null);
  const location = useLocation();
  const [messageApi, contextHolder] = message.useMessage();
  const [selectedDatabaseInstance, setSelectedDatabaseInstance] = useState<string | null>(null);
  const [selectedDatabaseId, setSelectedDatabaseId] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<TableListItem | null>(null);
  const [databaseInstances, setDatabaseInstances] = useState<DatabaseInstance[]>([]);
  const [sampleDrawerVisible, setSampleDrawerVisible] = useState(false);
  const [currentSampleData, setCurrentSampleData] = useState<SampleDataItem[]>([]);
  const [currentFieldName, setCurrentFieldName] = useState('');
  const [hideDeletedObjects, setHideDeletedObjects] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadDatabaseInstances = async () => {
      const assets = await listDatabaseInstances();
      if (!cancelled) {
        setDatabaseInstances(assets as DatabaseInstance[]);
      }
    };

    void loadDatabaseInstances();

    return () => {
      cancelled = true;
    };
  }, []);

  const databaseMap = useMemo(() => {
    const entries: Array<
      [string, { instanceKey: string; instanceIp: string; instancePort: number; database: DatabaseItem }]
    > = [];

    databaseInstances.forEach((instance) => {
      instance.databases.forEach((database) => {
        entries.push([
          database.id,
          {
            instanceKey: `${instance.ip}:${instance.port}`,
            instanceIp: instance.ip,
            instancePort: instance.port,
            database,
          },
        ]);
      });
    });

    return new Map(entries);
  }, [databaseInstances]);

  const visibleDatabaseInstances = useMemo(
    () =>
      hideDeletedObjects
        ? databaseInstances
            .map((instance) => ({
              ...instance,
              databases: instance.databases
                .filter((database) => !database.isDeleted)
                .map((database) => ({
                  ...database,
                  tables: database.tables
                    .filter((table) => !table.isDeleted)
                    .map((table) => ({
                      ...table,
                      fields: table.fields.filter((field) => !field.isDeleted),
                    })),
                }))
                .filter((database) => database.tables.length > 0),
            }))
            .filter((instance) => instance.databases.length > 0)
        : databaseInstances,
    [databaseInstances, hideDeletedObjects],
  );

  const showSampleData = (record: FieldListItem) => {
    setCurrentSampleData(buildSampleDataItems(record.sampleData, record.updateTime));
    setCurrentFieldName(record.fieldName);
    setSampleDrawerVisible(true);
  };

  const fieldColumns: ProColumns<FieldListItem>[] = createFieldDisplayColumns(showSampleData);

  const handleTableSelect = (table: TableListItem | null) => {
    setSelectedTable(table);
  };

  const handleDatabaseTreeSelect = (selectedKeys: React.Key[]) => {
    const selectedKey = String(selectedKeys[0] ?? '');

    if (!selectedKey) {
      return;
    }

    if (selectedKey.startsWith('instance:')) {
      const instanceKey = selectedKey.replace('instance:', '');
      setSelectedDatabaseInstance(instanceKey);
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

      setSelectedDatabaseInstance(matched.instanceKey);
      setSelectedDatabaseId(databaseId);
      setSelectedTable(null);
    }
  };

  const getCurrentInstance = () =>
    databaseInstances.find(
      (instance) => `${instance.ip}:${instance.port}` === selectedDatabaseInstance
    ) ?? null;

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
        assetName: currentDatabase.assetName,
        port: currentDatabase.port,
        databaseName: currentDatabase.name,
        instanceIp: currentInstance.ip,
        databaseIsDeleted: currentDatabase.isDeleted,
      }));
    }

    return currentInstance.databases.flatMap((database) =>
      database.tables.map((table) => ({
        ...table,
        assetName: database.assetName,
        port: database.port,
        databaseName: database.name,
        instanceIp: currentInstance.ip,
        databaseIsDeleted: database.isDeleted,
      })),
    );
  }, [currentDatabase, currentInstance]);

  const currentFields = useMemo<FieldListItem[]>(() => {
    if (selectedTable) {
      return selectedTable.fields.map((field) => ({
        ...field,
        assetName: selectedTable.assetName,
        databaseName: selectedTable.databaseName,
        tableName: selectedTable.name,
        port: selectedTable.port,
        instanceIp: selectedTable.instanceIp,
        fieldTable: selectedTable.name,
      }));
    }

    if (!currentInstance) {
      return [];
    }

    if (currentDatabase) {
      return currentDatabase.tables.flatMap((table) =>
        table.fields.map((field) => ({
          ...field,
          assetName: currentDatabase.assetName,
          databaseName: currentDatabase.name,
          tableName: table.name,
          port: currentDatabase.port,
          instanceIp: currentInstance.ip,
          fieldTable: table.name,
        })),
      );
    }

    return currentInstance.databases.flatMap((database) =>
      database.tables.flatMap((table) =>
        table.fields.map((field) => ({
          ...field,
          assetName: database.assetName,
          databaseName: database.name,
          tableName: table.name,
          port: database.port,
          instanceIp: currentInstance.ip,
          fieldTable: table.name,
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

    setSelectedDatabaseInstance(matched.instanceKey);
    setSelectedDatabaseId(matched.database.id);
    setSelectedTable(null);
  }, [databaseMap, location.search, messageApi]);

  const selectedTreeKeys = selectedDatabaseId
    ? [`database:${selectedDatabaseId}`]
    : selectedDatabaseInstance
      ? [`instance:${selectedDatabaseInstance}`]
      : [];
  const fieldScopeLabel = selectedTable
    ? `${selectedTable.assetName} (${selectedTable.instanceIp}:${selectedTable.port}) / ${selectedTable.databaseName} / ${selectedTable.name}`
    : currentDatabase
      ? `${currentDatabase.assetName} (${currentInstance?.ip ?? ''}:${currentInstance?.port ?? currentDatabase.port}) / ${currentDatabase.name}`
      : currentInstance
        ? `数据库实例 ${currentInstance.ip}:${currentInstance.port}`
        : '';
  const fieldScopeKey = selectedTable
    ? `table:${selectedTable.instanceIp}:${selectedTable.port}:${selectedTable.databaseName}:${selectedTable.id}`
    : currentDatabase
      ? `database:${currentInstance?.ip ?? ''}:${currentInstance?.port ?? currentDatabase.port}:${currentDatabase.id}`
      : currentInstance
        ? `instance:${currentInstance.ip}:${currentInstance.port}`
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
            treeData={visibleDatabaseInstances.map((instance) => ({
              key: `instance:${instance.ip}:${instance.port}`,
              title: (
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 'bold' }}>
                      {instance.databases.length === 1
                        ? renderDeletedText(
                            instance.databases[0]?.assetName ?? `${instance.ip}:${instance.port}`,
                            instance.databases[0]?.isDeleted ?? false,
                          )
                        : `${instance.databases[0]?.assetName ?? '数据资产'} 等${instance.databases.length}个资产`}
                    </span>
                    <span style={{ fontSize: 12, color: '#999' }}>
                      {instance.ip}:{instance.port}
                    </span>
                  </div>
                  <Tag color={instance.status === 'online' ? 'green' : 'red'}>
                    {instance.status === 'online' ? '在线' : '离线'}
                  </Tag>
                </div>
              ),
              children: instance.databases.map((database) => ({
                key: `database:${database.id}`,
                title: (
                  <div>
                    <div style={{ fontWeight: 'bold' }}>
                      {renderDeletedText(database.name, database.isDeleted)}
                    </div>
                    {(() => {
                      const summary = getDatabaseFieldSummary(database);
                      return (
                        <>
                          <div style={{ fontSize: 12, color: '#666' }}>
                            {summary.tableCount} 个表 / {summary.fieldCount} 个字段
                          </div>
                          <Space
                            size={[4, 4]}
                            wrap
                            style={{ marginTop: 4 }}
                          >
                            {LEVEL_COUNT_TAGS.filter(
                              ({ key }) => summary.levelCounter[key] > 0
                            ).map(({ key, label, color }) => (
                              <Tag
                                key={key}
                                color={color}
                                style={{ marginInlineEnd: 0 }}
                              >
                                {label} {summary.levelCounter[key]}
                              </Tag>
                            ))}
                          </Space>
                        </>
                      );
                    })()}
                  </div>
                ),
              })),
            }))}
          />
        </Card>

        <Card
          title="表目录"
          extra={
            <Space size={8}>
              <Text type="secondary">隐藏已删除</Text>
              <Switch
                checked={hideDeletedObjects}
                onChange={(checked) => {
                  setHideDeletedObjects(checked);
                  actionRef.current?.reload();
                }}
              />
            </Space>
          }
          style={{ width: '18%', minWidth: '220px' }}
          bodyStyle={{ padding: '8px', height: '100%', overflow: 'auto' }}
        >
          {currentInstance ? (
            <List
              dataSource={
                hideDeletedObjects
                  ? currentTables.filter((table) => !table.isDeleted)
                  : currentTables
              }
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
                    <div style={{ fontWeight: 'bold' }}>
                      {renderDeletedText(table.name, table.isDeleted)}
                    </div>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      数据库: {renderDeletedText(table.databaseName, table.databaseIsDeleted)}
                    </div>
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
                        {table.isDeleted
                          ? '已删除'
                          : table.status === 'online'
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
                `${record.instanceIp}-${record.port}-${record.databaseName}-${record.tableName}-${record.id}`
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
                  dataTypeName,
                  dataLevel,
                  isSensitive,
                  maskingStatus,
                  encryptionStatus,
                  rootGroupName,
                } = params as Record<string, any>;

                let filteredData = hideDeletedObjects
                  ? currentFields.filter((item) => !item.isDeleted)
                  : currentFields;

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
                if (dataTypeName) {
                  filteredData = filteredData.filter((item) =>
                    item.dataTypeName.includes(String(dataTypeName)),
                  );
                }
                if (dataLevel) {
                  filteredData = filteredData.filter((item) => item.dataLevel === dataLevel);
                }
                if (isSensitive !== undefined) {
                  filteredData = filteredData.filter(
                    (item) => item.isSensitive === (isSensitive === true || isSensitive === 'true'),
                  );
                }
                if (maskingStatus) {
                  filteredData = filteredData.filter(
                    (item) => item.maskingStatus === maskingStatus,
                  );
                }
                if (encryptionStatus) {
                  filteredData = filteredData.filter(
                    (item) => item.encryptionStatus === encryptionStatus,
                  );
                }
                if (rootGroupName) {
                  filteredData = filteredData.filter((item) =>
                    item.rootGroupName.includes(String(rootGroupName)),
                  );
                }

                return {
                  data: filteredData,
                  success: true,
                  total: filteredData.length,
                };
              }}
              columns={fieldColumns}
              columnsState={{
                defaultValue: {
                  databaseName: { show: false },
                  tableName: { show: false },
                },
              }}
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

export default TableDataList;
