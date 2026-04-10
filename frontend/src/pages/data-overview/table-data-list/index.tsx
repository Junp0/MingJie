import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { useLocation } from '@umijs/max';
import { Button, Card, Drawer, Empty, Space, Switch, Table, Tag, Tree, Typography, message } from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import './index.less';
import {
  getDefaultLevelDefinitions,
  listClassificationTemplateRecords,
  type LevelDefinitionItem,
} from '@/services/data-classification/templateStore';
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
  const levelCounter: Record<string, number> = {};

  allFields.forEach((field) => {
    if (field.levelCode) {
      levelCounter[field.levelCode] = (levelCounter[field.levelCode] ?? 0) + 1;
    }
  });

  return {
    tableCount: activeTables.length,
    fieldCount: allFields.length,
    levelCounter,
  };
};

const renderDeletedText = (value: string, deleted: boolean) => (
  <Text delete={deleted} type={deleted ? 'secondary' : undefined}>
    {value}
  </Text>
);

const renderCompactStatus = (status: 'online' | 'offline') => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: 20,
      minWidth: 76,
      padding: '0 8px',
      borderRadius: 999,
      border: `1px solid ${status === 'online' ? '#9dde6f' : '#d9d9d9'}`,
      color: status === 'online' ? '#389e0d' : '#8c8c8c',
      background: '#fff',
      fontSize: 10,
      fontWeight: 700,
      lineHeight: 1,
      whiteSpace: 'nowrap',
    }}
  >
    {status === 'online' ? '在线' : '离线'}
  </span>
);

const renderCompactSyncStatus = (status: 'success' | 'failed' | 'syncing') => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: 20,
      minWidth: 76,
      padding: '0 8px',
      borderRadius: 999,
      border: `1px solid ${
        status === 'success' ? '#9dde6f' : status === 'syncing' ? '#91caff' : '#ffb3b3'
      }`,
      color: status === 'success' ? '#389e0d' : status === 'syncing' ? '#1677ff' : '#cf1322',
      background: '#fff',
      fontSize: 10,
      fontWeight: 700,
      lineHeight: 1,
      whiteSpace: 'nowrap',
    }}
  >
    {status === 'success' ? '同步成功' : status === 'syncing' ? '同步中' : '同步失败'}
  </span>
);

const getInstanceSyncStatus = (instance: DatabaseInstance): 'success' | 'failed' | 'syncing' => {
  const tableStatuses = instance.databases.flatMap((database) =>
    database.tables
      .filter((table) => !table.isDeleted)
      .map((table) => table.syncStatus),
  );

  if (tableStatuses.includes('syncing')) {
    return 'syncing';
  }

  if (tableStatuses.includes('failed')) {
    return 'failed';
  }

  return 'success';
};

const getCompactSensitiveLabel = (value: string) => value.trim().slice(0, 2) || value;

