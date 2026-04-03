import type { ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { useNavigate } from '@umijs/max';
import {
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tag,
  message,
  type TableColumnsType,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import React, { useMemo, useState } from 'react';
import {
  buildAutoScanRuleFormValues,
  cancelIgnoreAutoScanResult,
  createAutoScanRule,
  executeAutoScan,
  ignoreAutoScanResult,
  listAutoScanResults,
  listAutoScanRules,
  toggleAutoScanRuleStatus,
  updateAutoScanRule,
  type AutoScanResult,
  type AutoScanRule,
  type AutoScanRuleFormValues,
} from '@/services/data-assets/autoScanStore';
import { formatBeijingDateTime, parseBeijingDateTime } from '@/utils/datetime';

const { Search, TextArea } = Input;

const RESULT_STATUS_META: Record<
  AutoScanResult['status'],
  { color: string; text: string; badgeStatus: 'default' | 'warning' | 'success' }
> = {
  pending: { color: 'gold', text: '待处理', badgeStatus: 'warning' },
  ignored: { color: 'default', text: '已忽略', badgeStatus: 'default' },
  claimed: { color: 'green', text: '已导入', badgeStatus: 'success' },
};

const RULE_STATUS_META: Record<AutoScanRule['status'], { color: string; text: string }> = {
  enabled: { color: 'green', text: '启用中' },
  disabled: { color: 'default', text: '已停用' },
};

interface IgnoreFormValues {
  reason: string;
}

interface RuleFormValues {
  ipRange: string;
  portRange: string;
  scheduleMode: AutoScanRuleFormValues['scheduleMode'];
  firstScanTime: Dayjs;
  status: AutoScanRuleFormValues['status'];
}

const formatPortRange = (portRange: string) =>
  portRange === '0' ? '全端口（0）' : portRange;

const formatResultIdentity = (record: Pick<AutoScanResult, 'ipAddress' | 'port'>) =>
  `${record.ipAddress}:${record.port}`;

const formatRuleIdentity = (record: Pick<AutoScanRule, 'ipRange' | 'portRange'>) =>
  `${record.ipRange} / ${formatPortRange(record.portRange)}`;

const AutoScanDataAssetsPage: React.FC = () => {
  React.useEffect(() => {
    refreshPageData();
  }, []);

  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [rules, setRules] = useState<AutoScanRule[]>([]);
  const [results, setResults] = useState<AutoScanResult[]>([]);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AutoScanResult['status']>('all');
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [ignoreModalOpen, setIgnoreModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoScanRule | null>(null);
  const [ignoreTarget, setIgnoreTarget] = useState<AutoScanResult | null>(null);
  const [ruleForm] = Form.useForm<RuleFormValues>();
  const [ignoreForm] = Form.useForm<IgnoreFormValues>();

  const refreshPageData = async () => {
    const [ruleData, resultData] = await Promise.all([listAutoScanRules(), listAutoScanResults()]);
    setRules(ruleData);
    setResults(resultData);
  };

  const navigateToImportForm = (record: AutoScanResult) => {
    const search = new URLSearchParams({
      sourceType: 'database',
      ipAddress: record.ipAddress,
      port: String(record.port),
      databaseType: record.databaseType,
      from: 'asset-discovery',
      scanResultId: record.id,
    });

    navigate(`/data-assets/data-import-form?${search.toString()}`);
  };

  const summary = useMemo(() => {
    const pendingCount = results.filter((item) => item.status === 'pending').length;
    const ignoredCount = results.filter((item) => item.status === 'ignored').length;
    const claimedCount = results.filter((item) => item.status === 'claimed').length;
    const enabledRuleCount = rules.filter((item) => item.status === 'enabled').length;

    return {
      totalResults: results.length,
      pendingCount,
      ignoredCount,
      claimedCount,
      enabledRuleCount,
    };
  }, [results, rules]);

  const filteredResults = useMemo(() => {
    return results.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const searchText = [
        item.ipAddress,
        String(item.port),
        item.databaseType,
        item.claimedAssetName,
        item.ignoreReason,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchText.includes(keyword.toLowerCase());
    });
  }, [keyword, results, statusFilter]);

  const ruleColumns: TableColumnsType<AutoScanRule> = [
    {
      title: 'IP 范围',
      dataIndex: 'ipRange',
      width: 220,
      ellipsis: true,
      render: (_, record) => (
        <span style={{ whiteSpace: 'nowrap' }}>{record.ipRange}</span>
      ),
    },
    {
      title: '端口',
      dataIndex: 'portRange',
      width: 180,
      ellipsis: true,
      render: (_, record) => (
        <span style={{ whiteSpace: 'nowrap' }}>{formatPortRange(record.portRange)}</span>
      ),
    },
    {
      title: '扫描周期',
      dataIndex: 'scheduleLabel',
      width: 240,
      ellipsis: true,
      render: (_, record) =>
        (
          <span style={{ whiteSpace: 'nowrap' }}>
            {record.scheduleLabel} / 首次 {formatBeijingDateTime(record.firstScanTime, 'YYYY-MM-DD HH:mm')}
          </span>
        ),
    },
    {
      title: '最近一次扫描时间',
      dataIndex: 'lastScanTime',
      width: 180,
      ellipsis: true,
      render: (_, record) => (
        <span style={{ whiteSpace: 'nowrap' }}>{record.lastScanTime || '-'}</span>
      ),
    },
    {
      title: '命中',
      dataIndex: 'hitCount',
      align: 'center',
      width: 100,
      render: (_, record) => <Badge count={record.hitCount} color="#1677ff" />,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 150,
      render: (_, record) => (
        <Space>
          <Tag color={RULE_STATUS_META[record.status].color}>{RULE_STATUS_META[record.status].text}</Tag>
          <Switch
            size="small"
            checked={record.status === 'enabled'}
            onChange={async (checked) => {
              await toggleAutoScanRuleStatus(record.id, checked ? 'enabled' : 'disabled');
              await refreshPageData();
              messageApi.success(`规则已${checked ? '启用' : '停用'}：${formatRuleIdentity(record)}`);
            }}
          />
        </Space>
      ),
    },
    {
      title: '操作',
      dataIndex: 'option',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          style={{ padding: 0 }}
          onClick={() => {
            setEditingRule(record);
            ruleForm.setFieldsValue({
              ipRange: record.ipRange,
              portRange: record.portRange,
              scheduleMode: record.scheduleMode,
              firstScanTime:
                parseBeijingDateTime(record.firstScanTime) ?? dayjs(),
              status: record.status,
            });
            setRuleModalOpen(true);
          }}
        >
          编辑规则
        </Button>
      ),
    },
  ];

  const resultColumns: ProColumns<AutoScanResult>[] = [
    {
      title: 'IP',
      dataIndex: 'ipAddress',
      search: false,
      width: 180,
      ellipsis: true,
      render: (_, record) => <span style={{ whiteSpace: 'nowrap' }}>{record.ipAddress}</span>,
    },
    {
      title: '端口',
      dataIndex: 'port',
      search: false,
      width: 120,
      ellipsis: true,
      render: (_, record) => <span style={{ whiteSpace: 'nowrap' }}>{record.port}</span>,
    },
    {
      title: '数据库类型',
      dataIndex: 'databaseType',
      search: false,
      width: 160,
      ellipsis: true,
      render: (_, record) => <span style={{ whiteSpace: 'nowrap' }}>{record.databaseType || '-'}</span>,
    },
    {
      title: '处理状态',
      dataIndex: 'status',
      search: false,
      width: 220,
      render: (_, record) => (
        <Space size={8} wrap={false}>
          <Badge
            status={RESULT_STATUS_META[record.status].badgeStatus}
            text={<Tag color={RESULT_STATUS_META[record.status].color}>{RESULT_STATUS_META[record.status].text}</Tag>}
          />
          {record.status === 'ignored' ? (
            <span style={{ color: '#8c8c8c', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              原因：{record.ignoreReason}
            </span>
          ) : null}
          {record.status === 'claimed' ? (
            <span style={{ color: '#8c8c8c', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              正式资产：{record.claimedAssetName}
            </span>
          ) : null}
        </Space>
      ),
    },
    {
      title: '首次发现时间',
      dataIndex: 'discoveredAt',
      search: false,
      width: 180,
      ellipsis: true,
      render: (_, record) => (
        <span style={{ whiteSpace: 'nowrap' }}>{record.discoveredAt}</span>
      ),
    },
    {
      title: '最近发现时间',
      dataIndex: 'lastSeenAt',
      search: false,
      width: 180,
      ellipsis: true,
      render: (_, record) => (
        <span style={{ whiteSpace: 'nowrap' }}>{record.lastSeenAt}</span>
      ),
    },
    {
      title: '操作',
      dataIndex: 'option',
      valueType: 'option',
      width: 160,
      render: (_, record) => (
        <Space size={4} wrap={false}>
          {record.status !== 'claimed' && record.status !== 'ignored' ? (
            <Button
              type="link"
              size="small"
              style={{ padding: 0 }}
              onClick={() => navigateToImportForm(record)}
            >
              导入
            </Button>
          ) : null}
          {record.status !== 'claimed' && record.status !== 'ignored' ? (
            <Button
              type="link"
              size="small"
              danger
              style={{ padding: 0 }}
              onClick={() => {
                setIgnoreTarget(record);
                ignoreForm.resetFields();
                setIgnoreModalOpen(true);
              }}
            >
              忽略
            </Button>
          ) : null}
          {record.status === 'ignored' ? (
            <Button
              type="link"
              size="small"
              style={{ padding: 0 }}
              onClick={() => {
                Modal.confirm({
                  title: '确认取消忽略',
                  content: `取消后 ${formatResultIdentity(record)} 会重新回到待处理队列。`,
                  onOk: async () => {
                    await cancelIgnoreAutoScanResult(record.id);
                    await refreshPageData();
                    messageApi.success(`已取消忽略：${formatResultIdentity(record)}`);
                  },
                });
              }}
            >
              取消忽略
            </Button>
          ) : null}
          {record.status === 'claimed' ? (
            <Button
              type="link"
              size="small"
              style={{ padding: 0 }}
              onClick={() => navigate('/data-assets/data-asset-list')}
            >
              查看正式资产
            </Button>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="数据资产发现"
      extra={[
        <Button
          key="asset-list"
          onClick={() => navigate('/data-assets/data-asset-list')}
        >
          查看正式资产
        </Button>,
        <Button
          key="execute"
          type="primary"
          onClick={async () => {
            const execution = await executeAutoScan();
            await refreshPageData();
            messageApi.success(
              `本次扫描已执行 ${execution.touchedRuleCount} 条启用规则，新增 ${execution.createdResultCount} 条发现结果。`,
            );
          }}
        >
          立即执行扫描
        </Button>,
      ]}
    >
      {contextHolder}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="本次发现资产" value={summary.totalResults} suffix="条" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="待处理" value={summary.pendingCount} suffix="条" valueStyle={{ color: '#d48806' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="已忽略"
              value={summary.ignoredCount}
              suffix="条"
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="启用规则 / 已导入"
              value={`${summary.enabledRuleCount} / ${summary.claimedCount}`}
              valueStyle={{ color: '#389e0d' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="扫描规则配置"
        extra={
          <Button
            type="primary"
            onClick={() => {
              setEditingRule(null);
              ruleForm.resetFields();
              ruleForm.setFieldsValue({
                scheduleMode: 'daily',
                firstScanTime: dayjs().add(1, 'day').hour(2).minute(0).second(0),
                status: 'enabled',
              });
              setRuleModalOpen(true);
            }}
          >
            新增规则
          </Button>
        }
        style={{ marginBottom: 16 }}
      >
        <Table<AutoScanRule>
          rowKey="id"
          size="small"
          pagination={false}
          columns={ruleColumns}
          dataSource={rules}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      <ProTable<AutoScanResult>
        rowKey="id"
        headerTitle="发现结果"
        search={false}
        options={false}
        size="small"
        columns={resultColumns}
        dataSource={filteredResults}
        tableStyle={{ whiteSpace: 'nowrap' }}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
        }}
        toolBarRender={() => [
          <Search
            key="keyword"
            allowClear
            placeholder="搜索 IP、端口或数据库类型"
            style={{ width: 320 }}
            onSearch={(value) => setKeyword(value)}
            onChange={(event) => {
              if (!event.target.value) {
                setKeyword('');
              }
            }}
          />,
          <Select
            key="status"
            style={{ width: 160 }}
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { label: '全部状态', value: 'all' },
              { label: '待处理', value: 'pending' },
              { label: '已忽略', value: 'ignored' },
              { label: '已导入', value: 'claimed' },
            ]}
          />,
        ]}
        scroll={{ x: 'max-content' }}
      />

      <Modal
        title={editingRule ? '编辑扫描规则' : '新增扫描规则'}
        open={ruleModalOpen}
        width={720}
        destroyOnClose
        onCancel={() => {
          setRuleModalOpen(false);
          setEditingRule(null);
          ruleForm.resetFields();
        }}
        onOk={() => ruleForm.submit()}
      >
        <Form<RuleFormValues>
          form={ruleForm}
          layout="vertical"
          onFinish={async (values) => {
            const payload: AutoScanRuleFormValues = buildAutoScanRuleFormValues({
              ipRange: values.ipRange,
              portRange: values.portRange,
              scheduleMode: values.scheduleMode,
              firstScanTime: values.firstScanTime.format('YYYY-MM-DD HH:mm:ss'),
              status: values.status,
            });

            if (editingRule) {
              await updateAutoScanRule(editingRule.id, payload);
              messageApi.success(`规则已更新：${values.ipRange} / ${formatPortRange(values.portRange)}`);
            } else {
              await createAutoScanRule(payload);
              messageApi.success(`规则已创建：${values.ipRange} / ${formatPortRange(values.portRange)}`);
            }

            setRuleModalOpen(false);
            setEditingRule(null);
            ruleForm.resetFields();
            await refreshPageData();
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="IP 范围"
                name="ipRange"
                rules={[{ required: true, message: '请输入 IP 范围' }]}
              >
                <Input placeholder="例如：10.23.16.0/24" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="端口范围"
                name="portRange"
                rules={[{ required: true, message: '请输入端口范围' }]}
                extra="填写 0 代表扫描全端口，也可输入单个端口、多个端口或范围。"
              >
                <Input placeholder="例如：0 或 3306,5432,8000-8100" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="扫描周期"
                name="scheduleMode"
                rules={[{ required: true, message: '请选择扫描周期' }]}
              >
                <Select
                  options={[
                    { label: '每天', value: 'daily' },
                    { label: '每周', value: 'weekly' },
                    { label: '每月', value: 'monthly' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="首次扫描时间"
                name="firstScanTime"
                rules={[{ required: true, message: '请选择首次扫描时间' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  showTime
                  format="YYYY-MM-DD HH:mm:ss"
                  placeholder="请选择首次扫描时间"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="状态" name="status" rules={[{ required: true, message: '请选择状态' }]}>
                <Select
                  options={[
                    { label: '启用', value: 'enabled' },
                    { label: '停用', value: 'disabled' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title="忽略扫描结果"
        open={ignoreModalOpen}
        width={560}
        destroyOnClose
        onCancel={() => {
          setIgnoreModalOpen(false);
          setIgnoreTarget(null);
          ignoreForm.resetFields();
        }}
        onOk={() => ignoreForm.submit()}
      >
        <Form<IgnoreFormValues>
          form={ignoreForm}
          layout="vertical"
          onFinish={async (values) => {
            if (!ignoreTarget) {
              return;
            }

            await ignoreAutoScanResult(ignoreTarget.id, values.reason);
            setIgnoreModalOpen(false);
            setIgnoreTarget(null);
            ignoreForm.resetFields();
            await refreshPageData();
            messageApi.success(`已忽略：${formatResultIdentity(ignoreTarget)}`);
          }}
        >
          <Form.Item
            label="忽略原因"
            name="reason"
            rules={[{ required: true, message: '请输入忽略原因' }]}
          >
            <TextArea
              rows={4}
              placeholder="请填写忽略原因，例如测试环境、重复资产或已下线实例"
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default AutoScanDataAssetsPage;
