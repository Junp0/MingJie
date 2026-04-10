import {
  createRole,
  deleteRole,
  getPermissions,
  listRoles,
  updateRole,
  type CreateRoleParams,
  type PermissionDefinition,
  type PermissionGroup,
  type RoleRecord,
  type RoleStatus,
  type UpdateRoleParams,
} from '@/services/system/roleStore';
import { PageContainer, ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { Button, Form, Input, message, Modal, Popconfirm, Space, Tag, Tree } from 'antd';
import type { DataNode } from 'antd/es/tree';
import React, { useEffect, useRef, useState } from 'react';

const STATUS_MAP: Record<RoleStatus, { text: string; color: string }> = {
  ACTIVE: { text: '启用', color: 'success' },
  INACTIVE: { text: '禁用', color: 'error' },
  ARCHIVED: { text: '归档', color: 'default' },
};

const buildPermissionTree = (
  groups: PermissionGroup[],
  permissions: PermissionDefinition[],
): DataNode[] => {
  return groups
    .map((group) => {
      const children = permissions
        .filter((p) => p.group === group.code)
        .map((p) => ({
          title: p.name,
          key: p.code,
        }));
      if (children.length === 0) return null;
      return {
        title: group.name,
        key: `group_${group.code}`,
        children,
      };
    })
    .filter(Boolean) as DataNode[];
};

const getAllPermissionKeys = (permissions: PermissionDefinition[]): string[] =>
  permissions.map((p) => p.code);

const RoleManagementPage: React.FC = () => {
  const actionRef = useRef<ActionType | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null);
  const [form] = Form.useForm();
  const [checkedKeys, setCheckedKeys] = useState<string[]>([]);
  const [permissionTree, setPermissionTree] = useState<DataNode[]>([]);
  const [allPermissions, setAllPermissions] = useState<PermissionDefinition[]>([]);

  useEffect(() => {
    getPermissions()
      .then((data) => {
        setPermissionTree(buildPermissionTree(data.groups, data.permissions));
        setAllPermissions(data.permissions);
      })
      .catch(() => {});
  }, []);

  const openCreateModal = () => {
    setEditingRole(null);
    form.resetFields();
    setCheckedKeys([]);
    setModalOpen(true);
  };

  const openEditModal = (record: RoleRecord) => {
    setEditingRole(record);
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      description: record.description,
    });
    setCheckedKeys(record.permissions.filter((p) => allPermissions.some((ap) => ap.code === p)));
    setModalOpen(true);
  };

  const handleSubmit = async (values: CreateRoleParams | UpdateRoleParams) => {
    const payload = { ...values, permissions: checkedKeys.filter((k) => !k.startsWith('group_')) };
    try {
      if (editingRole) {
        await updateRole(editingRole.id, payload);
        message.success('角色更新成功');
      } else {
        await createRole(payload as CreateRoleParams);
        message.success('角色创建成功');
      }
      setModalOpen(false);
      form.resetFields();
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e?.message || '操作失败');
    }
  };

  const handleDelete = async (record: RoleRecord) => {
    try {
      await deleteRole(record.id);
      message.success('角色已删除');
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e?.message || '删除失败');
    }
  };

  const columns: ProColumns<RoleRecord>[] = [
    { title: '角色名称', dataIndex: 'name', width: 160 },
    { title: '角色编码', dataIndex: 'code', width: 160 },
    { title: '描述', dataIndex: 'description', ellipsis: true },
    {
      title: '用户数',
      dataIndex: 'userCount',
      search: false,
      width: 100,
      render: (_, record) => <Tag>{record.userCount}</Tag>,
    },
    {
      title: '系统内置',
      dataIndex: 'isSystem',
      search: false,
      width: 100,
      render: (_, record) =>
        record.isSystem ? <Tag color="blue">是</Tag> : <Tag>否</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      search: false,
      width: 100,
      render: (_, record) => (
        <Tag color={STATUS_MAP[record.status]?.color}>{STATUS_MAP[record.status]?.text}</Tag>
      ),
    },
    { title: '创建时间', dataIndex: 'createdAt', search: false, width: 180 },
    {
      title: '操作',
      valueType: 'option',
      width: 160,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" style={{ padding: 0 }} onClick={() => openEditModal(record)}>
            编辑
          </Button>
          {!record.isSystem && (
            <Popconfirm title="确认删除该角色？" onConfirm={() => handleDelete(record)}>
              <Button type="link" size="small" danger style={{ padding: 0 }}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <PageContainer title="Role Management" className="nothingPage" subTitle="集中维护角色定义、权限覆盖范围和内置角色状态。">
      <ProTable<RoleRecord>
        rowKey="id"
        actionRef={actionRef}
        request={async () => {
          const data = await listRoles();
          return { data, total: data.length, success: true };
        }}
        columns={columns}
        pagination={false}
        search={false}
        toolBarRender={() => [
          <Button key="add" type="primary" onClick={openCreateModal}>
            新增角色
          </Button>,
        ]}
      />

      <Modal
        title={editingRole ? '编辑角色' : '新增角色'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={640}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="角色名称" rules={[{ required: true, message: '请输入角色名称' }]}>
            <Input placeholder="请输入角色名称" />
          </Form.Item>
          <Form.Item
            name="code"
            label="角色编码"
            rules={[{ required: true, message: '请输入角色编码' }]}
          >
            <Input placeholder="请输入角色编码（英文）" disabled={!!editingRole?.isSystem} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="请输入描述" rows={2} />
          </Form.Item>
          <Form.Item label="权限配置" required>
            <div style={{ border: '1px solid #d9d9d9', borderRadius: 6, padding: 12, maxHeight: 400, overflow: 'auto' }}>
              <Space style={{ marginBottom: 8 }}>
                <Button
                  size="small"
                  onClick={() => setCheckedKeys(getAllPermissionKeys(allPermissions))}
                >
                  全选
                </Button>
                <Button size="small" onClick={() => setCheckedKeys([])}>
                  全不选
                </Button>
              </Space>
              <Tree
                checkable
                defaultExpandAll
                checkedKeys={checkedKeys}
                onCheck={(checked) => {
                  const keys = Array.isArray(checked) ? checked : checked.checked;
                  setCheckedKeys(keys as string[]);
                }}
                treeData={permissionTree}
              />
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default RoleManagementPage;