const renderSensitiveLevelPill = (
  label: string,
  count: number,
  color: string,
) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 20,
      minWidth: 76,
      padding: '0 8px',
      borderRadius: 999,
      border: `1px solid ${color}66`,
      color,
      background: '#fff',
      fontSize: 10,
      fontWeight: 700,
      lineHeight: 1,
      whiteSpace: 'nowrap',
      textAlign: 'center',
      verticalAlign: 'middle',
      boxSizing: 'border-box',
    }}
  >
    <span>{label}</span>
    <span>{count}</span>
  </span>
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
  const [expandedTreeKeys, setExpandedTreeKeys] = useState<React.Key[]>([]);
  const [selectedTable, setSelectedTable] = useState<TableListItem | null>(null);
  const [sensitiveLevels, setSensitiveLevels] = useState<LevelDefinitionItem[]>(
    getDefaultLevelDefinitions().filter((item) => item.isSensitive).slice(0, 3),
  );
  const [databaseInstances, setDatabaseInstances] = useState<DatabaseInstance[]>([]);
  const [sampleDrawerVisible, setSampleDrawerVisible] = useState(false);
  const [currentSampleData, setCurrentSampleData] = useState<SampleDataItem[]>([]);
  const [currentFieldName, setCurrentFieldName] = useState('');
  const [hideDeletedObjects, setHideDeletedObjects] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadPageData = async () => {
      const [assets, templates] = await Promise.all([
        listDatabaseInstances(),
        listClassificationTemplateRecords().catch(() => []),
      ]);

      if (cancelled) {
        return;
      }

      setDatabaseInstances(assets as DatabaseInstance[]);

      const activeTemplate =
        templates.find((template) => template.status === 'active') ?? templates[0] ?? null;
      const nextSensitiveLevels =
        activeTemplate?.levelDefinitions.filter((item) => item.isSensitive).slice(0, 3) ??
        getDefaultLevelDefinitions().filter((item) => item.isSensitive).slice(0, 3);
      setSensitiveLevels(nextSensitiveLevels);
    };

    void loadPageData();

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

  const toggleInstanceExpand = (instanceKey: string) => {
    const treeKey = `instance:${instanceKey}`;
    setExpandedTreeKeys((current) =>
      current.includes(treeKey)
        ? current.filter((key) => key !== treeKey)
        : [...current, treeKey],
    );
    setSelectedDatabaseInstance(null);
    setSelectedDatabaseId(null);
    setSelectedTable(null);
  };

  const selectDatabase = (databaseId: string) => {
    const matched = databaseMap.get(databaseId);

    if (!matched) {
      return;
    }

    const treeKey = `instance:${matched.instanceKey}`;
    setExpandedTreeKeys((current) =>
      current.includes(treeKey) ? current : [...current, treeKey],
    );
    setSelectedDatabaseInstance(matched.instanceKey);
    setSelectedDatabaseId(databaseId);
    setSelectedTable(null);
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
    if (currentDatabase && currentInstance) {
      return currentDatabase.tables.map((table) => ({
        ...table,
        assetName: currentDatabase.assetName,
        port: currentDatabase.port,
        databaseName: currentDatabase.name,
        instanceIp: currentInstance.ip,
        databaseIsDeleted: currentDatabase.isDeleted,
      }));
    }

    return databaseInstances.flatMap((instance) =>
      instance.databases.flatMap((database) =>
        database.tables.map((table) => ({
          ...table,
          assetName: database.assetName,
          port: database.port,
          databaseName: database.name,
          instanceIp: instance.ip,
          databaseIsDeleted: database.isDeleted,
        })),
      ),
    );
  }, [currentDatabase, currentInstance, databaseInstances]);

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

    if (currentDatabase && currentInstance) {
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

    return databaseInstances.flatMap((instance) =>
      instance.databases.flatMap((database) =>
        database.tables.flatMap((table) =>
          table.fields.map((field) => ({
            ...field,
            assetName: database.assetName,
            databaseName: database.name,
            tableName: table.name,
            port: database.port,
            instanceIp: instance.ip,
            fieldTable: table.name,
          })),
        ),
      ),
    );
  }, [currentDatabase, currentInstance, selectedTable, databaseInstances]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const assetId = params.get('assetId');

    if (!assetId) {
      if (!selectedDatabaseId && !selectedDatabaseInstance) {
        const firstInstance = databaseInstances[0];
        const firstDatabase = firstInstance?.databases[0];

        if (firstInstance && firstDatabase) {
          const instanceKey = `${firstInstance.ip}:${firstInstance.port}`;
          setExpandedTreeKeys((current) =>
            current.includes(`instance:${instanceKey}`)
              ? current
              : [...current, `instance:${instanceKey}`],
          );
          setSelectedDatabaseInstance(instanceKey);
          setSelectedDatabaseId(firstDatabase.id);
          setSelectedTable(null);
        }
      }
      return;
    }

    const matched = databaseMap.get(assetId);
    if (!matched) {
      messageApi.warning('未在库表数据列表中找到对应的数据资产');
      return;
    }

    setSelectedDatabaseInstance(matched.instanceKey);
    setSelectedDatabaseId(matched.database.id);
    setExpandedTreeKeys((current) =>
      current.includes(`instance:${matched.instanceKey}`)
        ? current
        : [...current, `instance:${matched.instanceKey}`],
    );
    setSelectedTable(null);
  }, [
    databaseInstances,
    databaseMap,
    location.search,
    messageApi,
    selectedDatabaseId,
    selectedDatabaseInstance,
  ]);

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
    <PageContainer className="nothingPage tableDataPage" title="Table Data List" subTitle="按实例、数据库和数据表层级查看当前纳管结构与字段详情。">
      {contextHolder}
      <div className="tableDataLayout">
        <section className="tableSidePanel" style={{ width: '18%', minWidth: '220px' }}>
          <div className="tableSidePanelHeader">库目录</div>
          <div className="tableSidePanelBody">
          <Tree
            className="databaseTree"
            selectable={false}
            expandedKeys={expandedTreeKeys}
            onExpand={(keys) => setExpandedTreeKeys(keys)}
            treeData={visibleDatabaseInstances.map((instance) => ({
              key: `instance:${instance.ip}:${instance.port}`,
              title: (
                <div
                  style={{
                    padding: '6px 10px',
                    borderRadius: 14,
                    cursor: 'pointer',
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleInstanceExpand(`${instance.ip}:${instance.port}`);
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0, flex: 1 }}>
                      <span style={{ fontWeight: 'bold', fontSize: 13, lineHeight: 1.3 }}>
                        {instance.databases.length === 1
                          ? renderDeletedText(
                              instance.databases[0]?.assetName ?? `${instance.ip}:${instance.port}`,
                              instance.databases[0]?.isDeleted ?? false,
                            )
                          : `${instance.databases[0]?.assetName ?? '数据资产'} 等${instance.databases.length}个资产`}
                      </span>
                      <span style={{ fontSize: 11, color: '#999', lineHeight: 1.3 }}>
                        {instance.ip}:{instance.port}
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      display: 'flex',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    {renderCompactStatus(instance.status)}
                    {renderCompactSyncStatus(getInstanceSyncStatus(instance))}
                  </div>
                </div>
              ),
              children: instance.databases.map((database) => ({
                key: `database:${database.id}`,
                title: (
                  <div
                    style={{
                      padding: '8px 10px',
                      borderRadius: 14,
                      background:
                        selectedDatabaseId === database.id
                          ? 'rgba(255, 255, 255, 0.96)'
                          : 'transparent',
                      border:
                        selectedDatabaseId === database.id
                          ? '1px solid var(--nd-border-visible)'
                          : '1px solid transparent',
                      transition: 'background-color 0.2s ease, border-color 0.2s ease',
                      cursor: 'pointer',
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      selectDatabase(database.id);
                    }}
                  >
                    <div style={{ fontWeight: 'bold', fontSize: 12, lineHeight: 1.35 }}>
                      {renderDeletedText(database.name, database.isDeleted)}
                    </div>
                    {(() => {
                      const summary = getDatabaseFieldSummary(database);
                      return (
                        <>
                          <div style={{ fontSize: 11, color: '#666', marginTop: 2, lineHeight: 1.35 }}>
                            {summary.tableCount} 个表 / {summary.fieldCount} 个字段
                          </div>
                          <Space
                            size={[4, 4]}
                            wrap
                            style={{ marginTop: 4 }}
                          >
                            {sensitiveLevels.filter(
                              (level) => (summary.levelCounter[level.code] ?? 0) > 0,
                            ).map((level) => (
                              <span key={level.code} style={{ marginInlineEnd: 0 }}>
                                {renderSensitiveLevelPill(
                                  getCompactSensitiveLabel(level.name),
                                  summary.levelCounter[level.code],
                                  level.color,
                                )}
                              </span>
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
          </div>
        </section>

        <section className="tableSidePanel" style={{ width: '18%', minWidth: '220px' }}>
          <div className="tableSidePanelHeader">
            <span>表目录</span>
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
          </div>
          <div className="tableSidePanelBody tableCatalogScroll">
            {currentInstance ? (
              <div className="tableCatalogList">
                {(hideDeletedObjects
                  ? currentTables.filter((table) => !table.isDeleted)
                  : currentTables
                ).map((table) => (
                  <div
                    key={`${table.databaseName}-${table.id}`}
                    className="tableCatalogItem"
                    style={{
                      cursor: 'pointer',
                      backgroundColor:
                        selectedTable?.id === table.id &&
                        selectedTable?.databaseName === table.databaseName
                          ? '#f3f3f3'
                          : 'transparent',
                      padding: '8px 10px',
                      borderRadius: '12px',
                      marginBottom: '4px',
                    }}
                    onClick={() => handleTableSelect(table)}
                  >
                    <div style={{ width: '100%' }}>
                      <div style={{ fontWeight: 'bold', fontSize: 12, lineHeight: 1.35 }}>
                        {renderDeletedText(table.name, table.isDeleted)}
                      </div>
                      <div style={{ fontSize: 11, color: '#666', lineHeight: 1.35, marginTop: 2 }}>
                        数据库: {renderDeletedText(table.databaseName, table.databaseIsDeleted)}
                      </div>
                      <div style={{ fontSize: 11, color: '#666', lineHeight: 1.35 }}>
                        行数: {table.rowCount.toLocaleString()}
                      </div>
                      <div style={{ fontSize: 11, color: '#666', lineHeight: 1.35 }}>
                        大小: {(table.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                      {(table.isDeleted ||
                        table.status !== 'online' ||
                        table.syncStatus !== 'success') && (
                        <Space size={6} style={{ marginTop: '6px' }} wrap>
                          {(table.isDeleted || table.status !== 'online') &&
                            renderCompactStatus('offline')}
                          {table.syncStatus !== 'success' &&
                            renderCompactSyncStatus(table.syncStatus)}
                        </Space>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="请先选择数据资产"
                style={{ marginTop: 48 }}
              />
            )}
          </div>
        </section>

        <Card
          className="tableDataPanel"
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
          bodyStyle={{ padding: '8px', overflow: 'auto' }}
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
