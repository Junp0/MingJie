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
import { PageContainer } from '@ant-design/pro-components';
import {
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Tree,
  Typography,
  message,
} from 'antd';
import type { DataNode, TreeProps } from 'antd/es/tree';
import React, { useEffect, useMemo, useState } from 'react';
import {
  createAssetGroup as createAssetGroupRecord,
  listAssetGroups,
  resetAssetGroups,
  saveAssetGroups,
} from '@/services/data-assets/assetGroupStore';

const { Search, TextArea } = Input;
const { Paragraph, Text, Title } = Typography;

interface AssetGroup {
  id: string;
  name: string;
  parentId: string | null;
  level: number;
  description: string;
  owner: string;
  department: string;
  status: 'active' | 'inactive' | 'archived';
  createTime: string;
  updateTime: string;
  databaseCount: number;
  tableCount: number;
  fieldCount: number;
}

interface AssetGroupNode extends AssetGroup {
  children: AssetGroupNode[];
}

interface AssetGroupFormValues {
  name: string;
  description: string;
  owner: string;
  department: string;
  status: AssetGroup['status'];
}

type GroupModalMode = 'create-root' | 'create-child' | 'edit';

const LEVEL_META: Record<number, { label: string; color: string }> = {
  1: { label: '一级分组', color: 'red' },
  2: { label: '二级分组', color: 'gold' },
  3: { label: '三级分组', color: 'blue' },
  4: { label: '四级分组', color: 'purple' },
};

const MAX_GROUP_LEVEL = 4;

const STATUS_META: Record<AssetGroup['status'], { label: string; color: string }> = {
  active: { label: '启用', color: 'success' },
  inactive: { label: '停用', color: 'default' },
  archived: { label: '归档', color: 'error' },
};

const DEPARTMENT_OPTIONS = [
  '数据平台部',
  '账号中台部',
  '增长分析部',
  '安全风控部',
  '交易平台部',
  '财务科技部',
  '基础架构部',
];

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

const buildGroupTree = (groups: AssetGroup[], parentId: string | null = null): AssetGroupNode[] =>
  groups
    .filter((group) => group.parentId === parentId)
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-Hans-CN'))
    .map((group) => ({
      ...group,
      children: buildGroupTree(groups, group.id),
    }));

const flattenGroupTree = (nodes: AssetGroupNode[]): AssetGroupNode[] =>
  nodes.flatMap((node) => [node, ...flattenGroupTree(node.children)]);

const filterGroupTree = (
  nodes: AssetGroupNode[],
  keyword: string,
  department: string,
  status: string,
): AssetGroupNode[] =>
  nodes
    .map((node) => {
      const children = filterGroupTree(node.children, keyword, department, status);
      const matchesKeyword =
        !keyword ||
        [node.name, node.description, node.owner].some((value) =>
          value.toLowerCase().includes(keyword.toLowerCase()),
        );
      const matchesDepartment = department === 'all' || node.department === department;
      const matchesStatus = status === 'all' || node.status === status;
      const selfMatched = matchesKeyword && matchesDepartment && matchesStatus;

      if (!selfMatched && !children.length) {
        return null;
      }

      return {
        ...node,
        children,
      };
    })
    .filter((node): node is AssetGroupNode => Boolean(node));

const findGroupNodeById = (nodes: AssetGroupNode[], id: string): AssetGroupNode | null => {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }

    const matched = findGroupNodeById(node.children, id);
    if (matched) {
      return matched;
    }
  }

  return null;
};

const getGroupPath = (groups: AssetGroup[], groupId: string): AssetGroup[] => {
  const map = new Map(groups.map((group) => [group.id, group]));
  const path: AssetGroup[] = [];
  let current = map.get(groupId) ?? null;

  while (current) {
    path.unshift(current);
    current = current.parentId ? map.get(current.parentId) ?? null : null;
  }

  return path;
};

const countLeafGroups = (node: AssetGroupNode): number => {
  if (!node.children.length) {
    return 1;
  }

  return node.children.reduce((total, child) => total + countLeafGroups(child), 0);
};

const sumGroupMetrics = (
  node: AssetGroupNode,
): { databaseCount: number; tableCount: number; fieldCount: number; groupCount: number } =>
  node.children.reduce(
    (total, child) => {
      const childTotal = sumGroupMetrics(child);
      return {
        databaseCount: total.databaseCount + childTotal.databaseCount,
        tableCount: total.tableCount + childTotal.tableCount,
        fieldCount: total.fieldCount + childTotal.fieldCount,
        groupCount: total.groupCount + childTotal.groupCount,
      };
    },
    {
      databaseCount: node.databaseCount,
      tableCount: node.tableCount,
      fieldCount: node.fieldCount,
      groupCount: 1,
    },
  );

