import type { ProColumns } from '@ant-design/pro-components';
import { Button, Tag, Tooltip } from 'antd';
import React from 'react';
import type {
  OverviewDataLevel,
  OverviewLevelCode,
  ProtectionStatus,
} from '@/services/data-overview/overviewStore';

export interface OverviewFieldDisplayRecord {
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
  isDeleted: boolean;
  tableIsDeleted: boolean;
  databaseIsDeleted: boolean;
}

export interface SampleDataItem {
  id: number;
  sampleData: string;
  updateTime: string;
}

const protectionStatusMap: Record<ProtectionStatus, { color: string; text: string }> = {
  not_required: { color: 'default', text: '无需' },
  recommended: { color: 'orange', text: '建议' },
  confirmed: { color: 'green', text: '确认' },
};

const levelColorMap: Record<OverviewLevelCode, string> = {
  L1: '#52c41a',
  L2: '#1677ff',
  L3: '#fa8c16',
  L4: '#f5222d',
  L5: '#722ed1',
};

const hexToRgba = (hexColor: string, alpha: number) => {
  const normalized = hexColor.replace('#', '');
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const resolveLevelColor = (
  levelCode: OverviewLevelCode,
  levelColor?: string | null,
) => {
  const normalized = levelColor?.trim() ?? '';
  if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
    return normalized;
  }

  return levelColorMap[levelCode] ?? '#1677ff';
};

const renderLevelCodeTag = (
  levelCode: OverviewLevelCode | null,
  levelColor?: string | null,
) => {
  if (!levelCode) {
    return '-';
  }

  const color = resolveLevelColor(levelCode, levelColor);

  return (
    <Tag
      style={{
        minWidth: 30,
        marginInlineEnd: 0,
        textAlign: 'center',
        color,
        background: hexToRgba(color, 0.12),
        borderColor: hexToRgba(color, 0.36),
        borderRadius: 6,
      }}
    >
      {levelCode}
    </Tag>
  );
};

export const sampleColumns = [
  {
    title: '序号',
    dataIndex: 'id',
    key: 'id',
    width: 80,
    align: 'center' as const,
  },
  {
    title: '样本数据',
    dataIndex: 'sampleData',
    key: 'sampleData',
    align: 'center' as const,
  },
  {
    title: '更新时间',
    dataIndex: 'updateTime',
    key: 'updateTime',
    width: 180,
    align: 'center' as const,
  },
];

export const buildSampleDataItems = (sampleDataList: string[], updateTime: string): SampleDataItem[] =>
  sampleDataList.map((sampleData, index) => ({
    id: index + 1,
    sampleData,
    updateTime,
  }));

const renderTreeTooltip = (
  title: string,
  pathNames: string[],
  displayValue: string,
) => {
  if (!displayValue || displayValue === '-') {
    return '-';
  }

  if (!pathNames.length) {
    return displayValue;
  }

  return (
    <Tooltip
      title={
        <div style={{ minWidth: 220 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>
          {pathNames.map((item, index) => (
            <div
              key={`${title}-${item}-${index}`}
              style={{ paddingLeft: index * 12, lineHeight: 1.6 }}
            >
              {item}
            </div>
          ))}
        </div>
      }
    >
      <span style={{ cursor: 'help' }}>{displayValue}</span>
    </Tooltip>
  );
};

const renderDeletedText = (
  value: string,
  deleted: boolean,
) => (
  <span
    style={
      deleted
        ? {
            textDecoration: 'line-through',
            color: '#8c8c8c',
          }
        : undefined
    }
  >
    {value}
  </span>
);

export const createFieldDisplayColumns = <T extends OverviewFieldDisplayRecord>(
  onShowSampleData: (record: T) => void,
): ProColumns<T>[] => [
  {
    title: '所属数据库',
    key: 'databaseName',
    dataIndex: 'databaseName',
    align: 'center',
    valueType: 'text',
    render: (_, record) =>
      renderDeletedText(record.databaseName, record.databaseIsDeleted),
  },
  {
    title: '所属数据表',
    key: 'tableName',
    dataIndex: 'tableName',
    align: 'center',
    valueType: 'text',
    render: (_, record) => renderDeletedText(record.tableName, record.tableIsDeleted),
  },
  {
    title: '字段名称',
    dataIndex: 'fieldName',
    align: 'center',
    valueType: 'text',
    render: (_, record) => renderDeletedText(record.fieldName, record.isDeleted),
  },
  { title: '字段注释', dataIndex: 'fieldComment', align: 'center', valueType: 'text' },
  { title: '数据类型', dataIndex: 'dataType', align: 'center', valueType: 'text' },
  {
    title: '数据分类',
    dataIndex: 'dataTypeName',
    align: 'center',
    valueType: 'text',
    render: (_, record) =>
      renderTreeTooltip(
        '分类树',
        record.classificationPathNames,
        record.dataTypeName || record.dataCategory || '-',
      ),
  },
  {
    title: '数据分级',
    dataIndex: 'dataLevel',
    align: 'center',
    render: (_, record) => renderLevelCodeTag(record.levelCode, record.levelColor),
  },
  {
    title: '是否敏感',
    dataIndex: 'isSensitive',
    align: 'center',
    render: (_, record) => (
      <Tag color={record.isSensitive ? 'red' : 'green'}>
        {record.isSensitive ? '是' : '否'}
      </Tag>
    ),
  },
  {
    title: '所属分组',
    dataIndex: 'rootGroupName',
    align: 'center',
    valueType: 'text',
    render: (_, record) =>
      renderTreeTooltip(
        '分组路径',
        record.assetGroupPathNames,
        record.rootGroupName || record.groupName || '-',
      ),
  },
  {
    title: '脱敏情况',
    dataIndex: 'maskingStatus',
    align: 'center',
    valueType: 'select',
    valueEnum: {
      not_required: { text: '无需脱敏' },
      recommended: { text: '建议脱敏' },
      confirmed: { text: '确认脱敏' },
    },
    render: (_, record) => {
      const protectionStatus = protectionStatusMap[record.maskingStatus];
      return <Tag color={protectionStatus.color}>{protectionStatus.text}脱敏</Tag>;
    },
  },
  {
    title: '加密情况',
    dataIndex: 'encryptionStatus',
    align: 'center',
    valueType: 'select',
    valueEnum: {
      not_required: { text: '无需加密' },
      recommended: { text: '建议加密' },
      confirmed: { text: '确认加密' },
    },
    render: (_, record) => {
      const protectionStatus = protectionStatusMap[record.encryptionStatus];
      return <Tag color={protectionStatus.color}>{protectionStatus.text}加密</Tag>;
    },
  },
  {
    title: '样本',
    dataIndex: 'sample',
    align: 'center',
    search: false,
    render: (_, record) => (
      <Button type="link" onClick={() => onShowSampleData(record)}>
        查看样本
      </Button>
    ),
  },
  {
    title: '更新时间',
    dataIndex: 'updateTime',
    align: 'center',
    valueType: 'dateTime',
    search: false,
  },
];
