import { request } from '@/services/request';

export type OverviewDataLevel = 'public' | 'internal' | 'confidential' | 'secret';
export type OverviewLevelCode = 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
export type ProtectionStatus = 'not_required' | 'recommended' | 'confirmed';

export interface FullDataItem {
  id: string;
  databaseName: string;
  tableName: string;
  fieldName: string;
  fieldComment: string;
  fieldTable: string;
  dataType: string;
  dataCategory: string;
  dataTypeName: string;
  classificationPathNames: string[];
  dataLevel: OverviewDataLevel | null;
  levelCode: OverviewLevelCode | null;
  levelColor?: string | null;
  isSensitive: boolean;
  maskingStatus: ProtectionStatus;
  encryptionStatus: ProtectionStatus;
  groupName: string;
  rootGroupName: string;
  assetGroupPathNames: string[];
  sampleData: string[];
  updateTime: string;
  status: 'active' | 'inactive' | 'processing';
}

export interface MissedDataItem extends Omit<FullDataItem, 'status'> {
  key: string;
  missCount: number;
  missRate: number;
  lastCheckTime: string;
  status: 'high' | 'medium' | 'low';
  source: string;
  priority: 'high' | 'medium' | 'low';
}

export interface TableFieldItem {
  id: string;
  fieldName: string;
  fieldComment: string;
  fieldTable: string;
  dataType: string;
  dataCategory: string;
  dataTypeName: string;
  classificationPathNames: string[];
  dataLevel: OverviewDataLevel | null;
  levelCode: OverviewLevelCode | null;
  levelColor?: string | null;
  isSensitive: boolean;
  maskingStatus: ProtectionStatus;
  encryptionStatus: ProtectionStatus;
  groupName: string;
  rootGroupName: string;
  assetGroupPathNames: string[];
  sampleData: string[];
  updateTime: string;
}

export interface TableItem {
  id: string;
  name: string;
  databaseId: string;
  rowCount: number;
  size: number;
  status: 'online' | 'offline' | 'maintenance';
  lastSyncTime: string;
  syncStatus: 'success' | 'failed' | 'syncing';
  fields: TableFieldItem[];
}

export interface DatabaseItem {
  id: string;
  assetId: string;
  assetName: string;
  name: string;
  type: string;
  status: 'online' | 'offline';
  tables: TableItem[];
}

export interface DatabaseInstance {
  ip: string;
  status: 'online' | 'offline';
  databases: DatabaseItem[];
}

export const listFullDataItems = async (): Promise<FullDataItem[]> =>
  request<FullDataItem[]>('/api/data-overview/full-data-list');

export const listMissedDataItems = async (): Promise<MissedDataItem[]> =>
  request<MissedDataItem[]>('/api/data-overview/missed-data-list');

export const listDatabaseInstances = async (): Promise<DatabaseInstance[]> =>
  request<DatabaseInstance[]>('/api/data-overview/table-data-list');
