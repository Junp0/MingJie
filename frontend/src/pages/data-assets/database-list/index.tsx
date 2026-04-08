import {
  ApartmentOutlined,
  ClusterOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  EditOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  ReloadOutlined,
  TableOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { useNavigate } from '@umijs/max';
import {
  Button,
  Card,
  Col,
  Dropdown,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Tag,
  Tree,
  Typography,
  message,
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  createAssetGroup as createAssetGroupRecord,
  getAssetGroupPathNames,
  listAssetGroups,
  saveAssetGroups,
  type AssetGroup,
  type AssetGroupFormValues,
} from '@/services/data-assets/assetGroupStore';
import {
  DATA_ASSET_SOURCE_TYPE_OPTIONS,
  deleteDataAsset,
  listDataAssets,
  syncDataAssetGroupName,
  updateDataAsset,
  type DataAssetRecord,
  type UpdateDataAssetValues,
} from '@/services/data-assets/dataAssetStore';

const { Search, TextArea } = Input;
const { Paragraph, Text } = Typography;

interface AssetGroupNode extends AssetGroup {
  children: AssetGroupNode[];
  isVirtualRoot?: boolean;
}

interface DataAssetEditFormValues extends Omit<UpdateDataAssetValues, 'assetGroupName'> {}

type GroupModalMode = 'create-child' | 'edit';

const MAX_GROUP_LEVEL = 4;
const ROOT_GROUP_ID = '__all_asset_groups__';

const DEPARTMENT_OPTIONS = [
  '数据平台部',
  '账号中台部',
  '增长分析部',
  '安全风控部',
  '交易平台部',
  '财务科技部',
  '基础架构部',
];

const SOURCE_TYPE_ENUM: Record<string, { text: string }> = {
  MySQL: { text: 'MySQL' },
  PostgreSQL: { text: 'PostgreSQL' },
  Oracle: { text: 'Oracle' },
  SQLServer: { text: 'SQL Server' },
  MongoDB: { text: 'MongoDB' },
  CSV: { text: 'CSV' },
  JSON: { text: 'JSON' },
  XML: { text: 'XML' },
  REST: { text: 'REST API' },
  Kafka: { text: 'Kafka' },
  RabbitMQ: { text: 'RabbitMQ' },
};

const uniqueArray = (values: string[]) => Array.from(new Set(values));

const getNowText = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const formatNumericValue = (value: number | string | undefined | null) => {
  if (value === 0) {
    return '0';
  }

  if (value === null || value === undefined || value === '') {
    return '-';
  }

  return Number(value).toLocaleString();
};

const getDefaultSelectedGroupId = () => ROOT_GROUP_ID;

const getDefaultExpandedGroupIds = (groups: AssetGroup[] = []) => [
  ROOT_GROUP_ID,
  ...groups.filter((group) => group.parentId === null).map((group) => group.id),
];

const buildGroupTree = (groups: AssetGroup[], parentId: string | null = null): AssetGroupNode[] =>
  groups
    .filter((group) => group.parentId === parentId)
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-Hans-CN'))
    .map((group) => ({
      ...group,
      children: buildGroupTree(groups, group.id),
    }));

const createRootGroupNode = (groups: AssetGroup[]): AssetGroupNode => ({
  id: ROOT_GROUP_ID,
  name: '全部',
  parentId: null,
  level: 0,
  description: '展示全部分组下的数据资产信息。',
  owner: '系统',
  department: '全部分组',
  status: 'active',
  createTime: '',
  updateTime: '',
  databaseCount: 0,
  tableCount: 0,
  fieldCount: 0,
  isVirtualRoot: true,
  children: buildGroupTree(groups),
});

const flattenGroupTree = (nodes: AssetGroupNode[]): AssetGroupNode[] =>
  nodes.flatMap((node) => [node, ...flattenGroupTree(node.children)]);

const filterGroupTree = (nodes: AssetGroupNode[], keyword: string): AssetGroupNode[] =>
  nodes
    .map((node) => {
      const children = filterGroupTree(node.children, keyword);
      const searchText = keyword.trim().toLowerCase();
      const matchedSelf =
        node.isVirtualRoot ||
        !searchText ||
        [node.name, node.description, node.owner, node.department].some((value) =>
          value.toLowerCase().includes(searchText),
        );

      if (!node.isVirtualRoot && !matchedSelf && !children.length) {
        return null;
      }

      return {
        ...node,
        children,
      };
    })
    .filter((node): node is AssetGroupNode => Boolean(node));

const findGroupNodeById = (nodes: AssetGroupNode[], groupId: string): AssetGroupNode | null => {
  for (const node of nodes) {
    if (node.id === groupId) {
      return node;
    }

    const childMatched = findGroupNodeById(node.children, groupId);
    if (childMatched) {
      return childMatched;
    }
  }

  return null;
};

const getDescendantIds = (groups: AssetGroup[], groupId: string): string[] => {
  const childIds = groups.filter((group) => group.parentId === groupId).map((group) => group.id);
  return childIds.flatMap((childId) => [childId, ...getDescendantIds(groups, childId)]);
};

const sumAssetMetrics = (assets: DataAssetRecord[]) =>
  assets.reduce(
    (total, asset) => ({
      assetCount: total.assetCount + 1,
      activeAssetCount:
        total.activeAssetCount +
        (asset.status === 'active' && !asset.isDeleted ? 1 : 0),
      tableCount: total.tableCount + asset.tableCount,
      fieldCount: total.fieldCount + asset.fieldCount,
    }),
    {
      assetCount: 0,
      activeAssetCount: 0,
      tableCount: 0,
      fieldCount: 0,
    },
  );

const buildTreeData = (
  nodes: AssetGroupNode[],
  scopedAssetCountByGroupId: Record<string, number>,
  onCreateChild: (group: AssetGroupNode) => void,
  onEdit: (group: AssetGroupNode) => void,
  onDelete: (group: AssetGroupNode) => void,
): DataNode[] =>
  nodes.map((node) => {
    const scopedCount = scopedAssetCountByGroupId[node.id] ?? 0;
    const actionItems = node.isVirtualRoot
      ? [
          {
            key: 'create',
            icon: <PlusOutlined />,
            label: '新增顶层分组',
          },
        ]
      : [
          {
            key: 'create',
            icon: <PlusOutlined />,
            label: '新增子分组',
          },
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: '编辑分组',
          },
          {
            key: 'delete',
            danger: true,
            icon: <DeleteOutlined />,
            label: '删除分组',
          },
        ];

    return {
      key: node.id,
      title: (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 8,
            width: '100%',
            paddingRight: 4,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <Text strong ellipsis style={{ display: 'block', maxWidth: '100%' }}>
              {node.name}
            </Text>
            <Text
              type="secondary"
              ellipsis
              style={{ display: 'block', maxWidth: '100%', fontSize: 12, marginTop: 4 }}
            >
              {node.isVirtualRoot ? '汇总全部分组资产' : `${node.department}/${node.owner}`}
            </Text>
          </div>
          <Space size={4} style={{ flexShrink: 0, alignSelf: 'flex-start' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 22,
                height: 22,
                paddingInline: 6,
                borderRadius: 999,
                background: '#e6f4ff',
                color: '#1677ff',
                fontSize: 12,
                fontWeight: 600,
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              {scopedCount}
            </span>
            <Dropdown
              trigger={['click']}
              menu={{
                items: actionItems,
                onClick: ({ key, domEvent }) => {
                  domEvent.stopPropagation();
                  if (key === 'create') {
                    onCreateChild(node);
                    return;
                  }
                  if (key === 'edit') {
                    onEdit(node);
                    return;
                  }
                  if (key === 'delete') {
                    onDelete(node);
                  }
                },
              }}
            >
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                style={{ width: 24, height: 24, flexShrink: 0 }}
                onClick={(event) => {
                  event.stopPropagation();
                }}
              />
            </Dropdown>
          </Space>
        </div>
      ),
      children: buildTreeData(
        node.children,
        scopedAssetCountByGroupId,
        onCreateChild,
        onEdit,
        onDelete,
      ),
    };
  });

const DataAssetList: React.FC = () => {
  const actionRef = useRef<ActionType | null>(null);
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<AssetGroupFormValues>();
  const [assetForm] = Form.useForm<DataAssetEditFormValues>();
  const [groups, setGroups] = useState<AssetGroup[]>([]);
  const [assets, setAssets] = useState<DataAssetRecord[]>([]);
  const [treeKeyword, setTreeKeyword] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>(() => getDefaultSelectedGroupId());
  const [expandedKeys, setExpandedKeys] = useState<string[]>(() => getDefaultExpandedGroupIds());
  const [tableVersion, setTableVersion] = useState(0);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupModalMode, setGroupModalMode] = useState<GroupModalMode>('create-child');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [targetParentId, setTargetParentId] = useState<string | null>(null);
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [hideDeletedObjects, setHideDeletedObjects] = useState(true);
  const tableFilterParamsRef = useRef<Record<string, unknown>>({});

  const rootGroupIds = useMemo(
    () => groups.filter((group) => group.parentId === null).map((group) => group.id),
    [groups],
  );
  const defaultExpandedKeys = useMemo(() => [ROOT_GROUP_ID, ...rootGroupIds], [rootGroupIds]);

  useEffect(() => {
    if (!expandedKeys.length && defaultExpandedKeys.length) {
      setExpandedKeys(defaultExpandedKeys);
    }
  }, [defaultExpandedKeys, expandedKeys.length]);

  const groupTree = useMemo(() => [createRootGroupNode(groups)], [groups]);
  const filteredTree = useMemo(() => filterGroupTree(groupTree, treeKeyword), [groupTree, treeKeyword]);
  const flatFilteredGroups = useMemo(() => flattenGroupTree(filteredTree), [filteredTree]);
  const allFilteredKeys = useMemo(
    () => flattenGroupTree(filteredTree).map((group) => group.id),
    [filteredTree],
  );

  useEffect(() => {
    if (!flatFilteredGroups.some((group) => group.id === selectedGroupId)) {
      setSelectedGroupId(flatFilteredGroups[0]?.id ?? '');
    }
  }, [flatFilteredGroups, selectedGroupId]);

  const selectedGroup = useMemo(
    () => (selectedGroupId ? findGroupNodeById(groupTree, selectedGroupId) : null),
    [groupTree, selectedGroupId],
  );

  const selectedGroupScopeIds = useMemo(
    () =>
      !selectedGroup
        ? []
        : selectedGroup.isVirtualRoot
          ? groups.map((group) => group.id)
          : [selectedGroup.id, ...getDescendantIds(groups, selectedGroup.id)],
    [groups, selectedGroup],
  );
  const selectedGroupScopeSet = useMemo(
    () => new Set(selectedGroupScopeIds),
    [selectedGroupScopeIds],
  );

  const selectedScopeAssets = useMemo(
    () => assets.filter((asset) => selectedGroupScopeSet.has(asset.assetGroupId)),
    [assets, selectedGroupScopeSet],
  );
  const visibleSelectedScopeAssets = useMemo(
    () =>
      hideDeletedObjects
        ? selectedScopeAssets.filter((asset) => !asset.isDeleted)
        : selectedScopeAssets,
    [hideDeletedObjects, selectedScopeAssets],
  );
  const selectedAssetMetrics = useMemo(
    () => sumAssetMetrics(visibleSelectedScopeAssets),
    [visibleSelectedScopeAssets],
  );

  const directAssetCountByGroupId = useMemo(
    () =>
      assets.reduce<Record<string, number>>((acc, asset) => {
        acc[asset.assetGroupId] = (acc[asset.assetGroupId] ?? 0) + 1;
        return acc;
      }, {}),
    [assets],
  );

  const scopedAssetCountByGroupId = useMemo(() => {
    const totals: Record<string, number> = {};

    const walk = (node: AssetGroupNode): number => {
      const ownCount = directAssetCountByGroupId[node.id] ?? 0;
      const childCount = node.children.reduce((sum, child) => sum + walk(child), 0);
      const totalCount = ownCount + childCount;
      totals[node.id] = totalCount;
      return totalCount;
    };

    groupTree.forEach((node) => {
      walk(node);
    });

    return totals;
  }, [directAssetCountByGroupId, groupTree]);

  const departmentOptions = useMemo(
    () =>
      uniqueArray([...DEPARTMENT_OPTIONS, ...groups.map((group) => group.department)]).map(
        (department) => ({
          label: department,
          value: department,
        }),
      ),
    [groups],
  );

  const assetGroupPathById = useMemo(
    () =>
      groups.reduce<Record<string, string>>((acc, group) => {
        acc[group.id] = getAssetGroupPathNames(groups, group.id).join(' / ');
        return acc;
      }, {}),
    [groups],
  );
  const assetGroupOptions = useMemo(
    () =>
      Object.entries(assetGroupPathById).map(([value, label]) => ({
        value,
        label,
      })),
    [assetGroupPathById],
  );

  const filterAssetsByParams = (
    dataAssets: DataAssetRecord[],
    params: Record<string, unknown>,
  ) => {
    const { name, sourceType, status, dataLevel, assetGroupId } = params;

    let filteredData = dataAssets;

    if (name) {
      filteredData = filteredData.filter((item) => item.name.includes(String(name)));
    }
    if (sourceType) {
      filteredData = filteredData.filter((item) => item.sourceType === sourceType);
    }
    if (status) {
      filteredData = filteredData.filter((item) => item.status === status);
    }
    if (dataLevel) {
      filteredData = filteredData.filter((item) => item.dataLevel === dataLevel);
    }
    if (assetGroupId) {
      filteredData = filteredData.filter((item) => item.assetGroupId === assetGroupId);
    }

    return filteredData;
  };

  const refreshPageData = async () => {
    const [nextGroups, nextAssets] = await Promise.all([
      listAssetGroups(),
      listDataAssets(),
    ]);
    setGroups(nextGroups);
    setAssets(nextAssets);
    setTableVersion((current) => current + 1);
  };

  useEffect(() => {
    void refreshPageData();
  }, []);

  const closeGroupModal = () => {
    setGroupModalOpen(false);
    setGroupModalMode('create-child');
    setEditingGroupId(null);
    setTargetParentId(null);
    form.resetFields();
  };

  const closeAssetModal = () => {
    setAssetModalOpen(false);
    setEditingAssetId(null);
    assetForm.resetFields();
  };

  const handleRefresh = async () => {
    await refreshPageData();
    setTreeKeyword('');
    setSelectedGroupId(ROOT_GROUP_ID);
    setExpandedKeys(getDefaultExpandedGroupIds());
    messageApi.success('数据资产与分组视图已刷新');
  };

  const openCreateChildModal = (parent: AssetGroupNode) => {
    if (!parent.isVirtualRoot && parent.level >= MAX_GROUP_LEVEL) {
      messageApi.warning(`资产分组最多只支持 ${MAX_GROUP_LEVEL} 级层级`);
      return;
    }

    setGroupModalMode('create-child');
    setEditingGroupId(null);
    setTargetParentId(parent.id);
    setExpandedKeys((current) => uniqueArray([...current, parent.id]));
    setGroupModalOpen(true);
    form.setFieldsValue({
      name: '',
      description: '',
      owner: parent.isVirtualRoot ? '' : parent.owner,
      department: parent.isVirtualRoot
        ? departmentOptions[0]?.value ?? DEPARTMENT_OPTIONS[0]
        : parent.department,
      status: 'active',
    });
  };

  const openEditModal = (group: AssetGroupNode) => {
    setGroupModalMode('edit');
    setEditingGroupId(group.id);
    setTargetParentId(group.parentId);
    setGroupModalOpen(true);
    form.setFieldsValue({
      name: group.name,
      description: group.description,
      owner: group.owner,
      department: group.department,
      status: group.status,
    });
  };

  const handleSubmitGroup = async () => {
    const values = await form.validateFields();

    if (groupModalMode === 'edit' && editingGroupId) {
      const currentGroup = groups.find((group) => group.id === editingGroupId);
      if (!currentGroup) {
        closeGroupModal();
        return;
      }

      const nextGroups = groups.map((group) =>
        group.id === editingGroupId
          ? {
              ...group,
              name: values.name.trim(),
              description: values.description.trim(),
              owner: values.owner.trim(),
              department: values.department,
              status: values.status,
              updateTime: getNowText(),
            }
          : group,
      );

      await saveAssetGroups(nextGroups);
      if (currentGroup.name !== values.name.trim()) {
        await syncDataAssetGroupName();
      }
      await refreshPageData();
      messageApi.success('分组已更新');
    } else {
      const parent =
        targetParentId && targetParentId !== ROOT_GROUP_ID
          ? groups.find((group) => group.id === targetParentId) ?? null
          : null;
      if (parent && parent.level >= MAX_GROUP_LEVEL) {
        messageApi.warning(`资产分组最多只支持 ${MAX_GROUP_LEVEL} 级层级`);
        return;
      }

      const newGroup = await createAssetGroupRecord(values, parent);
      await saveAssetGroups([...groups, newGroup]);
      await refreshPageData();
      setSelectedGroupId(newGroup.id);
      setExpandedKeys((current) =>
        uniqueArray([...current, ...(targetParentId ? [targetParentId] : []), newGroup.id]),
      );
      messageApi.success(groupModalMode === 'create-child' ? '子分组已创建' : '分组已创建');
    }

    closeGroupModal();
  };

  const handleDeleteGroup = (group: AssetGroupNode) => {
    if (group.isVirtualRoot) {
      return;
    }

    const directAssetCount = directAssetCountByGroupId[group.id] ?? 0;

    if (group.children.length) {
      messageApi.warning('请先处理当前分组下的子分组，再删除该分组');
      return;
    }

    if (directAssetCount > 0) {
      messageApi.warning('请先迁移当前分组下的数据资产，再删除该分组');
      return;
    }

    if (group.databaseCount > 0 || group.tableCount > 0 || group.fieldCount > 0) {
      messageApi.warning('仅允许删除未关联任何库表字段的空叶子分组');
      return;
    }

    Modal.confirm({
      title: '确认删除分组',
      content: `确定要删除分组“${group.name}”吗？删除后不可恢复。`,
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        void saveAssetGroups(groups.filter((item) => item.id !== group.id));
        void refreshPageData();
        setSelectedGroupId(group.parentId ?? ROOT_GROUP_ID);
        messageApi.success('分组已删除');
      },
    });
  };

  const handleViewAssetDetail = (record: DataAssetRecord) => {
    const search = new URLSearchParams({
      assetId: record.id,
      assetName: record.name,
    });

    navigate(`/data-overview/table-data-list?${search.toString()}`);
  };

  const handleOpenAssetEdit = (record: DataAssetRecord) => {
    setEditingAssetId(record.id);
    setAssetModalOpen(true);
    assetForm.setFieldsValue({
      name: record.name,
      ipAddress: record.ipAddress,
      port: record.port,
      sourceType: record.sourceType,
      status: record.status,
      dataLevel: record.dataLevel,
      assetGroupId: record.assetGroupId,
      description: record.description,
      tags: record.tags,
      owner: record.owner,
      department: record.department,
    });
  };

  const handleSubmitAssetEdit = async () => {
    if (!editingAssetId) {
      return;
    }

    const values = await assetForm.validateFields();
    const assetGroupName =
      assetGroupPathById[values.assetGroupId] ?? '未分组';
    const updatedAsset = updateDataAsset(editingAssetId, {
      ...values,
      assetGroupName,
    });

    if (!updatedAsset) {
      messageApi.error('未找到要编辑的数据资产');
      return;
    }

    refreshPageData();
    closeAssetModal();
    messageApi.success('数据资产已更新');
  };

  const handleCreateImportTask = () => {
    const search = new URLSearchParams();
    search.set('from', 'asset-list');

    if (selectedGroup && !selectedGroup.isVirtualRoot) {
      search.set('assetGroupId', selectedGroup.id);
    }

    navigate(
      `/data-assets/data-import-form${search.toString() ? `?${search.toString()}` : ''}`,
    );
  };

  const handleExportList = () => {
    const exportData = filterAssetsByParams(
      visibleSelectedScopeAssets,
      tableFilterParamsRef.current,
    );

    if (!exportData.length) {
      messageApi.warning('当前没有可导出的数据资产');
      return;
    }

    const csvHeaders = [
      '资产ID',
      '数据资产名称',
      '接入地址',
      '数据源类型',
      '状态',
      '数据级别',
      '资产分组',
      '表数量',
      '字段数量',
      '记录数',
      '最后同步时间',
      '标签',
      '负责人',
      '所属部门',
      '描述',
    ];

    const escapeCsvValue = (value: string | number | null | undefined) =>
      `"${String(value ?? '').replaceAll('"', '""')}"`;

    const csvRows = exportData.map((item) =>
      [
        item.id,
        item.name,
        `${item.ipAddress}:${item.port}`,
        item.sourceType,
        item.status,
        item.dataLevel,
        assetGroupPathById[item.assetGroupId] ?? item.assetGroupName,
        item.tableCount,
        item.fieldCount,
        item.recordCount,
        item.lastSyncTime,
        item.tags.join('、'),
        item.owner,
        item.department,
        item.description,
      ]
        .map((value) => escapeCsvValue(value))
        .join(','),
    );

    const csvContent = `\uFEFF${[csvHeaders.join(','), ...csvRows].join('\n')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    const fileGroupName = selectedGroup?.name ?? '全部';

    link.href = url;
    link.download = `${fileGroupName}-数据资产清单-${getNowText().replaceAll(/[: ]/g, '-')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    messageApi.success('数据资产清单已导出');
  };

  const columns = useMemo<ProColumns<DataAssetRecord>[]>(
    () => [
      {
        title: '数据资产名称',
        dataIndex: 'name',
        valueType: 'text',
        width: 220,
        render: (_, record) => (
          <div style={{ lineHeight: 1.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span
                style={
                  record.isDeleted
                    ? {
                        textDecoration: 'line-through',
                        color: '#8c8c8c',
                      }
                    : undefined
                }
              >
                {record.name}
              </span>
              {record.isDeleted ? <Tag color="red">已删除</Tag> : null}
            </div>
            <div style={{ color: '#8c8c8c', fontSize: 12 }}>
              {record.ipAddress}:{record.port}
            </div>
          </div>
        ),
      },
      {
        title: '数据源类型',
        dataIndex: 'sourceType',
        valueType: 'select',
        valueEnum: SOURCE_TYPE_ENUM,
        align: 'center',
      },
      {
        title: '状态',
        dataIndex: 'status',
        valueType: 'select',
        valueEnum: {
          active: { text: '活跃', status: 'Success' },
          inactive: { text: '非活跃', status: 'Default' },
          archived: { text: '已归档', status: 'Warning' },
        },
        align: 'center',
        render: (_, record) => {
          const statusMap = {
            active: { color: 'green', text: '活跃' },
            inactive: { color: 'default', text: '非活跃' },
            archived: { color: 'orange', text: '已归档' },
          };
          if (record.isDeleted) {
            return <Tag color="red">已删除</Tag>;
          }
          const status = statusMap[record.status];
          return <Tag color={status.color}>{status.text}</Tag>;
        },
      },
      {
        title: '数据级别',
        dataIndex: 'dataLevel',
        valueType: 'select',
        valueEnum: {
          public: { text: '公开', status: 'Default' },
          internal: { text: '内部', status: 'Processing' },
          confidential: { text: '机密', status: 'Warning' },
          secret: { text: '秘密', status: 'Error' },
        },
        align: 'center',
        render: (_, record) => {
          const levelMap = {
            public: { color: 'default', text: '公开' },
            internal: { color: 'blue', text: '内部' },
            confidential: { color: 'orange', text: '机密' },
            secret: { color: 'red', text: '秘密' },
          };
          const level = levelMap[record.dataLevel];
          return <Tag color={level.color}>{level.text}</Tag>;
        },
      },
      {
        title: '表数量',
        dataIndex: 'tableCount',
        valueType: 'digit',
        search: false,
        align: 'center',
      },
      {
        title: '字段数量',
        dataIndex: 'fieldCount',
        valueType: 'digit',
        search: false,
        align: 'center',
      },
      {
        title: '记录数',
        dataIndex: 'recordCount',
        valueType: 'digit',
        search: false,
        align: 'center',
        render: (text) => formatNumericValue(text as number | string | undefined | null),
      },
      {
        title: '最后同步时间',
        dataIndex: 'lastSyncTime',
        valueType: 'dateTime',
        search: false,
        align: 'center',
        width: 180,
      },
      {
        title: '标签',
        dataIndex: 'tags',
        valueType: 'text',
        search: false,
        width: 220,
        render: (_, record) => (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {record.tags.length ? record.tags.map((tag) => <Tag key={tag}>{tag}</Tag>) : '-'}
          </div>
        ),
      },
      {
        title: '操作',
        dataIndex: 'option',
        valueType: 'option',
        width: 180,
        fixed: 'right',
        align: 'center',
        render: (_, record) => (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              type="link"
              size="small"
              style={{ padding: 0, margin: 0 }}
              onClick={() => handleViewAssetDetail(record)}
            >
              查看详情
            </Button>
            <Button
              type="link"
              size="small"
              style={{ padding: 0, margin: 0 }}
              onClick={() => handleOpenAssetEdit(record)}
            >
              编辑
            </Button>
            <Popconfirm
              title="确认删除该数据资产？"
              description="删除后将同时删除关联的表和字段数据，并取消关联的分类分级任务。"
              onConfirm={async () => {
                try {
                  await deleteDataAsset(record.id);
                  messageApi.success(`已删除数据资产: ${record.name}`);
                  handleRefresh();
                } catch (e: any) {
                  messageApi.error(e?.message || '删除失败');
                }
              }}
              okText="确认删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="link"
                size="small"
                danger
                style={{ padding: 0, margin: 0 }}
              >
                删除
              </Button>
            </Popconfirm>
          </div>
        ),
      },
    ],
    [messageApi],
  );

  const groupModalTitle = {
    'create-child': '新增子分组',
    edit: '编辑分组',
  }[groupModalMode];

  return (
    <PageContainer
      header={{
        title: '数据资产列表',
        subTitle: '资产分组以“全部”为根分组统一展示，左侧树节点支持直接新增、编辑和删除子分组。',
      }}
    >
      {contextHolder}

      <Row gutter={[16, 16]} align="top">
        <Col xs={24} xl={5}>
          <Card
            title="资产分组"
            extra={
              <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
                刷新视图
              </Button>
            }
            bodyStyle={{ paddingBottom: 12 }}
          >
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Statistic title="分组总数" value={groups.length} prefix={<ApartmentOutlined />} />
              </Col>
              <Col span={12}>
                <Statistic title="资产总数" value={assets.length} prefix={<DatabaseOutlined />} />
              </Col>
            </Row>

            <Search
              allowClear
              placeholder="搜索分组名称、描述、负责人或部门"
              value={treeKeyword}
              onChange={(event) => setTreeKeyword(event.target.value)}
              style={{ marginBottom: 12 }}
            />

            <Paragraph type="secondary" style={{ marginBottom: 12 }}>
              根分组“全部”可查看所有资产，分组的新增、编辑、删除入口已收纳到树节点中。
            </Paragraph>

            {filteredTree.length ? (
              <Tree
                showLine
                blockNode
                treeData={buildTreeData(
                  filteredTree,
                  scopedAssetCountByGroupId,
                  openCreateChildModal,
                  openEditModal,
                  handleDeleteGroup,
                )}
                selectedKeys={selectedGroupId ? [selectedGroupId] : []}
                expandedKeys={treeKeyword ? allFilteredKeys : expandedKeys}
                onExpand={(keys) => setExpandedKeys(keys as string[])}
                onSelect={(keys) => {
                  const nextSelectedKey = keys[0];
                  if (typeof nextSelectedKey === 'string') {
                    setSelectedGroupId(nextSelectedKey);
                  }
                }}
              />
            ) : (
              <Empty description="未找到匹配的资产分组" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>

        <Col xs={24} xl={19}>
          {selectedGroup ? (
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Row gutter={[16, 16]}>
                <Col xs={12} md={6}>
                  <Card>
                    <Statistic
                      title="关联资产"
                      value={selectedAssetMetrics.assetCount}
                      prefix={<FolderOpenOutlined />}
                    />
                  </Card>
                </Col>
                <Col xs={12} md={6}>
                  <Card>
                    <Statistic
                      title="活跃资产"
                      value={selectedAssetMetrics.activeAssetCount}
                      prefix={<ClusterOutlined />}
                    />
                  </Card>
                </Col>
                <Col xs={12} md={6}>
                  <Card>
                    <Statistic
                      title="覆盖数据表"
                      value={selectedAssetMetrics.tableCount}
                      prefix={<TableOutlined />}
                    />
                  </Card>
                </Col>
                <Col xs={12} md={6}>
                  <Card>
                    <Statistic
                      title="覆盖字段"
                      value={selectedAssetMetrics.fieldCount}
                      prefix={<DatabaseOutlined />}
                    />
                  </Card>
                </Col>
              </Row>

              <ProTable<DataAssetRecord>
                actionRef={actionRef}
                rowKey="id"
                headerTitle={`${selectedGroup.name} 数据资产`}
                params={{
                  selectedGroupScope: selectedGroupScopeIds.join(','),
                  tableVersion,
                }}
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
                  <Button key="add" type="primary" onClick={handleCreateImportTask}>
                    资产导入
                  </Button>,
                  <Space key="hide-deleted" size={8}>
                    <Text type="secondary">隐藏已删除</Text>
                    <Switch
                      checked={hideDeletedObjects}
                      onChange={(checked) => {
                        setHideDeletedObjects(checked);
                        actionRef.current?.reload();
                      }}
                    />
                  </Space>,
                  <Button key="export" onClick={handleExportList}>
                    导出清单
                  </Button>,
                ]}
                request={async (params) => {
                  tableFilterParamsRef.current = params;

                  const filteredData = filterAssetsByParams(visibleSelectedScopeAssets, params);
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
                scroll={{ x: 1600 }}
              />
            </Space>
          ) : (
            <Card>
              <Empty description="暂无可展示的资产分组" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </Card>
          )}
        </Col>
      </Row>

      <Modal
        destroyOnClose
        open={groupModalOpen}
        title={groupModalTitle}
        okText={groupModalMode === 'edit' ? '保存分组' : '创建分组'}
        cancelText="取消"
        onCancel={closeGroupModal}
        onOk={() => {
          void handleSubmitGroup();
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="分组名称"
            name="name"
            rules={[
              { required: true, message: '请输入分组名称' },
              { max: 30, message: '分组名称不能超过 30 个字符' },
            ]}
          >
            <Input placeholder="请输入分组名称" />
          </Form.Item>

          <Form.Item
            label="分组描述"
            name="description"
            rules={[
              { required: true, message: '请输入分组描述' },
              { max: 200, message: '分组描述不能超过 200 个字符' },
            ]}
          >
            <TextArea rows={4} placeholder="请输入分组描述" showCount maxLength={200} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="负责人"
                name="owner"
                rules={[
                  { required: true, message: '请输入负责人' },
                  { max: 20, message: '负责人名称不能超过 20 个字符' },
                ]}
              >
                <Input placeholder="请输入负责人" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="归属部门" name="department" rules={[{ required: true, message: '请选择归属部门' }]}>
                <Select options={departmentOptions} placeholder="请选择归属部门" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="分组状态" name="status" rules={[{ required: true, message: '请选择分组状态' }]}>
            <Select
              placeholder="请选择分组状态"
              options={[
                { label: '启用', value: 'active' },
                { label: '停用', value: 'inactive' },
                { label: '归档', value: 'archived' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        destroyOnClose
        open={assetModalOpen}
        title="编辑数据资产"
        okText="保存"
        cancelText="取消"
        onCancel={closeAssetModal}
        onOk={() => {
          void handleSubmitAssetEdit();
        }}
      >
        <Form form={assetForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="数据资产名称"
                name="name"
                rules={[{ required: true, message: '请输入数据资产名称' }]}
              >
                <Input placeholder="请输入数据资产名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="数据源类型"
                name="sourceType"
                rules={[{ required: true, message: '请选择数据源类型' }]}
              >
                <Select options={DATA_ASSET_SOURCE_TYPE_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="IP 地址"
                name="ipAddress"
                rules={[{ required: true, message: '请输入 IP 地址' }]}
              >
                <Input placeholder="请输入 IP 地址" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="端口"
                name="port"
                rules={[{ required: true, message: '请输入端口' }]}
              >
                <InputNumber min={0} max={65535} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="资产状态"
                name="status"
                rules={[{ required: true, message: '请选择资产状态' }]}
              >
                <Select
                  options={[
                    { label: '活跃', value: 'active' },
                    { label: '非活跃', value: 'inactive' },
                    { label: '已归档', value: 'archived' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="数据级别"
                name="dataLevel"
                rules={[{ required: true, message: '请选择数据级别' }]}
              >
                <Select
                  options={[
                    { label: '公开', value: 'public' },
                    { label: '内部', value: 'internal' },
                    { label: '机密', value: 'confidential' },
                    { label: '秘密', value: 'secret' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="资产分组"
            name="assetGroupId"
            rules={[{ required: true, message: '请选择资产分组' }]}
          >
            <Select showSearch optionFilterProp="label" options={assetGroupOptions} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="负责人"
                name="owner"
                rules={[{ required: true, message: '请输入负责人' }]}
              >
                <Input placeholder="请输入负责人" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="所属部门"
                name="department"
                rules={[{ required: true, message: '请输入所属部门' }]}
              >
                <Input placeholder="请输入所属部门" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="标签" name="tags">
            <Select mode="tags" tokenSeparators={[',', '，']} placeholder="请输入或选择标签" />
          </Form.Item>

          <Form.Item label="描述" name="description">
            <TextArea rows={4} maxLength={300} showCount placeholder="请输入资产描述" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default DataAssetList;
