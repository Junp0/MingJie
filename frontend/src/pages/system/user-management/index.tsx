import {
  createUser,
  deleteUser,
  listUsers,
  resetPassword,
  updateUser,
  type CreateUserParams,
  type UpdateUserParams,
  type UserRecord,
  type UserStatus,
} from '@/services/system/userStore';
import { listRoles, type RoleRecord } from '@/services/system/roleStore';
import { PageContainer, ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { Button, Form, Input, message, Modal, Popconfirm, Select, Space, Tag } from 'antd';
import React, { useEffect, useRef, useState } from 'react';

const STATUS_MAP: Record<UserStatus, { text: string; color: string }> = {
  ACTIVE: { text: '启用', color: 'success' },
  INACTIVE: { text: '禁用', color: 'error' },
  ARCHIVED: { text: '归档', color: 'default' },
};

const UserManagementPage: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [resetPwdModalOpen, setResetPwdModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [resetPwdForm] = Form.useForm();

  useEffect(() => {
    listRoles().then(setRoles).catch(() => {});
  }, []);

  const handleCreate = async (values: CreateUserParams) => {
    try {
      await createUser(values);
      message.success('用户创建成功');
      setCreateModalOpen(false);
      createForm.resetFields();
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e?.message || '创建失败');
    }
  };

  const handleEdit = async (values: UpdateUserParams) => {
    if (!currentUser) return;
    try {
      await updateUser(currentUser.id, values);
      message.success('用户更新成功');
      setEditModalOpen(false);
      editForm.resetFields();
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e?.message || '更新失败');
    }
  };

  const handleDelete = async (record: UserRecord) => {
    try {
      await deleteUser(record.id);
      message.success('用户已禁用');
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e?.message || '操作失败');
    }
  };

  const handleResetPwd = async (values: { password: string }) => {
    if (!currentUser) return;
    try {
      await resetPassword(currentUser.id, values.password);
      message.success('密码重置成功');
      setResetPwdModalOpen(false);
      resetPwdForm.resetFields();
    } catch (e: any) {
      message.error(e?.message || '重置失败');
    }
  };

  const columns: ProColumns<UserRecord>[] = [
    { title: '关键字', dataIndex: 'keyword', hideInTable: true },
    { title: '用户名', dataIndex: 'username', search: false, width: 120 },
    { title: '姓名', dataIndex: 'name', search: false, width: 120 },
    {
      title: '角色',
      dataIndex: 'roleId',
      width: 140,
      valueType: 'select',
      valueEnum: Object.fromEntries(roles.map((r) => [r.id, { text: r.name }])),
      render: (_, record) => (
        <Tag color="blue">{record.role?.name || '未分配'}</Tag>
      ),
    },
    { title: '邮箱', dataIndex: 'email', search: false, ellipsis: true, width: 180 },
    { title: '手机号', dataIndex: 'phone', search: false, width: 140 },
    { title: '部门', dataIndex: 'department', search: false, width: 140 },
    { title: '职位', dataIndex: 'title', search: false, width: 120 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      valueType: 'select',
      valueEnum: Object.fromEntries(
        Object.entries(STATUS_MAP).map(([k, v]) => [k, { text: v.text }]),
      ),
      render: (_, record) => (
        <Tag color={STATUS_MAP[record.status]?.color}>{STATUS_MAP[record.status]?.text}</Tag>
      ),
    },
    { title: '创建时间', dataIndex: 'createdAt', search: false, width: 180 },
    {
      title: '操作',
      valueType: 'option',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            style={{ padding: 0 }}
            onClick={() => {
              setCurrentUser(record);
              editForm.setFieldsValue({
                name: record.name,
                email: record.email,
                phone: record.phone,
                roleId: record.role?.id,
                title: record.title,
                department: record.department,
                status: record.status,
              });
              setEditModalOpen(true);
            }}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            style={{ padding: 0 }}
            onClick={() => {
              setCurrentUser(record);
              setResetPwdModalOpen(true);
            }}
          >
            重置密码
          </Button>
          {record.username !== 'admin' && (
            <Popconfirm title="确认禁用该用户？" onConfirm={() => handleDelete(record)}>
              <Button type="link" size="small" danger style={{ padding: 0 }}>
                禁用
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <PageContainer title="用户管理">
      <ProTable<UserRecord>
        rowKey="id"
        actionRef={actionRef}
        request={async (params) => {
          const response = await listUsers({
            current: params.current,
            pageSize: params.pageSize,
            keyword: params.keyword,
            roleId: params.roleId,
            status: params.status,
          });
          return { data: response.items, total: response.total, success: true };
        }}
        columns={columns}
        pagination={{ pageSize: 20, showSizeChanger: true }}
        search={{ labelWidth: 80 }}
        toolBarRender={() => [
          <Button key="add" type="primary" onClick={() => setCreateModalOpen(true)}>
            新增用户
          </Button>,
        ]}
      />

      {/* Create Modal */}
      <Modal
        title="新增用户"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false);
          createForm.resetFields();
        }}
        onOk={() => createForm.submit()}
        width={520}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6位' },
            ]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item name="email" label="邮箱">
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          <Form.Item name="phone" label="手机号">
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item name="roleId" label="角色">
            <Select placeholder="请选择角色" allowClear>
              {roles.map((r) => (
                <Select.Option key={r.id} value={r.id}>
                  {r.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="department" label="部门">
            <Input placeholder="请输入部门" />
          </Form.Item>
          <Form.Item name="title" label="职位">
            <Input placeholder="请输入职位" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="编辑用户"
        open={editModalOpen}
        onCancel={() => {
          setEditModalOpen(false);
          editForm.resetFields();
        }}
        onOk={() => editForm.submit()}
        width={520}
      >
        <Form form={editForm} layout="vertical" onFinish={handleEdit}>
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item name="email" label="邮箱">
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          <Form.Item name="phone" label="手机号">
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item name="roleId" label="角色">
            <Select placeholder="请选择角色" allowClear>
              {roles.map((r) => (
                <Select.Option key={r.id} value={r.id}>
                  {r.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="department" label="部门">
            <Input placeholder="请输入部门" />
          </Form.Item>
          <Form.Item name="title" label="职位">
            <Input placeholder="请输入职位" />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select>
              <Select.Option value="ACTIVE">启用</Select.Option>
              <Select.Option value="INACTIVE">禁用</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        title={`重置密码 - ${currentUser?.name || ''}`}
        open={resetPwdModalOpen}
        onCancel={() => {
          setResetPwdModalOpen(false);
          resetPwdForm.resetFields();
        }}
        onOk={() => resetPwdForm.submit()}
        width={400}
      >
        <Form form={resetPwdForm} layout="vertical" onFinish={handleResetPwd}>
          <Form.Item
            name="password"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6位' },
            ]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default UserManagementPage;
