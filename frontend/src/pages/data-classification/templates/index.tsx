import { CopyOutlined, DeleteOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useNavigate } from '@umijs/max';
import { Badge, Button, Card, Empty, Modal, Space, Switch, message } from 'antd';
import React, { useEffect, useState } from 'react';
import './index.less';
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

  const activeTemplateCount = templates.filter((item) => item.status === 'active').length;
  const draftTemplateCount = templates.filter((item) => item.status === 'draft').length;

  return (
    <PageContainer
      className="templatePage"
      title="Template Library"
      subTitle="集中查看分类模板、比较状态差异，并进入模板编辑流程。"
    >
      {contextHolder}
      <div className="templateShell">
        {templates.length ? (
          <div className="templateGrid">
            <Card
              hoverable
              className="templateCreateCard"
              onClick={() => navigate('/data-classification/template-add')}
            >
              <div className="templateCreateInner">
                <div className="templateCreatePlus">+</div>
                <div className="templateCreateTitle">新增模板</div>
                <div className="templateCreateDesc">点击创建新的分类分级模板</div>
              </div>
            </Card>

            {templates.map((item) => (
              <Card
                key={item.id}
                hoverable
                className="templateCard"
                onClick={() => handleViewDetail(item)}
              >
                <div className="templateCardBody">
                  <div className="templateCardHead">
                    <h3 className="templateCardTitle">
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

                  <div className="templateStatusRow">
                    <div className="templateStatusMeta">
                      <Badge status={getStatusColor(item.status) as never} text={getStatusText(item.status)} />
                      <span className="templateTypeText">
                        类型：{item.templateType}
                      </span>
                    </div>
                  </div>

                  <div className="templateCardDesc">
                    {item.description}
                  </div>

                  <div className="templateRuleRow">
                    <div className="templateRuleMeta">
                      <span>识别规则数：</span>
                      <span className="templateRuleValue">{item.ruleCount}</span>
                    </div>
                  </div>

                  <div className="templateMetaBlock">
                    <div>创建人：{item.creator}</div>
                    <div className="templateMetaRow">
                      <span style={{ whiteSpace: 'nowrap' }}>创建时间：{item.createTime}</span>
                      <span style={{ whiteSpace: 'nowrap' }}>更新时间：{item.updatedAt}</span>
                    </div>
                  </div>
                </div>

                <div className="templateActionRow">
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
          <Card className="templateEmptyCard">
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
