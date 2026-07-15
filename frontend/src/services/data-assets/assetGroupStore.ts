import { request } from '@/services/request';
import { formatBeijingDateTime } from '@/utils/datetime';

export const ALL_ASSET_GROUP_ID = '__all_asset_groups__';

export interface AssetGroup {
  id: string;
  name: string;
  parentId: string | null;
  level: number;
  description: string;
  owner: string;
  department: string;
  createTime: string;
  updateTime: string;
  databaseCount: number;
  tableCount: number;
  fieldCount: number;
}

export interface AssetGroupFormValues {
  name: string;
  description?: string;
  owner?: string;
  department?: string;
}

export interface AssetGroupDepartmentOption {
  id: string;
  name: string;
  usageCount: number;
  inUse: boolean;
}

type BackendAssetGroup = {
  id: string;
  name: string;
  parentId?: string | null;
  level?: number;
  description?: string | null;
  owner?: string | null;
  department?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type BackendAssetGroupDepartment = {
  id: string;
  name: string;
  usageCount: number;
  inUse: boolean;
};

const normalizeOptionalInput = (value?: string) => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const mapAssetGroup = (item: BackendAssetGroup): AssetGroup => ({
  id: item.id,
  name: item.name,
  parentId: item.parentId ?? null,
  level: item.level ?? 1,
  description: item.description ?? '',
  owner: item.owner ?? '',
  department: item.department ?? '',
  createTime: formatBeijingDateTime(item.createdAt),
  updateTime: formatBeijingDateTime(item.updatedAt),
  databaseCount: 0,
  tableCount: 0,
  fieldCount: 0,
});

const toUpdatePayload = (group: AssetGroup) => ({
  name: group.name.trim(),
  description: normalizeOptionalInput(group.description),
  owner: normalizeOptionalInput(group.owner),
  department: normalizeOptionalInput(group.department),
  parentId: group.parentId,
  level: group.level,
});

const listAllAssetGroups = async (): Promise<AssetGroup[]> => {
  const data = await request<BackendAssetGroup[]>('/api/asset-groups');
  return data.map(mapAssetGroup).sort((left, right) => left.name.localeCompare(right.name, 'zh-Hans-CN'));
};

export const listAssetGroups = async (): Promise<AssetGroup[]> =>
  (await listAllAssetGroups()).filter((group) => group.id !== ALL_ASSET_GROUP_ID);

export const updateAssetGroup = async (group: AssetGroup): Promise<AssetGroup> => {
  const data = await request<BackendAssetGroup>(`/api/asset-groups/${group.id}`, {
    method: 'PATCH',
    data: toUpdatePayload(group),
  });

  return mapAssetGroup(data);
};

export const deleteAssetGroup = async (groupId: string): Promise<boolean> => {
  await request(`/api/asset-groups/${groupId}`, {
    method: 'DELETE',
  });
  return true;
};

export const saveAssetGroups = async (groups: AssetGroup[]): Promise<AssetGroup[]> => {
  const currentGroups = await listAssetGroups();
  const currentGroupMap = new Map(currentGroups.map((group) => [group.id, group]));
  const nextGroupIds = new Set(groups.map((group) => group.id));

  const deletedGroups = currentGroups
    .filter((group) => !nextGroupIds.has(group.id))
    .sort((left, right) => right.level - left.level);

  for (const group of deletedGroups) {
    await deleteAssetGroup(group.id);
  }

  for (const group of groups) {
    const current = currentGroupMap.get(group.id);
    if (!current) {
      continue;
    }

    const hasChanged =
      current.name !== group.name ||
      current.description !== group.description ||
      current.owner !== group.owner ||
      current.department !== group.department ||
      current.parentId !== group.parentId ||
      current.level !== group.level;

    if (hasChanged) {
      await updateAssetGroup(group);
    }
  }

  return listAssetGroups();
};

export const resetAssetGroups = async (): Promise<AssetGroup[]> => listAssetGroups();

export const getAssetGroupById = async (groupId: string): Promise<AssetGroup | null> => {
  const groups = await listAssetGroups();
  return groups.find((item) => item.id === groupId) ?? null;
};

export const createAssetGroup = async (
  values: AssetGroupFormValues,
  parent: AssetGroup | null,
): Promise<AssetGroup> => {
  const data = await request<BackendAssetGroup>('/api/asset-groups', {
    method: 'POST',
    data: {
      name: values.name.trim(),
      description: normalizeOptionalInput(values.description),
      owner: normalizeOptionalInput(values.owner),
      department: normalizeOptionalInput(values.department),
      parentId: parent?.id,
      level: parent ? parent.level + 1 : 1,
    },
  });

  return mapAssetGroup(data);
};

export const getAssetGroupPathNames = (groups: AssetGroup[], groupId: string): string[] => {
  const map = new Map(groups.map((group) => [group.id, group]));
  const names: string[] = [];
  let current = map.get(groupId) ?? null;

  while (current) {
    names.unshift(current.name);
    current = current.parentId ? map.get(current.parentId) ?? null : null;
  }

  return names;
};

export const listAssetGroupSelectOptions = async (): Promise<Array<{ value: string; label: string }>> => {
  const groups = await listAssetGroups();
  return groups
    .map((group) => ({
      value: group.id,
      label: getAssetGroupPathNames(groups, group.id).join(' / '),
    }));
};

interface TreeSelectNode {
  value: string;
  title: string;
  children: TreeSelectNode[];
}

export const listAssetGroupTreeSelectOptions = async (): Promise<TreeSelectNode[]> => {
  const groups = await listAllAssetGroups();
  const allGroup = groups.find((group) => group.id === ALL_ASSET_GROUP_ID);
  const regularGroups = groups.filter((group) => group.id !== ALL_ASSET_GROUP_ID);

  const buildTree = (parentId: string | null): TreeSelectNode[] =>
    regularGroups
      .filter((group) => group.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
      .map((group) => ({
        value: group.id,
        title: group.name,
        children: buildTree(group.id),
      }));

  const regularTree = buildTree(null);
  return allGroup
    ? [{ value: allGroup.id, title: allGroup.name, children: regularTree }]
    : regularTree;
};

export const listAssetGroupDepartments = async (): Promise<AssetGroupDepartmentOption[]> => {
  return request<BackendAssetGroupDepartment[]>('/api/asset-groups/departments');
};

export const deleteAssetGroupDepartment = async (departmentId: string): Promise<void> => {
  await request(`/api/asset-groups/departments/${departmentId}`, {
    method: 'DELETE',
  });
};
