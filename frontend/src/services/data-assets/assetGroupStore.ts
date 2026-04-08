import { request } from '@/services/request';
import { formatBeijingDateTime } from '@/utils/datetime';

export type AssetGroupStatus = 'active' | 'inactive' | 'archived';

export interface AssetGroup {
  id: string;
  name: string;
  parentId: string | null;
  level: number;
  description: string;
  owner: string;
  department: string;
  status: AssetGroupStatus;
  createTime: string;
  updateTime: string;
  databaseCount: number;
  tableCount: number;
  fieldCount: number;
}

export interface AssetGroupFormValues {
  name: string;
  description: string;
  owner: string;
  department: string;
  status: AssetGroupStatus;
}

type BackendAssetGroup = {
  id: string;
  name: string;
  parentId?: string | null;
  level?: number;
  description?: string | null;
  owner?: string | null;
  department?: string | null;
  status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  createdAt?: string;
  updatedAt?: string;
};

const statusMap: Record<NonNullable<BackendAssetGroup['status']>, AssetGroupStatus> = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived',
};

const reverseStatusMap: Record<AssetGroupStatus, BackendAssetGroup['status']> = {
  active: 'ACTIVE',
  inactive: 'INACTIVE',
  archived: 'ARCHIVED',
};

const mapAssetGroup = (item: BackendAssetGroup): AssetGroup => ({
  id: item.id,
  name: item.name,
  parentId: item.parentId ?? null,
  level: item.level ?? 1,
  description: item.description ?? '',
  owner: item.owner ?? '',
  department: item.department ?? '',
  status: item.status ? statusMap[item.status] : 'active',
  createTime: formatBeijingDateTime(item.createdAt),
  updateTime: formatBeijingDateTime(item.updatedAt),
  databaseCount: 0,
  tableCount: 0,
  fieldCount: 0,
});

const toUpdatePayload = (group: AssetGroup) => ({
  name: group.name.trim(),
  description: group.description.trim(),
  owner: group.owner.trim(),
  department: group.department.trim(),
  status: reverseStatusMap[group.status],
  parentId: group.parentId,
  level: group.level,
});

export const listAssetGroups = async (): Promise<AssetGroup[]> => {
  const data = await request<BackendAssetGroup[]>('/api/asset-groups');
  return data.map(mapAssetGroup).sort((left, right) => left.name.localeCompare(right.name, 'zh-Hans-CN'));
};

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
      current.status !== group.status ||
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
      description: values.description.trim(),
      owner: values.owner.trim(),
      department: values.department.trim(),
      status: reverseStatusMap[values.status],
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
    .filter((group) => group.status !== 'archived')
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
  const groups = await listAssetGroups();
  const activeGroups = groups.filter((group) => group.status !== 'archived');

  const buildTree = (parentId: string | null): TreeSelectNode[] =>
    activeGroups
      .filter((group) => group.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
      .map((group) => ({
        value: group.id,
        title: group.name,
        children: buildTree(group.id),
      }));

  return buildTree(null);
};
