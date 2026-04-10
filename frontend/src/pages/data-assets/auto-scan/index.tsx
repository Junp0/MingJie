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
  Progress,
  Row,
  Select,
  Space,
  Statistic,

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
  deleteAutoScanRule,
  executeAutoScan,
  ignoreAutoScanResult,
  listAutoScanResults,
  listAutoScanRules,
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
  const [ruleFilter, setRuleFilter] = useState<string | null>(null);
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
    const importedCount = results.filter((item) => !!item.importTaskId || item.status === 'claimed').length;
    const pendingCount = results.filter((item) => item.status === 'pending' && !item.importTaskId).length;
    const ignoredCount = results.filter((item) => item.status === 'ignored').length;

    return {
      totalResults: results.length,
      importedCount,
      pendingCount,
      ignoredCount,
    };
  }, [results]);

  const filteredResults = useMemo(() => {
    return results.filter((item) => {
      if (ruleFilter && item.matchedRuleId !== ruleFilter) {
        return false;
      }

      if (statusFilter !== 'all') {
        const isImported = !!item.importTaskId;
        if (statusFilter === 'claimed') {
          if (!isImported && item.status !== 'claimed') return false;
        } else {
          if (isImported || item.status !== statusFilter) return false;
        }
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
  }, [keyword, results, ruleFilter, statusFilter]);

  const ruleColumns: TableColumnsType<AutoScanRule> = [
    {
      title: 'IP 范围',
      dataIndex: 'ipRange',
      width: 220,
      ellipsis: true,
      render: (_, record) => (
        <a
          style={{ whiteSpace: 'nowrap' }}
          onClick={() => setRuleFilter(ruleFilter === record.id ? null : record.id)}
        >
          {record.ipRange}
        </a>
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
      render: (_, record) => (
        <a onClick={() => setRuleFilter(ruleFilter === record.id ? null : record.id)}>
          <Badge count={record.hitCount} color="#1677ff" />
        </a>
      ),
    },
    {
      title: '扫描进度',
      dataIndex: 'scanProgress',
      width: 220,
      render: (_, record) => {
        if (record.scanProgress == null) {
          return <span style={{ color: '#8c8c8c' }}>-</span>;
        }
        if (record.scanProgress === -1) {
          return <Progress percent={0} status="exception" format={() => '失败'} size="small" />;
        }
        return (
          <Space direction="vertical" size={0} style={{ width: '100%' }}>
            <Progress
              percent={record.scanProgress}
              size="small"
              status={record.scanProgress === 100 ? 'success' : 'active'}
            />
            {record.scanStatus ? (
              <span style={{ color: '#8c8c8c', fontSize: 11 }}>{record.scanStatus}</span>
            ) : null}
          </Space>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (_, record) => (
        <Tag color={RULE_STATUS_META[record.status].color}>{RULE_STATUS_META[record.status].text}</Tag>
      ),
    },
    {
      title: '操作',
      dataIndex: 'option',
      width: 220,
      render: (_, record) => (
        <Space size={4} wrap={false}>
          <Button
            type="link"
            size="small"
            style={{ padding: 0 }}
            onClick={() => {
              Modal.confirm({
                title: '确认执行扫描',
                content: `即将对规则 ${formatRuleIdentity(record)} 执行扫描，是否继续？`,
                onOk: async () => {
                  await executeAutoScan(record.id);
                  messageApi.success('扫描任务已提交，请稍后刷新查看结果。');
                  await refreshPageData();
                },
              });
            }}
          >
            立即执行扫描
          </Button>
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
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            style={{ padding: 0 }}
            onClick={() => {
              Modal.confirm({
                title: '确认删除规则',
                content: `删除后该规则及其所有发现结果将被永久移除。`,
                okType: 'danger',
                onOk: async () => {
                  await deleteAutoScanRule(record.id);
                  await refreshPageData();
                  messageApi.success(`规则已删除：${formatRuleIdentity(record)}`);
                },
              });
            }}
          >
            删除
          </Button>
        </Space>
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
      render: (_, record) => {
        if (record.importTaskId) {
          return (
            <Space size={8} wrap={false}>
              <Badge
                status="processing"
                text={
                  <Tag
                    color="blue"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/data-assets/import-detail/${record.importTaskId}`)}
                  >
                    已导入
                  </Tag>
                }
              />
            </Space>
          );
        }
        return (
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
        );
      },
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
          {record.importTaskId ? (
            <Button
              type="link"
              size="small"
              style={{ padding: 0 }}
              onClick={() => navigate(`/data-assets/import-detail/${record.importTaskId}`)}
            >
              查看导入任务
            </Button>
          ) : (
            <>
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
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="Asset Discovery"
      className="nothingPage"
      subTitle="集中管理扫描规则、发现结果、忽略状态与导入接管决策。"
      extra={[
        <Button
          key="asset-list"
          onClick={() => navigate('/data-assets/data-asset-list')}
        >
          查看正式资产
        </Button>,
      ]}
    >
      {contextHolder}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="发现资产" value={summary.totalResults} suffix="条" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="已导入" value={summary.importedCount} suffix="条" valueStyle={{ color: '#389e0d' }} />
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
        headerTitle={
          ruleFilter ? (
            <Space>
              <span>发现结果</span>
              <Tag
                closable
                color="blue"
                onClose={() => setRuleFilter(null)}
              >
                {rules.find((r) => r.id === ruleFilter)?.ipRange ?? '规则筛选'}
              </Tag>
            </Space>
          ) : '发现结果'
        }
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
