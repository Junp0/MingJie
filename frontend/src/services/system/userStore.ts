import { request } from '@/services/request';
import { formatBeijingDateTime } from '@/utils/datetime';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface UserRole {
  id: string;
  name: string;
  code: string;
}

export interface UserRecord {
  id: string;
  username: string;
  name: string;
  email?: string;
  phone?: string;
  role?: UserRole | null;
  roleId?: string | null;
  title?: string;
  department?: string;
  avatar?: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UserListParams {
  current?: number;
  pageSize?: number;
  keyword?: string;
  roleId?: string;
  status?: UserStatus;
}

export interface CreateUserParams {
  username: string;
  password: string;
  name: string;
  email?: string;
  phone?: string;
  roleId?: string;
  title?: string;
  department?: string;
}

export interface UpdateUserParams {
  name?: string;
  email?: string;
  phone?: string;
  roleId?: string;
  title?: string;
  department?: string;
  status?: UserStatus;
  avatar?: string;
}

type BackendUserRecord = Omit<UserRecord, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};

type BackendUserListResponse = {
  items: BackendUserRecord[];
  total: number;
  current: number;
  pageSize: number;
};

const mapUser = (item: BackendUserRecord): UserRecord => ({
  ...item,
  createdAt: formatBeijingDateTime(item.createdAt),
  updatedAt: formatBeijingDateTime(item.updatedAt),
});

export const listUsers = async (params: UserListParams) => {
  const sanitized = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  );
  const data = await request<BackendUserListResponse>('/api/users', { params: sanitized });
  return { ...data, items: data.items.map(mapUser) };
};

export const getUser = async (id: string) => {
  const data = await request<BackendUserRecord>(`/api/users/${id}`);
  return mapUser(data);
};

export const createUser = async (params: CreateUserParams) => {
  return request<UserRecord>('/api/users', { method: 'POST', data: params });
};

export const updateUser = async (id: string, params: UpdateUserParams) => {
  return request<UserRecord>(`/api/users/${id}`, { method: 'PATCH', data: params });
};

export const deleteUser = async (id: string) => {
  return request<{ success: boolean }>(`/api/users/${id}`, { method: 'DELETE' });
};

export const resetPassword = async (id: string, password: string) => {
  return request<{ success: boolean }>(`/api/users/${id}/reset-password`, {
    method: 'POST',
    data: { password },
  });
};
