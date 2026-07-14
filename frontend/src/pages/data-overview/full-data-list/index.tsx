import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, Drawer, Table, message } from 'antd';
import React, { useRef, useState } from 'react';
import {
  listFullDataItems,
  type FullDataItem,
} from '@/services/data-overview/overviewStore';
import { sortDeletedLast } from '@/utils/collection';
import {
  buildSampleDataItems,
  createFieldDisplayColumns,
  sampleColumns,
  type SampleDataItem,
} from '../shared/fieldDisplay';

const FullDataList: React.FC = () => {
  const actionRef = useRef<ActionType | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [sampleDrawerVisible, setSampleDrawerVisible] = useState(false);
  const [currentSampleData, setCurrentSampleData] = useState<SampleDataItem[]>([]);
  const [currentFieldName, setCurrentFieldName] = useState('');

  const showSampleData = (record: FullDataItem) => {
    setCurrentSampleData(buildSampleDataItems(record.sampleData, record.updateTime));
    setCurrentFieldName(record.fieldName);
    setSampleDrawerVisible(true);
  };

  const columns: ProColumns<FullDataItem>[] = createFieldDisplayColumns(showSampleData);

  return (
    <PageContainer className="nothingPage" title="Full Data List" subTitle="查看完整字段清单，并检索分类、分级、脱敏和加密状态。">
      {contextHolder}
      <ProTable<FullDataItem>
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 120,
          span: {
            xs: 24,
            sm: 12,
            md: 8,
            lg: 8,
            xl: 6,
            xxl: 6,
          },
          defaultCollapsed: true,
        }}
        toolBarRender={() => [
          <Button
            key="export"
            onClick={() => {
              messageApi.info('导出数据功能待接入');
            }}
          >
            导出数据
          </Button>,
        ]}
        request={async (params) => {
          try {
            const {
              databaseName,
              tableName,
              fieldName,
              fieldComment,
              dataType,
              dataTypeName,
              dataLevel,
              isSensitive,
              maskingStatus,
              encryptionStatus,
              rootGroupName,
            } = params as Record<string, any>;

            const rows = await listFullDataItems();
            let filteredData = sortDeletedLast(rows);
            if (databaseName) filteredData = filteredData.filter((item) => item.databaseName.includes(String(databaseName)));
            if (tableName) filteredData = filteredData.filter((item) => item.tableName.includes(String(tableName)));
            if (fieldName) filteredData = filteredData.filter((item) => item.fieldName.includes(String(fieldName)));
            if (fieldComment) filteredData = filteredData.filter((item) => item.fieldComment.includes(String(fieldComment)));
            if (dataType) filteredData = filteredData.filter((item) => item.dataType === dataType);
            if (dataTypeName) filteredData = filteredData.filter((item) => item.dataTypeName.includes(String(dataTypeName)));
            if (dataLevel) filteredData = filteredData.filter((item) => item.dataLevel === dataLevel);
            if (isSensitive !== undefined) filteredData = filteredData.filter((item) => item.isSensitive === (isSensitive === true || isSensitive === 'true'));
            if (maskingStatus) filteredData = filteredData.filter((item) => item.maskingStatus === maskingStatus);
            if (encryptionStatus) filteredData = filteredData.filter((item) => item.encryptionStatus === encryptionStatus);
            if (rootGroupName) filteredData = filteredData.filter((item) => item.rootGroupName.includes(String(rootGroupName)));

            return {
              data: filteredData,
              success: true,
              total: filteredData.length,
            };
          } catch {
            messageApi.error('加载全量数据列表失败');
            return {
              data: [],
              success: false,
              total: 0,
            };
          }
        }}
        columns={columns}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
        }}
        tableStyle={{
          textAlign: 'center',
        }}
      />

      <Drawer
        title={`${currentFieldName} - 样本数据`}
        placement="right"
        width={600}
        onClose={() => setSampleDrawerVisible(false)}
        open={sampleDrawerVisible}
      >
        <Table columns={sampleColumns} dataSource={currentSampleData} pagination={false} size="small" />
      </Drawer>
    </PageContainer>
  );
};

export default FullDataList;
