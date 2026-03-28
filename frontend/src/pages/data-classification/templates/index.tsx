import { CopyOutlined, DeleteOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useNavigate } from '@umijs/max';
import { Badge, Button, Card, Empty, Modal, Space, Switch, message } from 'antd';
import React, { useEffect, useState } from 'react';
import TemplateEditModal from '../components/TemplateEditModal';
import {
  deleteClassificationTemplate,
  duplicateClassificationTemplate,
  listClassificationTemplates,
  type ClassificationTemplateSummary,
  updateClassificationTemplateStatus,
} from '@/services/data-classification/templateStore';

const ClassificationTemplates: React.FC = () => {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [templates, setTemplates] = useState<ClassificationTemplateSummary[]>([]);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  const loadTemplates = async () => {
    const data = await listClassificationTemplates();
    setTemplates(data);
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleViewDetail = (record: ClassificationTemplateSummary) => {
    navigate(`/data-classification/template-detail/${record.id}`);
  };

  const handleEdit = (record: ClassificationTemplateSummary) => {
    setEditingTemplateId(record.id);
  };

  const handleCopy = async (record: ClassificationTemplateSummary) => {
    const duplicated = await duplicateClassificationTemplate(record.id);
    if (!duplicated) {
      messageApi.error('复制模板失败，请刷新后重试');
      return;
    }

    await loadTemplates();
    messageApi.success(`已复制模板：${record.templateName}`);
  };

  const handleDelete = (record: ClassificationTemplateSummary) => {
    Modal.confirm({
      title: '确认删除模板',
      content: `确定要删除模板“${record.templateName}”吗？此操作不可恢复。`,
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        const deleted = await deleteClassificationTemplate(record.id);
        if (!deleted) {
          messageApi.error('删除失败，请刷新后重试');
          return;
        }

        await loadTemplates();
        messageApi.success(`已删除模板：${record.templateName}`);
      },
    });
  };

  const handleStatusChange = (record: ClassificationTemplateSummary, checked: boolean) => {
    const nextStatus = checked ? 'active' : 'inactive';
    const actionText = checked ? '启用' : '停用';

    Modal.confirm({
      title: '确认操作',
      content: `确定要${actionText}模板“${record.templateName}”吗？`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        const updated = await updateClassificationTemplateStatus(record.id, nextStatus);
        if (!updated) {
          messageApi.error(`模板${actionText}失败，请重试`);
          return;
        }

        await loadTemplates();
        messageApi.success(`模板${actionText}成功`);
      },
    });
  };

  const getStatusColor = (status: ClassificationTemplateSummary['status']) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'default';
      case 'draft':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: ClassificationTemplateSummary['status']) => {
    switch (status) {
      case 'active':
        return '启用';
      case 'inactive':
        return '停用';
      case 'draft':
        return '草稿';
      default:
        return status;
    }
  };

  return (
    <PageContainer>
      {contextHolder}
      <div style={{ padding: 24 }}>
        {templates.length ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: 16,
            }}
          >
            <Card
              hoverable
              style={{ height: 300, cursor: 'pointer' }}
              bodyStyle={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
              }}
              onClick={() => navigate('/data-classification/template-add')}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#1677ff',
                }}
              >
                <div style={{ fontSize: 48, lineHeight: 1, marginBottom: 16 }}>+</div>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>新增模板</div>
                <div style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
                  点击创建新的分类分级模板
                </div>
              </div>
            </Card>

            {templates.map((item) => (
              <Card
                key={item.id}
                hoverable
                style={{ height: 300, cursor: 'pointer' }}
                bodyStyle={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: 16,
                }}
                onClick={() => handleViewDetail(item)}
              >
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div
                    style={{
                      marginBottom: 12,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 16,
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.templateName}
                    </h3>
                    <Switch
                      checked={item.status === 'active'}
                      size="small"
                      disabled={item.status === 'draft'}
                      onChange={(checked, event) => {
                        event?.stopPropagation();
                        handleStatusChange(item, checked);
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                      }}
                    >
                      <Badge status={getStatusColor(item.status) as never} text={getStatusText(item.status)} />
                      <span
                        style={{
                          color: '#8c8c8c',
                          fontSize: 12,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        类型：{item.templateType}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      marginBottom: 12,
                      color: '#666',
                      fontSize: 14,
                      minHeight: 66,
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {item.description}
                  </div>

                  <div style={{ marginBottom: 12, fontSize: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>识别规则数：</span>
                      <span style={{ fontWeight: 600 }}>{item.ruleCount}</span>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 'auto',
                      fontSize: 12,
                      color: '#999',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <div>创建人：{item.creator}</div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 8,
                      }}
                    >
                      <span style={{ whiteSpace: 'nowrap' }}>创建时间：{item.createTime}</span>
                      <span style={{ whiteSpace: 'nowrap' }}>更新时间：{item.updatedAt}</span>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 12,
                    borderTop: '1px solid #f0f0f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <Button
                    type="link"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleViewDetail(item);
                    }}
                  >
                    查看
                  </Button>
                  <Button
                    type="link"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleEdit(item);
                    }}
                  >
                    编辑
                  </Button>
                  <Button
                    type="link"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleCopy(item);
                    }}
                  >
                    复制
                  </Button>
                  <Button
                    danger
                    type="link"
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDelete(item);
                    }}
                  >
                    删除
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <Empty
              description="暂无模板"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Space>
                <Button type="primary" onClick={() => navigate('/data-classification/template-add')}>
                  创建模板
                </Button>
              </Space>
            </Empty>
          </Card>
        )}
      </div>
      <TemplateEditModal
        open={Boolean(editingTemplateId)}
        templateId={editingTemplateId}
        onCancel={() => setEditingTemplateId(null)}
        onSaved={() => {
          loadTemplates();
        }}
      />
    </PageContainer>
  );
};

export default ClassificationTemplates;