const getDescendantIds = (groups: AssetGroup[], groupId: string): string[] => {
  const directChildren = groups.filter((group) => group.parentId === groupId).map((group) => group.id);
  return directChildren.flatMap((childId) => [childId, ...getDescendantIds(groups, childId)]);
};

const moveGroupHierarchy = (groups: AssetGroup[], dragId: string, newParentId: string | null): AssetGroup[] => {
  const groupMap = new Map(groups.map((group) => [group.id, group]));
  const draggedGroup = groupMap.get(dragId);
  if (!draggedGroup) {
    return groups;
  }

  const newParent = newParentId ? groupMap.get(newParentId) ?? null : null;
  const nextLevel = newParent ? newParent.level + 1 : 1;
  const levelDelta = nextLevel - draggedGroup.level;
  const descendantIds = getDescendantIds(groups, dragId);

  return groups.map((group) => {
    if (group.id === dragId) {
      return {
        ...group,
        parentId: newParentId,
        level: nextLevel,
        updateTime: getNowText(),
      };
    }

    if (descendantIds.includes(group.id)) {
      return {
        ...group,
        level: group.level + levelDelta,
        updateTime: getNowText(),
      };
    }

    return group;
  });
};

const canDeleteGroup = (group: AssetGroupNode) =>
  !group.children.length &&
  group.databaseCount === 0 &&
  group.tableCount === 0 &&
  group.fieldCount === 0;

const buildTreeData = (nodes: AssetGroupNode[]): DataNode[] =>
  nodes.map((node) => ({
    key: node.id,
    title: (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          width: '100%',
          paddingRight: 8,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              minWidth: 0,
            }}
          >
            <Text strong ellipsis style={{ maxWidth: 180 }}>
              {node.name}
            </Text>
            <Tag color={LEVEL_META[node.level]?.color ?? 'blue'} style={{ marginInlineEnd: 0 }}>
              {LEVEL_META[node.level]?.label ?? `L${node.level}`}
            </Tag>
          </div>
          <div style={{ color: '#8c8c8c', fontSize: 12 }}>{node.department}</div>
        </div>
        <Badge count={node.children.length} color={node.children.length ? '#1677ff' : '#d9d9d9'} title="直接下级数量" />
      </div>
    ),
    children: buildTreeData(node.children),
  }));

