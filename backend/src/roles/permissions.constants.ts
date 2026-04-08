export interface PermissionDefinition {
  code: string;
  name: string;
  group: string;
}

export const PERMISSION_GROUPS = [
  { code: 'dashboard', name: '平台首页' },
  { code: 'data_overview', name: '数据概览' },
  { code: 'data_asset', name: '数据资产' },
  { code: 'classification', name: '数据分类分级' },
  { code: 'audit_log', name: '审计日志' },
  { code: 'user', name: '用户管理' },
  { code: 'role', name: '角色管理' },
  { code: 'system', name: '系统管理' },
];

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  { code: 'dashboard:view', name: '查看仪表盘', group: 'dashboard' },

  { code: 'data_overview:view', name: '查看数据概览', group: 'data_overview' },

  { code: 'data_asset:view', name: '查看数据资产', group: 'data_asset' },
  { code: 'data_asset:edit', name: '编辑数据资产', group: 'data_asset' },
  { code: 'data_asset:delete', name: '删除数据资产', group: 'data_asset' },
  { code: 'data_asset:import', name: '导入数据资产', group: 'data_asset' },
  { code: 'data_asset:scan', name: '自动扫描', group: 'data_asset' },

  { code: 'classification:view', name: '查看分类分级', group: 'classification' },
  { code: 'classification:edit', name: '编辑分类分级', group: 'classification' },
  { code: 'classification:execute', name: '执行分类任务', group: 'classification' },
  { code: 'classification:template', name: '管理分类模板', group: 'classification' },
  { code: 'classification:protection', name: '管理保护特征', group: 'classification' },

  { code: 'audit_log:view', name: '查看审计日志', group: 'audit_log' },

  { code: 'user:view', name: '查看用户', group: 'user' },
  { code: 'user:edit', name: '编辑用户', group: 'user' },
  { code: 'user:delete', name: '删除用户', group: 'user' },

  { code: 'role:view', name: '查看角色', group: 'role' },
  { code: 'role:edit', name: '编辑角色', group: 'role' },
  { code: 'role:delete', name: '删除角色', group: 'role' },

  { code: 'system:admin', name: '系统管理', group: 'system' },
];

export const ALL_PERMISSION_CODES = ALL_PERMISSIONS.map((p) => p.code);

export const DEFAULT_ROLES = [
  {
    name: '超级管理员',
    code: 'super_admin',
    description: '拥有系统所有权限',
    permissions: ALL_PERMISSION_CODES,
    isSystem: true,
  },
  {
    name: '数据管理员',
    code: 'data_admin',
    description: '管理数据资产与分类分级',
    permissions: [
      'dashboard:view',
      'data_overview:view',
      'data_asset:view',
      'data_asset:edit',
      'data_asset:delete',
      'data_asset:import',
      'data_asset:scan',
      'classification:view',
      'classification:edit',
      'classification:execute',
      'classification:template',
      'classification:protection',
      'audit_log:view',
    ],
    isSystem: true,
  },
  {
    name: '审计员',
    code: 'auditor',
    description: '查看数据与审计日志',
    permissions: [
      'dashboard:view',
      'data_overview:view',
      'data_asset:view',
      'classification:view',
      'audit_log:view',
    ],
    isSystem: true,
  },
  {
    name: '普通用户',
    code: 'viewer',
    description: '基础查看权限',
    permissions: [
      'dashboard:view',
      'data_overview:view',
      'data_asset:view',
      'classification:view',
    ],
    isSystem: true,
  },
];
