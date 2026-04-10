import {
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useNavigate, useParams } from '@umijs/max';
import {
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import TemplateEditModal from '../components/TemplateEditModal';
import {
  addClassificationCategory,
  addClassificationDataType,
  addClassificationLevelDefinition,
  collectDataTypes,
  countCategoryNodes,
  createDefaultRuleCondition,
  deleteClassificationCategory,
  deleteClassificationDataType,
  deleteClassificationLevelDefinition,
  deleteClassificationTemplate,
  findCategoryById,
  formatRuleSummary,
  getClassificationTemplateById,
  getDefaultLevelDefinitions,
  initializeClassificationTemplate,
  LEVEL_COLOR_PRESET_OPTIONS,
  RULE_MATCH_MODE_OPTIONS,
  RULE_MATCH_TARGET_OPTIONS,
  RULE_MATCHER_OPTIONS,
  type CategoryNode,
  type ClassificationTemplateRecord,
  type DataTypeFormValues,
  type DataTypeItem,
  type LevelCode,
  type LevelDefinitionItem,
  type LevelDefinitionFormValues,
  type RuleConfig,
  type RuleCondition,
  updateClassificationCategory,
  updateClassificationDataType,
  updateClassificationLevelDefinition,
} from '@/services/data-classification/templateStore';

const { Text } = Typography;

type TemplateTabKey = 'catalog' | 'levels';
type DataTypeModalMode = 'create' | 'edit';
type LevelModalMode = 'create' | 'edit';

type CategoryInlineEditor =
  | {
      mode: 'create-root';
      value: string;
    }
  | {
      mode: 'create-child';
      parentId: string;
      value: string;
    }
  | {
      mode: 'edit';
      categoryId: string;
      value: string;
    };

const uniqueArray = (values: string[]) => Array.from(new Set(values));

const levelCodeIsSensitive = (levelCode: LevelCode) => ['L3', 'L4', 'L5'].includes(levelCode);

const createInitialRuleConfig = (): RuleConfig => ({
  matchMode: 'any',
  conditions: [createDefaultRuleCondition()],
});

const buildDataTypeFormValues = (dataType?: DataTypeItem): DataTypeFormValues => {
  if (!dataType) {
    return {
      name: '',
      levelCode: 'L2',
      isSensitive: false,
      needMask: true,
      needEncrypt: false,
      ruleConfig: createInitialRuleConfig(),
    };
  }

  return {
    name: dataType.name,
    levelCode: dataType.levelCode,
    isSensitive: dataType.isSensitive,
    needMask: dataType.needMask,
    needEncrypt: dataType.needEncrypt,
    ruleConfig: {
      matchMode: dataType.ruleConfig.matchMode,
      conditions: dataType.ruleConfig.conditions.length
        ? dataType.ruleConfig.conditions.map((condition) => ({ ...condition }))
        : [],
    },
  };
};

const renderBooleanTag = (value: boolean) => (
  <Tag
    style={{
      minWidth: 28,
      marginInlineEnd: 0,
      textAlign: 'center',
      color: value ? '#389e0d' : '#595959',
      background: value ? '#f6ffed' : '#fafafa',
      borderColor: value ? '#b7eb8f' : '#d9d9d9',
      borderRadius: 6,
    }}
  >
    {value ? '是' : '否'}
  </Tag>
);

const hexToRgba = (hexColor: string, alpha: number) => {
  const normalized = hexColor.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return `rgba(22,119,255,${alpha})`;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const getLevelTagStyle = (hexColor?: string) => {
  const color = /^#[0-9a-fA-F]{6}$/.test(hexColor ?? '') ? (hexColor as string) : '#1677ff';

  return {
    color,
    background: hexToRgba(color, 0.12),
    borderColor: hexToRgba(color, 0.36),
  };
};

const renderLevelCodeTag = (levelCode: LevelCode, hexColor?: string) => {
  const style = getLevelTagStyle(hexColor);

  return (
    <Tag
      style={{
        minWidth: 30,
        marginInlineEnd: 0,
        textAlign: 'center',
        color: style.color,
        background: style.background,
        borderColor: style.borderColor,
        borderRadius: 6,
      }}
    >
      {levelCode}
    </Tag>
  );
};

const renderDefaultHeader = (label: string) => (
  <Space size={4}>
    <span>{label}</span>
    <Tooltip title="此处配置为默认值，实际字段配置时可调整">
      <ExclamationCircleOutlined style={{ color: '#faad14' }} />
    </Tooltip>
  </Space>
);

const renderSingleLineText = (text: string, maxWidth = 360) => (
  <Tooltip title={text}>
    <span
      style={{
        display: 'inline-block',
        maxWidth,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        verticalAlign: 'bottom',
      }}
    >
      {text}
    </span>
  </Tooltip>
);

const renderColorOptionLabel = (hexColor: string, label: string) => (
  <Space size={8}>
    <span
      style={{
        width: 14,
        height: 14,
        borderRadius: 999,
        background: hexColor,
        border: '1px solid rgba(0,0,0,0.12)',
        display: 'inline-block',
      }}
    />
    <span>{label}</span>
    <code>{hexColor}</code>
  </Space>
);

const renderHitRateTag = (hitRate: number, label?: string) => {
  const normalizedHitRate = Math.min(100, Math.max(0, hitRate));
  const color =
    normalizedHitRate >= 80 ? 'success' : normalizedHitRate >= 60 ? 'processing' : normalizedHitRate >= 40 ? 'warning' : 'error';

  return (
    <Tag color={color} style={{ marginInlineEnd: 0 }}>
      {label ? `${label} ` : ''}
      {normalizedHitRate}%
    </Tag>
  );
};

const TemplateDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [template, setTemplate] = useState<ClassificationTemplateRecord | null>(null);
  const [activeTab, setActiveTab] = useState<TemplateTabKey>('catalog');
  const [templateEditModalOpen, setTemplateEditModalOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<string[]>([]);
  const [categoryInlineEditor, setCategoryInlineEditor] = useState<CategoryInlineEditor | null>(null);
  const [dataTypeModalOpen, setDataTypeModalOpen] = useState(false);
  const [dataTypeModalMode, setDataTypeModalMode] = useState<DataTypeModalMode>('create');
  const [editingDataType, setEditingDataType] = useState<DataTypeItem | null>(null);
  const [levelModalOpen, setLevelModalOpen] = useState(false);
  const [levelModalMode, setLevelModalMode] = useState<LevelModalMode>('create');
  const [editingLevelDefinition, setEditingLevelDefinition] = useState<LevelDefinitionItem | null>(null);

  const [dataTypeForm] = Form.useForm<DataTypeFormValues>();
  const [levelForm] = Form.useForm<LevelDefinitionFormValues>();

  const syncTemplateState = (
    nextTemplate: ClassificationTemplateRecord | null,
    options?: {
      selectedCategoryId?: string | null;
      expandIds?: string[];
    },
  ) => {
    setTemplate(nextTemplate);

    if (!nextTemplate) {
      setSelectedCategoryId(null);
      setExpandedCategoryIds([]);
      return;
    }

    const rootIds = nextTemplate.categories.map((item) => item.id);

    setExpandedCategoryIds((current) => {
      const preserved = current.filter((categoryId) => findCategoryById(nextTemplate.categories, categoryId));
      if (options?.expandIds?.length) {
        return uniqueArray([...preserved, ...options.expandIds]);
      }
      return preserved.length ? preserved : rootIds;
    });

    setSelectedCategoryId((current) => {
      const candidate = options?.selectedCategoryId ?? current;
      if (candidate && findCategoryById(nextTemplate.categories, candidate)) {
        return candidate;
      }
      return nextTemplate.categories[0]?.id ?? null;
    });
  };

  const reloadTemplate = async (options?: { selectedCategoryId?: string | null; expandIds?: string[] }) => {
    if (!id) {
      syncTemplateState(null);
      return;
    }

    const nextTemplate = await getClassificationTemplateById(id);
    syncTemplateState(nextTemplate, options);
  };

  useEffect(() => {
    void reloadTemplate();
  }, [id]);

  const selectedCategory = useMemo(() => {
    if (!template) {
      return null;
    }

    if (selectedCategoryId) {
      return findCategoryById(template.categories, selectedCategoryId) ?? null;
    }

    return template.categories[0] ?? null;
  }, [selectedCategoryId, template]);

  const selectedCategoryDataTypes = useMemo(
    () => (selectedCategory ? collectDataTypes(selectedCategory) : []),
    [selectedCategory],
  );

  const levelDefinitions = template?.levelDefinitions ?? getDefaultLevelDefinitions();
  const levelDefinitionMap = useMemo(
    () => new Map(levelDefinitions.map((item) => [item.code, item])),
    [levelDefinitions],
  );
  const levelSelectOptions = levelDefinitions.map((item) => ({
    value: item.code,
    label: `${item.code} ${item.name}`,
  }));

  const applyLevelDefaults = (levelCode: LevelCode) => {
    const levelDefinition = levelDefinitions.find((item) => item.code === levelCode);
    dataTypeForm.setFieldsValue({
      levelCode,
      needMask: levelDefinition?.needMask ?? false,
      needEncrypt: levelDefinition?.needEncrypt ?? false,
      isSensitive: levelDefinition?.isSensitive ?? levelCodeIsSensitive(levelCode),
    });
  };

  const openCreateRootCategoryInline = () => {
    setCategoryInlineEditor({
      mode: 'create-root',
      value: '',
    });
  };

  const openCreateChildCategoryInline = (parentId: string) => {
    setExpandedCategoryIds((current) => uniqueArray([...current, parentId]));
    setCategoryInlineEditor({
      mode: 'create-child',
      parentId,
      value: '',
    });
  };

  const openEditCategoryInline = (category: CategoryNode) => {
    setCategoryInlineEditor({
      mode: 'edit',
      categoryId: category.id,
      value: category.name,
    });
  };

  const openCreateDataTypeModal = () => {
    if (!selectedCategory) {
      messageApi.warning('请先选择一个分类');
      return;
    }

    setEditingDataType(null);
    setDataTypeModalMode('create');
    setDataTypeModalOpen(true);
    dataTypeForm.setFieldsValue(buildDataTypeFormValues());
  };

  const openEditDataTypeModal = (dataType: DataTypeItem) => {
    setEditingDataType(dataType);
    setDataTypeModalMode('edit');
    setDataTypeModalOpen(true);
    dataTypeForm.setFieldsValue(buildDataTypeFormValues(dataType));
  };

  const openCreateLevelModal = () => {
    const nextPresetColor =
      LEVEL_COLOR_PRESET_OPTIONS[levelDefinitions.length % LEVEL_COLOR_PRESET_OPTIONS.length]?.value ?? '#1677ff';

    setEditingLevelDefinition(null);
    setLevelModalMode('create');
    setLevelModalOpen(true);
    levelForm.setFieldsValue({
      code: '',
      name: '',
      description: '',
      color: nextPresetColor,
      isSensitive: false,
      needMask: false,
      needEncrypt: false,
      note: '',
    });
  };

  const openEditLevelModal = (levelDefinition: LevelDefinitionItem) => {
    setEditingLevelDefinition(levelDefinition);
    setLevelModalMode('edit');
    setLevelModalOpen(true);
    levelForm.setFieldsValue({
      code: levelDefinition.code,
      name: levelDefinition.name,
      description: levelDefinition.description,
      color: levelDefinition.color,
      isSensitive: levelDefinition.isSensitive,
      needMask: levelDefinition.needMask,
      needEncrypt: levelDefinition.needEncrypt,
      note: levelDefinition.note,
    });
  };

  const handleDeleteTemplate = () => {
    if (!template) {
      return;
    }

    Modal.confirm({
      title: '确认删除模板',
      content: `确定要删除模板“${template.templateName}”吗？此操作不可恢复。`,
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        const deleted = await deleteClassificationTemplate(template.id);
        if (!deleted) {
          messageApi.error('删除模板失败，请刷新后重试');
          return;
        }

        messageApi.success('模板已删除');
        navigate('/data-classification/templates');
      },
    });
  };

  const handleSubmitLevelDefinition = async () => {
    if (!template) {
      return;
    }

    const values = await levelForm.validateFields();
    const normalizedCode = values.code.trim();
    const hasDuplicateCode = levelDefinitions.some(
      (item) => item.code === normalizedCode && item.id !== editingLevelDefinition?.id,
    );

    if (hasDuplicateCode) {
      messageApi.error('级别编码已存在，请更换后重试');
      return;
    }

    const payload: LevelDefinitionFormValues = {
      ...values,
      code: normalizedCode,
      name: values.name.trim(),
      description: values.description.trim(),
      note: values.note.trim(),
    };

    const updated = await (
      levelModalMode === 'edit' && editingLevelDefinition
        ? updateClassificationLevelDefinition(template.id, editingLevelDefinition.id, payload)
        : addClassificationLevelDefinition(template.id, payload)
    );

    if (!updated) {
      messageApi.error('级别定义保存失败，请重试');
      return;
    }

    syncTemplateState(updated, { selectedCategoryId });
    setLevelModalOpen(false);
    setEditingLevelDefinition(null);
    levelForm.resetFields();
    messageApi.success(levelModalMode === 'edit' ? '级别定义已更新' : '级别定义已创建');
  };

  const handleDeleteLevelDefinition = (levelDefinition: LevelDefinitionItem) => {
    if (!template) {
      return;
    }

    const usedDataTypes = template.categories.flatMap((category) => collectDataTypes(category)).filter(
      (dataType) => dataType.levelCode === levelDefinition.code,
    );

    if (usedDataTypes.length) {
      messageApi.warning(`当前仍有 ${usedDataTypes.length} 个数据类型使用该级别，暂不支持删除`);
      return;
    }

    Modal.confirm({
      title: '确认删除级别定义',
      content: `确定要删除级别“${levelDefinition.name}”吗？`,
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        const updated = await deleteClassificationLevelDefinition(template.id, levelDefinition.id);
        if (!updated) {
          messageApi.error('删除级别定义失败，请重试');
          return;
        }

        syncTemplateState(updated, { selectedCategoryId });
        messageApi.success('级别定义已删除');
      },
    });
  };

  const handleInitialize = () => {
    if (!template) {
      return;
    }

    Modal.confirm({
      title: '初始化内置规则',
      content: '初始化后会用当前模板类型的内置分类、级别和识别规则覆盖当前配置，是否继续？',
      okText: '确认初始化',
      cancelText: '取消',
      onOk: async () => {
        const updated = await initializeClassificationTemplate(template.id);
        if (!updated) {
          messageApi.error('初始化失败，请刷新后重试');
          return;
        }

        syncTemplateState(updated);
        messageApi.success('已完成内置规则初始化');
      },
    });
  };

  const handleRefreshCatalog = () => {
    reloadTemplate({ selectedCategoryId });
    messageApi.success('已刷新模板数据');
  };

  const cancelCategoryInlineEditor = () => {
    setCategoryInlineEditor(null);
  };

  const handleSubmitCategoryInlineEditor = async () => {
    if (!template) {
      return;
    }

    const categoryName = categoryInlineEditor?.value.trim() ?? '';
    if (!categoryName) {
      messageApi.warning('请输入分类名称');
      return;
    }

    if (categoryName.length > 30) {
      messageApi.warning('分类名称不能超过 30 个字符');
      return;
    }

    let updatedTemplate: ClassificationTemplateRecord | null = null;

    if (categoryInlineEditor?.mode === 'edit') {
      updatedTemplate = await updateClassificationCategory(template.id, categoryInlineEditor.categoryId, {
        name: categoryName,
      });
    } else if (categoryInlineEditor?.mode === 'create-child') {
      updatedTemplate = await addClassificationCategory(template.id, { name: categoryName }, categoryInlineEditor.parentId);
    } else if (categoryInlineEditor?.mode === 'create-root') {
      updatedTemplate = await addClassificationCategory(template.id, { name: categoryName }, null);
    }

    if (!updatedTemplate) {
      messageApi.error('分类保存失败，请重试');
      return;
    }

    syncTemplateState(updatedTemplate, {
      selectedCategoryId:
        categoryInlineEditor?.mode === 'edit'
          ? categoryInlineEditor.categoryId
          : categoryInlineEditor?.mode === 'create-child'
            ? categoryInlineEditor.parentId
            : selectedCategoryId,
      expandIds:
        categoryInlineEditor?.mode === 'create-child'
          ? [categoryInlineEditor.parentId]
          : undefined,
    });
    setCategoryInlineEditor(null);
    messageApi.success(categoryInlineEditor?.mode === 'edit' ? '分类已更新' : '分类已创建');
  };

  const handleDeleteCategory = (category: CategoryNode) => {
    if (!template) {
      return;
    }

    Modal.confirm({
      title: '确认删除分类',
      content: `确定要删除分类“${category.name}”吗？其子分类和数据类型也会一并删除。`,
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        const updated = await deleteClassificationCategory(template.id, category.id);
        if (!updated) {
          messageApi.error('删除分类失败，请刷新后重试');
          return;
        }

        syncTemplateState(updated);
        messageApi.success('分类已删除');
      },
    });
  };

  const handleSubmitDataType = async () => {
    if (!template || !selectedCategory) {
      return;
    }

    const values = await dataTypeForm.validateFields();

    const updated = await (
      dataTypeModalMode === 'edit' && editingDataType
        ? updateClassificationDataType(template.id, editingDataType.id, values)
        : addClassificationDataType(template.id, selectedCategory.id, values)
    );

    if (!updated) {
      messageApi.error('数据类型保存失败，请重试');
      return;
    }

    syncTemplateState(updated, {
      selectedCategoryId: selectedCategory.id,
      expandIds: [selectedCategory.id],
    });
    setDataTypeModalOpen(false);
    setEditingDataType(null);
    dataTypeForm.resetFields();
    messageApi.success(dataTypeModalMode === 'edit' ? '数据类型已更新' : '数据类型已创建');
  };

  const handleDeleteDataType = (dataType: DataTypeItem) => {
    if (!template || !selectedCategory) {
      return;
    }

    Modal.confirm({
      title: '确认删除数据类型',
      content: `确定要删除数据类型“${dataType.name}”吗？`,
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        const updated = await deleteClassificationDataType(template.id, dataType.id);
        if (!updated) {
          messageApi.error('删除数据类型失败，请重试');
          return;
        }

        syncTemplateState(updated, {
          selectedCategoryId: selectedCategory.id,
        });
        messageApi.success('数据类型已删除');
      },
    });
  };

  const toggleCategoryExpand = (categoryId: string) => {
    setExpandedCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((item) => item !== categoryId)
        : [...current, categoryId],
    );
  };

  const renderCategoryInlineEditor = (level: number) => (
    <div
      style={{
        marginLeft: level * 24,
        marginBottom: 8,
        padding: '8px 12px',
        borderRadius: 12,
        border: '1px dashed #91caff',
        background: '#f7fbff',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <Input
        autoFocus
        size="small"
        maxLength={30}
        placeholder="请输入分类名称"
        value={categoryInlineEditor?.value ?? ''}
        onChange={(event) => {
          const value = event.target.value;
          setCategoryInlineEditor((current) => (current ? { ...current, value } : current));
        }}
        onPressEnter={handleSubmitCategoryInlineEditor}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            cancelCategoryInlineEditor();
          }
        }}
      />
      <Tooltip title="保存">
        <Button type="text" size="small" icon={<CheckOutlined />} onClick={handleSubmitCategoryInlineEditor} />
      </Tooltip>
      <Tooltip title="取消">
        <Button type="text" size="small" icon={<CloseOutlined />} onClick={cancelCategoryInlineEditor} />
      </Tooltip>
    </div>
  );

  const renderCategoryNode = (node: CategoryNode, level = 0): React.ReactNode => {
    const hasChildren = Boolean(node.children?.length);
    const expanded = expandedCategoryIds.includes(node.id);
    const selected = node.id === selectedCategoryId;
    const isEditingCurrentCategory =
      categoryInlineEditor?.mode === 'edit' && categoryInlineEditor.categoryId === node.id;
    const isCreatingChildForCurrentCategory =
      categoryInlineEditor?.mode === 'create-child' && categoryInlineEditor.parentId === node.id;

    return (
      <div key={node.id}>
        {isEditingCurrentCategory ? (
          renderCategoryInlineEditor(level)
        ) : (
          <div
            onClick={() => setSelectedCategoryId(node.id)}
            style={{
              marginLeft: level * 24,
              marginBottom: 8,
              padding: '10px 12px',
              borderRadius: 12,
              border: selected ? '1px solid #91caff' : '1px solid #f0f0f0',
              background: selected ? '#e6f4ff' : '#fff',
              boxShadow: selected ? '0 0 0 2px rgba(22, 119, 255, 0.08)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span
                onClick={(event) => {
                  event.stopPropagation();
                  if (hasChildren) {
                    toggleCategoryExpand(node.id);
                  }
                }}
                style={{
                  width: 16,
                  color: '#595959',
                  display: 'inline-flex',
                  justifyContent: 'center',
                  visibility: hasChildren ? 'visible' : 'hidden',
                }}
              >
                {expanded ? <DownOutlined /> : <RightOutlined />}
              </span>
              <Text strong={selected} ellipsis>
                {node.name}
              </Text>
            </div>

            <Space size={4}>
              <Tooltip title="新增子分类">
                <Button
                  type="text"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={(event) => {
                    event.stopPropagation();
                    openCreateChildCategoryInline(node.id);
                  }}
                />
              </Tooltip>
              <Tooltip title="编辑分类">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={(event) => {
                    event.stopPropagation();
                    openEditCategoryInline(node);
                  }}
                />
              </Tooltip>
              <Tooltip title="删除分类">
                <Button
                  danger
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDeleteCategory(node);
                  }}
                />
              </Tooltip>
            </Space>
          </div>
        )}

        {isCreatingChildForCurrentCategory ? renderCategoryInlineEditor(level + 1) : null}
        {hasChildren && expanded ? node.children?.map((child) => renderCategoryNode(child, level + 1)) : null}
      </div>
    );
  };

  const dataTypeColumns = [
    {
      title: '数据类型',
      dataIndex: 'name',
      key: 'name',
      width: 170,
    },
    {
      title: '级别标签',
      dataIndex: 'levelCode',
      key: 'levelCode',
      width: 150,
      render: (_: LevelCode, record: DataTypeItem) => (
        <Space size={8}>
          {renderLevelCodeTag(record.levelCode, levelDefinitionMap.get(record.levelCode)?.color)}
          <Text>{record.levelName}</Text>
        </Space>
      ),
    },
    {
      title: '是否敏感',
      dataIndex: 'isSensitive',
      key: 'isSensitive',
      width: 100,
      render: (value: boolean) => renderBooleanTag(value),
    },
    {
      title: '建议脱敏',
      dataIndex: 'needMask',
      key: 'needMask',
      width: 100,
      render: (value: boolean) => renderBooleanTag(value),
    },
    {
      title: '建议加密',
      dataIndex: 'needEncrypt',
      key: 'needEncrypt',
      width: 100,
      render: (value: boolean) => renderBooleanTag(value),
    },
    {
      title: '命中率',
      dataIndex: 'ruleConfig',
      key: 'hitRate',
      width: 220,
      render: (ruleConfig: RuleConfig) => {
        const conditions = ruleConfig.conditions.filter((condition) => condition.value.trim());
        if (!conditions.length) {
          return <Text type="secondary">未配置</Text>;
        }

        return (
          <Space size={[4, 8]} wrap>
            {conditions.map((condition, index) => (
              <Tooltip
                key={condition.id ?? `${index}`}
                title={`规则${index + 1}：${condition.hitRate}%`}
              >
                {renderHitRateTag(condition.hitRate, `规则${index + 1}`)}
              </Tooltip>
            ))}
          </Space>
        );
      },
    },
    {
      title: '识别规则',
      dataIndex: 'ruleConfig',
      key: 'ruleConfig',
      render: (ruleConfig: RuleConfig) => {
        const summary = formatRuleSummary(ruleConfig);
        if (!summary) {
          return <Text type="secondary">未配置</Text>;
        }

        return (
          <Tooltip title={summary}>
            <span
              style={{
                display: 'inline-block',
                maxWidth: 420,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                verticalAlign: 'bottom',
              }}
            >
              {summary}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, record: DataTypeItem) => (
        <Space size={4}>
          <Tooltip title="编辑数据类型">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditDataTypeModal(record)}
            />
          </Tooltip>
          <Tooltip title="删除数据类型">
            <Button
              danger
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteDataType(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const levelDefinitionColumns = [
    {
      title: '级别标签',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (code: LevelCode, record: LevelDefinitionItem) => renderLevelCodeTag(code, record.color),
    },
    {
      title: '级别名称',
      dataIndex: 'name',
      key: 'name',
      width: 120,
      render: (value: string) => renderSingleLineText(value, 140),
    },
    {
      title: '定义说明',
      dataIndex: 'description',
      key: 'description',
      render: (value: string) => renderSingleLineText(value, 320),
    },
    {
      title: '标签颜色',
      dataIndex: 'color',
      key: 'color',
      width: 140,
      render: (value: string) => (
        <Space size={8}>
          <span
            style={{
              width: 16,
              height: 16,
              borderRadius: 999,
              background: value,
              border: '1px solid rgba(0,0,0,0.12)',
              display: 'inline-block',
            }}
          />
          <code>{value}</code>
        </Space>
      ),
    },
    {
      title: renderDefaultHeader('是否敏感'),
      dataIndex: 'isSensitive',
      key: 'isSensitive',
      width: 110,
      render: (value: boolean) => renderBooleanTag(value),
    },
    {
      title: renderDefaultHeader('建议脱敏'),
      dataIndex: 'needMask',
      key: 'needMask',
      width: 100,
      render: (value: boolean) => renderBooleanTag(value),
    },
    {
      title: renderDefaultHeader('建议加密'),
      dataIndex: 'needEncrypt',
      key: 'needEncrypt',
      width: 100,
      render: (value: boolean) => renderBooleanTag(value),
    },
    {
      title: '适用说明',
      dataIndex: 'note',
      key: 'note',
      render: (value: string) => renderSingleLineText(value, 360),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: LevelDefinitionItem) => (
        <Space size={4}>
          <Tooltip title="编辑级别">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditLevelModal(record)}
            />
          </Tooltip>
          <Tooltip title="删除级别">
            <Button
              danger
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteLevelDefinition(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const categoryCount = template ? countCategoryNodes(template.categories) : 0;
  const catalogTabLabel = `分类目录 (${categoryCount})`;
  const levelsTabLabel = `级别定义 (${template?.levelDefinitions.length ?? 0})`;

  if (!template) {
    return (
      <PageContainer
        header={{
          title: 'Template Detail',
          subTitle: '当模板不存在时，可在此返回模板库并重新选择目标模板。',
          onBack: () => navigate('/data-classification/templates'),
        }}
      >
        {contextHolder}
        <Card>
          <Empty description="未找到模板" image={Empty.PRESENTED_IMAGE_SIMPLE}>
            <Button type="primary" onClick={() => navigate('/data-classification/templates')}>
              返回模板列表
            </Button>
          </Empty>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      className="nothingPage"
      header={{
        title: 'Template Detail',
        subTitle: '维护模板元数据、分类目录、级别定义、数据类型与识别规则。',
        extra: [
          <Button key="back" onClick={() => navigate('/data-classification/templates')}>
            返回模板列表
          </Button>,
          <Button
            key="edit"
            onClick={() => setTemplateEditModalOpen(true)}
            icon={<EditOutlined />}
          >
            编辑模板
          </Button>,
          <Button key="init" onClick={handleInitialize}>
            初始化内置规则
          </Button>,
          <Button key="delete" danger icon={<DeleteOutlined />} onClick={handleDeleteTemplate}>
            删除模板
          </Button>,
        ],
      }}
    >
      {contextHolder}
      <Card style={{ marginBottom: 24 }} bodyStyle={{ padding: 0 }}>
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #f0f0f0',
            fontSize: 20,
            fontWeight: 600,
          }}
        >
          {template.templateName}
        </div>

        <div style={{ padding: 24 }}>
          <Row gutter={[48, 24]}>
            <Col xs={24} lg={12}>
              <Space direction="vertical" size={14} style={{ width: '100%' }}>
                <div>
                  <Text type="secondary">模板名称：</Text>
                  <Text>{template.templateName}</Text>
                </div>
                <div>
                  <Text type="secondary">状态：</Text>
                  <Tag
                    color={template.status === 'active' ? 'success' : template.status === 'draft' ? 'warning' : 'default'}
                    style={{ marginInlineEnd: 0 }}
                  >
                    {template.status === 'active' ? '启用' : template.status === 'draft' ? '草稿' : '停用'}
                  </Tag>
                </div>
                <div>
                  <Text type="secondary">更新时间：</Text>
                  <Text>{template.updatedAt}</Text>
                </div>
              </Space>
            </Col>

            <Col xs={24} lg={12}>
              <Space direction="vertical" size={14} style={{ width: '100%' }}>
                <div>
                  <Text type="secondary">模板类型：</Text>
                  <Text>{template.templateType}</Text>
                </div>
                <div>
                  <Text type="secondary">模板描述：</Text>
                  <Text>{template.description}</Text>
                </div>
              </Space>
            </Col>
          </Row>
        </div>
      </Card>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as TemplateTabKey)}
        items={[
          { key: 'catalog', label: catalogTabLabel },
          { key: 'levels', label: levelsTabLabel },
        ]}
      />

      {activeTab === 'catalog' ? (
        <Card
          title="分类目录"
          extra={
            <Space>
              <Button icon={<ReloadOutlined />} onClick={handleRefreshCatalog}>
                刷新
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreateRootCategoryInline}>
                新建分类
              </Button>
            </Space>
          }
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={7}>
              <Card size="small" title="分类树" bodyStyle={{ maxHeight: 760, overflowY: 'auto', padding: 12 }}>
                {categoryInlineEditor?.mode === 'create-root' ? renderCategoryInlineEditor(0) : null}
                {template.categories.length ? (
                  template.categories.map((node) => renderCategoryNode(node))
                ) : (
                  <Empty description="暂无分类目录" image={Empty.PRESENTED_IMAGE_SIMPLE}>
                    <Button type="primary" onClick={openCreateRootCategoryInline}>
                      新建首个分类
                    </Button>
                  </Empty>
                )}
              </Card>
            </Col>

            <Col xs={24} xl={17}>
              <Card
                size="small"
                title={selectedCategory?.name ?? '分类详情'}
                extra={
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    disabled={!selectedCategory}
                    onClick={openCreateDataTypeModal}
                  >
                    新建数据类型
                  </Button>
                }
              >
                {selectedCategory ? (
                  selectedCategoryDataTypes.length ? (
                    <Table<DataTypeItem>
                      rowKey="id"
                      size="small"
                      pagination={false}
                      columns={dataTypeColumns}
                      dataSource={selectedCategoryDataTypes}
                      scroll={{ x: 1280 }}
                    />
                  ) : (
                    <Empty description="当前分类下暂无数据类型" image={Empty.PRESENTED_IMAGE_SIMPLE}>
                      <Button type="primary" onClick={openCreateDataTypeModal}>
                        新建数据类型
                      </Button>
                    </Empty>
                  )
                ) : (
                  <Empty description="请选择左侧分类" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </Card>
            </Col>
          </Row>
        </Card>
      ) : (
        <Card
          title="级别定义"
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateLevelModal}>
              新建级别
            </Button>
          }
        >
          <Table<LevelDefinitionItem>
            rowKey="id"
            size="small"
            pagination={false}
            columns={levelDefinitionColumns}
            dataSource={template.levelDefinitions}
            tableLayout="auto"
            scroll={{ x: 'max-content' }}
          />
        </Card>
      )}

      <Modal
        title={dataTypeModalMode === 'edit' ? '编辑数据类型' : '新建数据类型'}
        open={dataTypeModalOpen}
        onOk={handleSubmitDataType}
        onCancel={() => {
          setDataTypeModalOpen(false);
          setEditingDataType(null);
          dataTypeForm.resetFields();
        }}
        destroyOnClose
        width={960}
      >
        <Form<DataTypeFormValues> form={dataTypeForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="数据类型名称"
                name="name"
                rules={[
                  { required: true, message: '请输入数据类型名称' },
                  { max: 30, message: '数据类型名称不能超过 30 个字符' },
                ]}
              >
                <Input placeholder="请输入数据类型名称" maxLength={30} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="级别标签"
                name="levelCode"
                rules={[{ required: true, message: '请选择级别标签' }]}
              >
                <Select
                  placeholder="请选择级别标签"
                  options={levelSelectOptions}
                  onChange={(value) => applyLevelDefaults(value as LevelCode)}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="是否敏感" name="isSensitive" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="建议脱敏" name="needMask" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="建议加密" name="needEncrypt" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Card
            size="small"
            title="识别规则"
            extra={
              <Button
                type="link"
                icon={<PlusOutlined />}
                onClick={() => {
                  const currentRuleConfig = dataTypeForm.getFieldValue('ruleConfig') as RuleConfig | undefined;
                  const nextConditions = [...(currentRuleConfig?.conditions ?? []), createDefaultRuleCondition()];
                  dataTypeForm.setFieldsValue({
                    ruleConfig: {
                      matchMode: currentRuleConfig?.matchMode ?? 'any',
                      conditions: nextConditions,
                    },
                  });
                }}
              >
                新增规则
              </Button>
            }
            style={{ marginBottom: 24 }}
          >
            <Form.Item
              label="规则组合方式"
              name={['ruleConfig', 'matchMode']}
              initialValue="any"
            >
              <Select options={RULE_MATCH_MODE_OPTIONS} />
            </Form.Item>

            <Form.List name={['ruleConfig', 'conditions']}>
              {(fields, { add, remove }) => (
                <>
                  {fields.length ? (
                    fields.map((field, index) => (
                      <Row key={field.key} gutter={12} align="middle" style={{ marginBottom: 12 }}>
                        <Col span={5}>
                          <Form.Item
                            label={index === 0 ? '匹配位置' : ' '}
                            name={[field.name, 'target']}
                            rules={[{ required: true, message: '请选择匹配位置' }]}
                          >
                            <Select placeholder="请选择匹配位置" options={RULE_MATCH_TARGET_OPTIONS} />
                          </Form.Item>
                        </Col>
                        <Col span={5}>
                          <Form.Item
                            label={index === 0 ? '匹配方式' : ' '}
                            name={[field.name, 'matcher']}
                            rules={[{ required: true, message: '请选择匹配方式' }]}
                          >
                            <Select placeholder="请选择匹配方式" options={RULE_MATCHER_OPTIONS} />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item
                            label={index === 0 ? '匹配值' : ' '}
                            name={[field.name, 'value']}
                            rules={[{ required: true, message: '请输入匹配值' }]}
                          >
                            <Input placeholder="请输入匹配值，枚举包含可使用逗号分隔多个值" />
                          </Form.Item>
                        </Col>
                        <Col span={4}>
                          <Form.Item
                            label={index === 0 ? '命中率(%)' : ' '}
                            name={[field.name, 'hitRate']}
                            rules={[{ required: true, message: '请输入命中率' }]}
                          >
                            <InputNumber
                              min={0}
                              max={100}
                              precision={2}
                              style={{ width: '100%' }}
                              placeholder="0-100"
                            />
                          </Form.Item>
                        </Col>
                        <Col span={2}>
                          <Button
                            danger
                            type="link"
                            style={{ paddingInline: 0 }}
                            onClick={() => remove(field.name)}
                          >
                            删除
                          </Button>
                        </Col>
                      </Row>
                    ))
                  ) : (
                    <Empty
                      description="暂无识别规则"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    >
                      <Button
                        type="primary"
                        onClick={() => add(createDefaultRuleCondition() as RuleCondition)}
                      >
                        新增首条规则
                      </Button>
                    </Empty>
                  )}
                </>
              )}
            </Form.List>
          </Card>
        </Form>
      </Modal>

      <TemplateEditModal
        open={templateEditModalOpen}
        templateId={template.id}
        onCancel={() => setTemplateEditModalOpen(false)}
        onSaved={(updatedTemplate) => {
          syncTemplateState(updatedTemplate, { selectedCategoryId });
        }}
      />

      <Modal
        title={levelModalMode === 'edit' ? '编辑级别定义' : '新建级别定义'}
        open={levelModalOpen}
        onOk={handleSubmitLevelDefinition}
        onCancel={() => {
          setLevelModalOpen(false);
          setEditingLevelDefinition(null);
          levelForm.resetFields();
        }}
        destroyOnClose
        width={720}
      >
        <Form<LevelDefinitionFormValues> form={levelForm} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="级别编码"
                name="code"
                rules={[
                  { required: true, message: '请输入级别编码' },
                  { max: 20, message: '级别编码不能超过 20 个字符' },
                ]}
              >
                <Input placeholder="例如：L6 或 CUSTOM_A" maxLength={20} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="级别名称"
                name="name"
                rules={[
                  { required: true, message: '请输入级别名称' },
                  { max: 20, message: '级别名称不能超过 20 个字符' },
                ]}
              >
                <Input placeholder="请输入级别名称" maxLength={20} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="标签颜色"
                name="color"
                rules={[{ required: true, message: '请选择标签颜色' }]}
              >
                <Select
                  placeholder="请选择标签颜色"
                  options={LEVEL_COLOR_PRESET_OPTIONS.map((item) => ({
                    value: item.value,
                    label: renderColorOptionLabel(item.value, item.label),
                  }))}
                  optionLabelProp="label"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="定义说明"
            name="description"
            rules={[{ required: true, message: '请输入定义说明' }]}
          >
            <Input.TextArea rows={3} placeholder="请输入级别定义说明" maxLength={200} showCount />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="是否敏感" name="isSensitive" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="建议脱敏" name="needMask" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="建议加密" name="needEncrypt" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="适用说明" name="note">
            <Input.TextArea rows={3} placeholder="请输入适用说明" maxLength={300} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default TemplateDetail;