const AssetGroups: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<AssetGroupFormValues>();
  const [groups, setGroups] = useState<AssetGroup[]>([]);
  const [keyword, setKeyword] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('user-domain');
  const [expandedKeys, setExpandedKeys] = useState<string[]>(['user-domain', 'trade-domain', 'infra-domain']);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupModalMode, setGroupModalMode] = useState<GroupModalMode>('create-root');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [targetParentId, setTargetParentId] = useState<string | null>(null);

  const groupTree = useMemo(() => buildGroupTree(groups), [groups]);
  const filteredTree = useMemo(
    () => filterGroupTree(groupTree, keyword, departmentFilter, statusFilter),
    [departmentFilter, groupTree, keyword, statusFilter],
  );
  const flatFilteredGroups = useMemo(() => flattenGroupTree(filteredTree), [filteredTree]);

  useEffect(() => {
    let cancelled = false;

    const loadGroups = async () => {
      const initialGroups = await listAssetGroups();
      if (!cancelled) {
        setGroups(initialGroups);
      }
    };

    void loadGroups();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!flatFilteredGroups.some((group) => group.id === selectedGroupId)) {
      setSelectedGroupId(flatFilteredGroups[0]?.id ?? '');
    }
  }, [flatFilteredGroups, selectedGroupId]);

  const selectedGroup = useMemo(
    () => (selectedGroupId ? findGroupNodeById(filteredTree, selectedGroupId) : null),
    [filteredTree, selectedGroupId],
  );

  const selectedGroupPath = useMemo(
    () => (selectedGroup ? getGroupPath(groups, selectedGroup.id) : []),
    [groups, selectedGroup],
  );

  const selectedGroupMetrics = useMemo(
    () => (selectedGroup ? sumGroupMetrics(selectedGroup) : null),
    [selectedGroup],
  );

  const totalGroupCount = flattenGroupTree(groupTree).length;
  const rootGroupCount = groupTree.length;
  const totalTableCount = flattenGroupTree(groupTree).reduce((sum, item) => sum + item.tableCount, 0);
  const totalFieldCount = flattenGroupTree(groupTree).reduce((sum, item) => sum + item.fieldCount, 0);

  const departmentOptions = Array.from(new Set(groups.map((group) => group.department))).map((department) => ({
    value: department,
    label: department,
  }));

  const openCreateRootModal = () => {
    setGroupModalMode('create-root');
    setEditingGroupId(null);
    setTargetParentId(null);
    setGroupModalOpen(true);
    form.setFieldsValue({
      name: '',
      description: '',
      owner: '',
      department: DEPARTMENT_OPTIONS[0],
      status: 'active',
    });
  };

  const openCreateChildModal = (parent: AssetGroupNode) => {
    setGroupModalMode('create-child');
    setEditingGroupId(null);
    setTargetParentId(parent.id);
    setExpandedKeys((current) => uniqueArray([...current, parent.id]));
    setGroupModalOpen(true);
    form.setFieldsValue({
      name: '',
      description: '',
      owner: parent.owner,
      department: parent.department,
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
      setGroups(nextGroups);
      messageApi.success('分组已更新');
    } else {
      const parent = targetParentId ? groups.find((group) => group.id === targetParentId) ?? null : null;
      const newGroup = await createAssetGroupRecord(values, parent);
      const nextGroups = [...groups, newGroup];
      await saveAssetGroups(nextGroups);
      setGroups(nextGroups);
      setSelectedGroupId(newGroup.id);
      if (targetParentId) {
        setExpandedKeys((current) => uniqueArray([...current, targetParentId]));
      }
      messageApi.success(groupModalMode === 'create-child' ? '子分组已创建' : '分组已创建');
    }

    setGroupModalOpen(false);
    setEditingGroupId(null);
    setTargetParentId(null);
    form.resetFields();
  };

  const handleDeleteGroup = (group: AssetGroupNode) => {
    if (!canDeleteGroup(group)) {
      messageApi.warning('仅允许删除没有子分组且未关联任何库表字段的空叶子分组');
      return;
    }

    Modal.confirm({
      title: '确认删除分组',
      content: `确定要删除分组“${group.name}”吗？删除后不可恢复。`,
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        const nextGroups = groups.filter((item) => item.id !== group.id);
        void saveAssetGroups(nextGroups);
        setGroups(nextGroups);
        setSelectedGroupId(group.parentId ?? '');
        messageApi.success('分组已删除');
      },
    });
  };

  const handleTreeDrop: TreeProps['onDrop'] = (info) => {
    const dragId = String(info.dragNode.key);
    const targetId = String(info.node.key);
    const targetGroup = groups.find((group) => group.id === targetId);
    const draggedGroup = groups.find((group) => group.id === dragId);

    if (!targetGroup || !draggedGroup || dragId === targetId) {
      return;
    }

    const nextParentId = info.dropToGap ? targetGroup.parentId : targetGroup.id;
    const descendantIds = getDescendantIds(groups, dragId);
    const nextParent = nextParentId ? groups.find((group) => group.id === nextParentId) ?? null : null;
    const nextLevel = nextParent ? nextParent.level + 1 : 1;

    if (nextParentId && descendantIds.includes(nextParentId)) {
      messageApi.warning('不能将分组拖拽到自己的子分组下');
      return;
    }

    if (nextLevel > MAX_GROUP_LEVEL) {
      messageApi.warning(`资产分组最多只支持 ${MAX_GROUP_LEVEL} 级层级`);
      return;
    }

    if ((draggedGroup.databaseCount > 0 || draggedGroup.tableCount > 0 || draggedGroup.fieldCount > 0) && nextLevel >= 4) {
      messageApi.warning('已承载资产的分组不允许下沉到四级层级');
      return;
    }

    const nextGroups = moveGroupHierarchy(groups, dragId, nextParentId);
    saveAssetGroups(nextGroups);
    setGroups(nextGroups);
    setExpandedKeys((current) => uniqueArray([...current, ...(nextParentId ? [nextParentId] : [])]));
    messageApi.success(
      nextParentId
        ? `已将“${draggedGroup.name}”调整到“${targetGroup.name}”层级下`
        : `已将“${draggedGroup.name}”调整为一级分组`,
    );
  };

  return (
    <PageContainer
      header={{
        title: '资产分组设置',
        subTitle: '用树形层级视图梳理分组归属、上下级关系，并支持拖拽调整层级。',
        extra: [
          <Button
            key="reload"
            icon={<ReloadOutlined />}
            onClick={async () => {
              const resetGroups = await resetAssetGroups();
              setGroups(resetGroups);
              setKeyword('');
              setDepartmentFilter('all');
              setStatusFilter('all');
              setSelectedGroupId('user-domain');
              setExpandedKeys(['user-domain', 'trade-domain', 'infra-domain']);
              messageApi.success('层级视图已重置');
            }}
          >
            重置视图
          </Button>,
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={openCreateRootModal}>
            新增分组
          </Button>,
        ],
      }}
    >
      {contextHolder}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="分组总数" value={totalGroupCount} prefix={<ClusterOutlined />} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="一级分组" value={rootGroupCount} prefix={<ApartmentOutlined />} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="覆盖数据表" value={totalTableCount} prefix={<TableOutlined />} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="覆盖字段" value={totalFieldCount} prefix={<DatabaseOutlined />} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={8}>
          <Card
            title="分组层级树"
            extra={
              <Space size={4}>
                <Tag color="red">一级</Tag>
                <Tag color="gold">二级</Tag>
                <Tag color="blue">三级</Tag>
              </Space>
            }
            bodyStyle={{ paddingBottom: 12 }}
          >
            <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
              <Col span={24}>
                <Search
                  allowClear
                  placeholder="搜索分组名称、描述或负责人"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                />
              </Col>
              <Col span={12}>
                <Select
                  style={{ width: '100%' }}
                  value={departmentFilter}
                  onChange={setDepartmentFilter}
                  options={[{ value: 'all', label: '全部部门' }, ...departmentOptions]}
                />
              </Col>
              <Col span={12}>
                <Select
                  style={{ width: '100%' }}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: 'all', label: '全部状态' },
                    { value: 'active', label: '启用' },
                    { value: 'inactive', label: '停用' },
                    { value: 'archived', label: '归档' },
                  ]}
                />
              </Col>
            </Row>

            <Paragraph type="secondary" style={{ marginBottom: 12 }}>
              支持拖拽节点调整归属层级。拖到节点上会成为其子分组，拖到节点间空隙会调整为同级。
            </Paragraph>

            {filteredTree.length ? (
              <Tree
                showLine
                blockNode
                draggable
                treeData={buildTreeData(filteredTree)}
                selectedKeys={selectedGroupId ? [selectedGroupId] : []}
                expandedKeys={expandedKeys}
                onExpand={(keys) => setExpandedKeys(keys as string[])}
                onDrop={handleTreeDrop}
                onSelect={(keys) => {
                  const nextSelectedKey = keys[0];
                  if (typeof nextSelectedKey === 'string') {
                    setSelectedGroupId(nextSelectedKey);
                  }
                }}
              />
            ) : (
              <Empty description="未找到符合条件的分组" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>

        <Col xs={24} xl={16}>
          {selectedGroup ? (
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Card>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 16,
                    flexWrap: 'wrap',
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <Space size={8} wrap style={{ marginBottom: 8 }}>
                      <Title level={4} style={{ margin: 0 }}>
                        {selectedGroup.name}
                      </Title>
                      <Tag color={LEVEL_META[selectedGroup.level]?.color ?? 'blue'}>
                        {LEVEL_META[selectedGroup.level]?.label ?? `L${selectedGroup.level}`}
                      </Tag>
                      <Badge
                        status={STATUS_META[selectedGroup.status].color as never}
                        text={STATUS_META[selectedGroup.status].label}
                      />
                    </Space>
                    <Paragraph type="secondary" style={{ marginBottom: 8 }}>
                      {selectedGroup.description}
                    </Paragraph>
                    <Space size={8} wrap>
                      <Tag bordered={false} color="cyan">
                        负责人：{selectedGroup.owner}
                      </Tag>
                      <Tag bordered={false} color="geekblue">
                        部门：{selectedGroup.department}
                      </Tag>
                    </Space>
                  </div>

                  <Space>
                    <Button icon={<EditOutlined />} onClick={() => openEditModal(selectedGroup)}>
                      编辑分组
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreateChildModal(selectedGroup)}>
                      新增子分组
                    </Button>
                    <Button danger icon={<DeleteOutlined />} onClick={() => handleDeleteGroup(selectedGroup)}>
                      删除分组
                    </Button>
                  </Space>
                </div>

                <Descriptions column={2} size="small" bordered>
                  <Descriptions.Item label="层级路径" span={2}>
                    <Space size={8} wrap>
                      {selectedGroupPath.map((item, index) => (
                        <React.Fragment key={item.id}>
                          <Tag color={index === selectedGroupPath.length - 1 ? 'processing' : 'default'}>
                            {item.name}
                          </Tag>
                          {index < selectedGroupPath.length - 1 ? <Text type="secondary">/</Text> : null}
                        </React.Fragment>
                      ))}
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="创建时间">{selectedGroup.createTime}</Descriptions.Item>
                  <Descriptions.Item label="更新时间">{selectedGroup.updateTime}</Descriptions.Item>
                  <Descriptions.Item label="直接下级">{selectedGroup.children.length}</Descriptions.Item>
                  <Descriptions.Item label="末级分组数">{countLeafGroups(selectedGroup)}</Descriptions.Item>
                </Descriptions>
              </Card>

              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic title="当前及下级库数" value={selectedGroupMetrics?.databaseCount ?? 0} prefix={<DatabaseOutlined />} />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic title="当前及下级表数" value={selectedGroupMetrics?.tableCount ?? 0} prefix={<TableOutlined />} />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic title="当前及下级字段数" value={selectedGroupMetrics?.fieldCount ?? 0} prefix={<FolderOpenOutlined />} />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic title="当前子树分组数" value={selectedGroupMetrics?.groupCount ?? 0} prefix={<ClusterOutlined />} />
                  </Card>
                </Col>
              </Row>

              <Card title="直接下级分组">
                {selectedGroup.children.length ? (
                  <Row gutter={[12, 12]}>
                    {selectedGroup.children.map((child) => (
                      <Col xs={24} md={12} key={child.id}>
                        <Card
                          size="small"
                          hoverable
                          onClick={() => {
                            setExpandedKeys((current) => uniqueArray([...current, selectedGroup.id]));
                            setSelectedGroupId(child.id);
                          }}
                        >
                          <Space direction="vertical" size={8} style={{ width: '100%' }}>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 12,
                              }}
                            >
                              <Space size={8} wrap>
                                <Text strong>{child.name}</Text>
                                <Tag color={LEVEL_META[child.level]?.color ?? 'blue'}>
                                  {LEVEL_META[child.level]?.label ?? `L${child.level}`}
                                </Tag>
                              </Space>
                              <Badge status={STATUS_META[child.status].color as never} text={STATUS_META[child.status].label} />
                            </div>
                            <Text type="secondary">{child.description}</Text>
                            <Space size={12} wrap>
                              <Text type="secondary">库 {child.databaseCount}</Text>
                              <Text type="secondary">表 {child.tableCount}</Text>
                              <Text type="secondary">字段 {child.fieldCount}</Text>
                              <Text type="secondary">下级 {child.children.length}</Text>
                            </Space>
                          </Space>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                ) : (
                  <Empty description="当前分组下暂无子分组" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </Card>
            </Space>
          ) : (
            <Card>
              <Empty description="请选择左侧分组查看层级详情" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </Card>
          )}
        </Col>
      </Row>

      <Modal
        title={
          groupModalMode === 'edit'
            ? '编辑分组'
            : groupModalMode === 'create-child'
              ? '新增子分组'
              : '新增一级分组'
        }
        open={groupModalOpen}
        onOk={handleSubmitGroup}
        onCancel={() => {
          setGroupModalOpen(false);
          setEditingGroupId(null);
          setTargetParentId(null);
          form.resetFields();
        }}
        destroyOnClose
        width={720}
      >
        {groupModalMode === 'create-child' && targetParentId ? (
          <Paragraph type="secondary">
            上级分组：
            <Text strong>{groups.find((group) => group.id === targetParentId)?.name ?? '-'}</Text>
          </Paragraph>
        ) : null}

        <Form<AssetGroupFormValues> form={form} layout="vertical">
          <Form.Item
            label="分组名称"
            name="name"
            rules={[
              { required: true, message: '请输入分组名称' },
              { max: 30, message: '分组名称不能超过 30 个字符' },
            ]}
          >
            <Input placeholder="请输入分组名称" maxLength={30} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="负责人"
                name="owner"
                rules={[{ required: true, message: '请输入负责人' }]}
              >
                <Input placeholder="请输入负责人" maxLength={20} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="所属部门"
                name="department"
                rules={[{ required: true, message: '请选择所属部门' }]}
              >
                <Select options={DEPARTMENT_OPTIONS.map((item) => ({ value: item, label: item }))} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="状态"
                name="status"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select
                  options={[
                    { value: 'active', label: '启用' },
                    { value: 'inactive', label: '停用' },
                    { value: 'archived', label: '归档' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="分组说明" name="description" rules={[{ required: true, message: '请输入分组说明' }]}>
            <TextArea rows={4} placeholder="请输入分组说明" maxLength={200} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default AssetGroups;
