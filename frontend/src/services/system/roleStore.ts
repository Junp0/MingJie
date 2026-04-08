import { request } from '@/services/request';
import { formatBeijingDateTime } from '@/utils/datetime';

export type RoleStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface RoleRecord {
  id: string;
  name: string;
  code: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
  userCount: number;
  status: RoleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleParams {
  name: string;
  code: string;
  description?: string;
  permissions: string[];
  status?: RoleStatus;
}

export interface UpdateRoleParams {
  name?: string;
  code?: string;
  description?: string;
  permissions?: string[];
  status?: RoleStatus;
}

export interface PermissionDefinition {
  code: string;
  name: string;
  group: string;
}

export interface PermissionGroup {
  code: string;
  name: string;
}

export interface PermissionsResponse {
  groups: PermissionGroup[];
  permissions: PermissionDefinition[];
}

type BackendRoleRecord = Omit<RoleRecord, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};

const mapRole = (item: BackendRoleRecord): RoleRecord => ({
  ...item,
  createdAt: formatBeijingDateTime(item.createdAt),
  updatedAt: formatBeijingDateTime(item.updatedAt),
});

export const listRoles = async () => {
  const data = await request<BackendRoleRecord[]>('/api/roles');
  return data.map(mapRole);
};

export const getRole = async (id: string) => {
  const data = await request<BackendRoleRecord>(`/api/roles/${id}`);
  return mapRole(data);
};

export const createRole = async (params: CreateRoleParams) => {
  return request<RoleRecord>('/api/roles', { method: 'POST', data: params });
};

export const updateRole = async (id: string, params: UpdateRoleParams) => {
  return request<RoleRecord>(`/api/roles/${id}`, { method: 'PATCH', data: params });
};

export const deleteRole = async (id: string) => {
  return request<{ success: boolean }>(`/api/roles/${id}`, { method: 'DELETE' });
};

export const getPermissions = async () => {
  return request<PermissionsResponse>('/api/roles/permissions');
};
