import { ArrowLeftOutlined, CloseOutlined, SaveOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useNavigate } from '@umijs/max';
import { Button, Card, Divider, Form, Input, Select, Typography, message } from 'antd';
import React, { useState } from 'react';
import {
  createClassificationTemplate,
  type TemplateFormValues,
} from '@/services/data-classification/templateStore';

const { Title } = Typography;
const { TextArea } = Input;

const TemplateAdd: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<TemplateFormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: TemplateFormValues) => {
    setLoading(true);

    try {
      const template = await createClassificationTemplate(values);
      messageApi.success('模板创建成功');
      navigate(`/data-classification/template-detail/${template.id}`);
    } catch (error) {
      messageApi.error('创建失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      header={{
        title: '新增模板',
        onBack: () => navigate('/data-classification/templates'),
        backIcon: <ArrowLeftOutlined />,
      }}
    >
      {contextHolder}
      <div style={{ padding: 24 }}>
        <Card>
          <div style={{ marginBottom: 24 }}>
            <Title level={3}>基本信息</Title>
          </div>

          <Form<TemplateFormValues>
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{ status: 'draft' }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
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
            </div>

            <Form.Item
              label="模板描述"
              name="description"
              rules={[{ required: true, message: '请输入模板描述' }]}
            >
              <TextArea
                rows={4}
                placeholder="请输入模板描述"
                showCount
                maxLength={500}
              />
            </Form.Item>

            <Divider />

            <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={loading}
                size="large"
              >
                创建模板
              </Button>
              <Button
                icon={<CloseOutlined />}
                onClick={() => navigate('/data-classification/templates')}
                size="large"
              >
                取消
              </Button>
            </div>
          </Form>
        </Card>
      </div>
    </PageContainer>
  );
};

export default TemplateAdd;
