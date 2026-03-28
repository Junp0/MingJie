import { Form, Input, Modal, Select, message } from 'antd';
import React, { useEffect, useState } from 'react';
import {
  getClassificationTemplateById,
  updateClassificationTemplate,
  type ClassificationTemplateRecord,
  type TemplateFormValues,
} from '@/services/data-classification/templateStore';

const { TextArea } = Input;

interface TemplateEditModalProps {
  open: boolean;
  templateId: string | null;
  onCancel: () => void;
  onSaved?: (template: ClassificationTemplateRecord) => void;
}

const TemplateEditModal: React.FC<TemplateEditModalProps> = ({
  open,
  templateId,
  onCancel,
  onSaved,
}) => {
  const [form] = Form.useForm<TemplateFormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const [submitting, setSubmitting] = useState(false);
  const [templateExists, setTemplateExists] = useState(true);

  useEffect(() => {
    if (!open || !templateId) {
      return;
    }

    const template = getClassificationTemplateById(templateId);
    if (!template) {
      setTemplateExists(false);
      form.resetFields();
      return;
    }

    setTemplateExists(true);
    form.setFieldsValue({
      templateName: template.templateName,
      status: template.status,
      description: template.description,
    });
  }, [form, open, templateId]);

  const handleOk = async () => {
    if (!templateId) {
      return;
    }

    const values = await form.validateFields();
    setSubmitting(true);

    try {
      const updated = updateClassificationTemplate(templateId, values);
      if (!updated) {
        setTemplateExists(false);
        messageApi.error('未找到要编辑的模板');
        return;
      }

      messageApi.success('模板保存成功');
      onSaved?.(updated);
      onCancel();
    } catch (error) {
      messageApi.error('保存失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {contextHolder}
      <Modal
        title="编辑模板"
        open={open}
        onOk={handleOk}
        onCancel={onCancel}
        okText="保存"
        cancelText="取消"
        confirmLoading={submitting}
        destroyOnClose
        width={720}
      >
        {templateExists ? (
          <Form<TemplateFormValues> form={form} layout="vertical">
            <Form.Item
              label="模板名称"
              name="templateName"
              rules={[{ required: true, message: '请输入模板名称' }]}
            >
              <Input placeholder="请输入模板名称" maxLength={50} />
            </Form.Item>

            <Form.Item
              label="状态"
              name="status"
              rules={[{ required: true, message: '请选择状态' }]}
            >
              <Select
                placeholder="请选择状态"
                options={[
                  { value: 'active', label: '启用' },
                  { value: 'inactive', label: '停用' },
                  { value: 'draft', label: '草稿' },
                ]}
              />
            </Form.Item>

            <Form.Item
              label="模板描述"
              name="description"
              rules={[{ required: true, message: '请输入模板描述' }]}
            >
              <TextArea rows={4} placeholder="请输入模板描述" showCount maxLength={500} />
            </Form.Item>
          </Form>
        ) : (
          <div style={{ color: '#8c8c8c' }}>未找到模板，请关闭弹框后刷新页面重试。</div>
        )}
      </Modal>
    </>
  );
};

export default TemplateEditModal;
