import { listAssetGroupTreeSelectOptions } from "@/services/data-assets/assetGroupStore";
import {
  createImportTask,
  getImportTaskById,
  updateImportTask,
  discoverImportDatabases,
  type DataAssetImportFormValues,
  type DiscoverImportDatabasesValues,
  type ImportScheduleMode,
  type ImportSampleStorageMode,
  type ImportSampleStrategy,
  type ImportSourceType,
} from "@/services/data-assets/importTaskStore";
import {
  createClassificationTask,
  listClassificationTasks,
  type ClassificationTaskDataType,
  type ClassificationTaskRecord,
  type ClassificationTaskScheduleMode,
} from "@/services/data-classification/classificationTaskStore";
import { listClassificationTemplates } from "@/services/data-classification/templateStore";
import {
  CheckCircleOutlined,
  DatabaseOutlined,
  ExperimentOutlined,
  ProfileOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { PageContainer } from "@ant-design/pro-components";
import { useLocation, useNavigate, useParams } from "@umijs/max";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Radio,
  Row,
  Select,
  Space,
  Spin,
  Steps,
  Switch,
  Tag,
  TreeSelect,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import React, { useEffect, useMemo, useState } from "react";

const { TextArea } = Input;
const { Text } = Typography;
const MASKED_PASSWORD = "***";

interface ImportWorkflowFormValues
  extends Omit<DataAssetImportFormValues, "executeAt" | "description"> {
  executeAt?: dayjs.Dayjs;
  description?: string;
  sampleCount: number;
  sampleStrategy: ImportSampleStrategy;
  sampleStorageMode: ImportSampleStorageMode;
  runImportImmediately: boolean;
  createClassificationTask: boolean;
  runClassificationImmediatelyAfterImport: boolean;
  classificationTaskMode?: "existing" | "new";
  existingClassificationTaskId?: string;
  classificationTaskName?: string;
  classificationTemplateId?: string;
  classificationScheduleMode?: ClassificationTaskScheduleMode;
  classificationExecuteAt?: dayjs.Dayjs;
}

const SOURCE_TYPE_OPTIONS: Array<{ value: ImportSourceType; label: string }> = [
  { value: "database", label: "数据库" },
  { value: "file", label: "文件" },
  { value: "api", label: "API" },
  { value: "message_queue", label: "消息队列" },
];

const CONNECTOR_TYPE_OPTIONS: Record<
  ImportSourceType,
  Array<{ value: string; label: string; port?: number }>
> = {
  database: [
    { value: "MySQL", label: "MySQL", port: 3306 },
    { value: "PostgreSQL", label: "PostgreSQL", port: 5432 },
    { value: "Oracle", label: "Oracle", port: 1521 },
    { value: "SQLServer", label: "SQL Server", port: 1433 },
    { value: "MongoDB", label: "MongoDB", port: 27017 },
  ],
  file: [
    { value: "CSV文件", label: "CSV 文件" },
    { value: "Excel文件", label: "Excel 文件" },
    { value: "Parquet文件", label: "Parquet 文件" },
  ],
  api: [
    { value: "REST API", label: "REST API", port: 443 },
    { value: "GraphQL API", label: "GraphQL API", port: 443 },
    { value: "Webhook", label: "Webhook", port: 443 },
  ],
  message_queue: [
    { value: "Kafka", label: "Kafka", port: 9092 },
    { value: "RocketMQ", label: "RocketMQ", port: 9876 },
    { value: "RabbitMQ", label: "RabbitMQ", port: 5672 },
  ],
};

const SCHEDULE_MODE_OPTIONS: Array<{
  value: ImportScheduleMode;
  label: string;
}> = [
  { value: "immediate", label: "任务创建后立即导入" },
  { value: "single", label: "单次同步" },
  { value: "daily", label: "每日" },
  { value: "weekly", label: "每周" },
  { value: "monthly", label: "每月" },
];

const SAMPLE_STRATEGY_OPTIONS: Array<{
  value: ImportSampleStrategy;
  label: string;
}> = [
  { value: "latest", label: "只抽取最新" },
  { value: "random", label: "随机抽取" },
];

const SAMPLE_STORAGE_MODE_OPTIONS: Array<{
  value: ImportSampleStorageMode;
  label: string;
}> = [
  { value: "replace", label: "存量替换" },
  { value: "incremental", label: "增量存储" },
];

const mapImportSourceTypeToTaskDataType = (
  sourceType: ImportSourceType
): ClassificationTaskDataType => {
  switch (sourceType) {
    case "database":
      return "database";
    case "file":
      return "file";
    default:
      return "api";
  }
};

const TASK_MODE_OPTIONS = [
  { value: "new", label: "新建分类任务" },
  { value: "existing", label: "关联已有任务" },
] as const;

const CLASSIFICATION_SCHEDULE_MODE_OPTIONS: Array<{
  value: ClassificationTaskScheduleMode;
  label: string;
}> = [
  { value: "auto_after_import", label: "导入完成后自动执行" },
  { value: "single", label: "单次执行" },
];

const mapTaskDataTypeToLabel = (value?: ClassificationTaskDataType) => {
  if (value === "database") return "数据库";
  if (value === "file") return "文件";
  if (value === "api") return "API";
  return "-";
};

const DataImportForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: editId } = useParams<{ id?: string }>();
  const isEditMode = Boolean(editId);
  const [form] = Form.useForm<ImportWorkflowFormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [discoveringDatabases, setDiscoveringDatabases] = useState(false);
  const [connectionTestStatus, setConnectionTestStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");
  const [connectionTestMessage, setConnectionTestMessage] = useState("");
  const [lastTestedFingerprint, setLastTestedFingerprint] = useState("");
  const [databaseOptions, setDatabaseOptions] = useState<string[]>([]);
  const [templateOptions, setTemplateOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [classificationTasks, setClassificationTasks] = useState<
    ClassificationTaskRecord[]
  >([]);
  const [assetGroupOptions, setAssetGroupOptions] = useState<
    Array<{ value: string; title: string; children: any[] }>
  >([]);

  const sourceType = Form.useWatch("sourceType", form) ?? "database";
  const sourceName = Form.useWatch("sourceName", form);
  const createClassificationTaskSwitch = Form.useWatch(
    "createClassificationTask",
    form
  );
  const classificationTaskMode =
    Form.useWatch("classificationTaskMode", form) ?? "existing";
  const existingClassificationTaskId = Form.useWatch(
    "existingClassificationTaskId",
    form
  );
  const scheduleMode = Form.useWatch("scheduleMode", form);
  const databaseTypeValue = Form.useWatch("databaseType", form);
  const ipAddressValue = Form.useWatch("ipAddress", form);
  const portValue = Form.useWatch("port", form);
  const usernameValue = Form.useWatch("username", form);
  const passwordValue = Form.useWatch("password", form);

  const selectedExistingTask = useMemo(
    () =>
      classificationTasks.find(
        (task) => task.id === existingClassificationTaskId
      ) ?? null,
    [classificationTasks, existingClassificationTaskId]
  );

  const defaultTemplateOption = useMemo(
    () => templateOptions[0],
    [templateOptions]
  );

  const discoveryPreset = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const portValue = params.get("port");
    const parsedPort = portValue ? Number(portValue) : undefined;

    return {
      sourceType:
        (params.get("sourceType") as ImportSourceType | null) ?? undefined,
      databaseType: params.get("databaseType") ?? undefined,
      ipAddress: params.get("ipAddress") ?? undefined,
      port: Number.isFinite(parsedPort) ? parsedPort : undefined,
      assetGroupId: params.get("assetGroupId") ?? undefined,
      from: params.get("from") ?? undefined,
    };
  }, [location.search]);

  const backPath =
    discoveryPreset.from === "asset-discovery"
      ? "/data-assets/auto-scan"
      : discoveryPreset.from === "asset-list"
      ? "/data-assets/data-asset-list"
      : "/data-assets/data-import";

  const connectorOptions = useMemo(() => {
    const baseOptions = CONNECTOR_TYPE_OPTIONS[sourceType];
    if (
      sourceType === "database" &&
      discoveryPreset.databaseType &&
      !baseOptions.some((item) => item.value === discoveryPreset.databaseType)
    ) {
      return [
        ...baseOptions,
        {
          value: discoveryPreset.databaseType,
          label: discoveryPreset.databaseType,
          port: discoveryPreset.port,
        },
      ];
    }
    return baseOptions;
  }, [discoveryPreset.databaseType, discoveryPreset.port, sourceType]);

  useEffect(() => {
    let cancelled = false;

    const loadOptions = async () => {
      try {
        const [templates, groups, tasks] = await Promise.all([
          listClassificationTemplates(),
          listAssetGroupTreeSelectOptions(),
          listClassificationTasks(),
        ]);

        if (cancelled) return;

        setTemplateOptions(
          templates.map((template) => ({
            value: template.id,
            label: template.templateName,
          }))
        );
        setAssetGroupOptions(groups);
        setClassificationTasks(tasks);
      } catch (error) {
        console.error("Failed to load import form options", error);
      }
    };

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (
      defaultTemplateOption &&
      !form.getFieldValue("classificationTemplateId")
    ) {
      form.setFieldsValue({
        classificationTemplateId: defaultTemplateOption.value,
      });
    }
  }, [defaultTemplateOption, form]);

  // Auto-select the classification task linked to the default template
  useEffect(() => {
    if (
      classificationTasks.length > 0 &&
      defaultTemplateOption &&
      !form.getFieldValue("existingClassificationTaskId")
    ) {
      const defaultTask = classificationTasks.find(
        (t) => t.templateId === defaultTemplateOption.value,
      );
      if (defaultTask) {
        form.setFieldsValue({
          existingClassificationTaskId: defaultTask.id,
        });
      }
    }
  }, [classificationTasks, defaultTemplateOption, form]);

  useEffect(() => {
    if (
      createClassificationTaskSwitch &&
      classificationTaskMode === "new" &&
      sourceName
    ) {
      const currentTaskName = form.getFieldValue("classificationTaskName");
      if (!currentTaskName || /_数据分类分级任务$/.test(currentTaskName)) {
        form.setFieldsValue({
          classificationTaskName: `${sourceName}_数据分类分级任务`,
        });
      }
    }
  }, [
    classificationTaskMode,
    createClassificationTaskSwitch,
    form,
    sourceName,
  ]);

  useEffect(() => {
    if (
      createClassificationTaskSwitch &&
      classificationTaskMode === "new" &&
      !form.getFieldValue("classificationExecuteAt") &&
      form.getFieldValue("executeAt")
    ) {
      form.setFieldsValue({
        classificationScheduleMode:
          form.getFieldValue("classificationScheduleMode") ?? "single",
        classificationExecuteAt: form.getFieldValue("executeAt"),
      });
    }
  }, [classificationTaskMode, createClassificationTaskSwitch, form]);

  useEffect(() => {
    if (
      !discoveryPreset.ipAddress &&
      !discoveryPreset.port &&
      !discoveryPreset.databaseType &&
      !discoveryPreset.assetGroupId
    ) {
      return;
    }

    form.setFieldsValue({
      sourceType: discoveryPreset.sourceType ?? "database",
      databaseType:
        discoveryPreset.databaseType ??
        form.getFieldValue("databaseType") ??
        "MySQL",
      ipAddress: discoveryPreset.ipAddress ?? form.getFieldValue("ipAddress"),
      port: discoveryPreset.port ?? form.getFieldValue("port") ?? 3306,
      assetGroupId:
        discoveryPreset.assetGroupId ?? form.getFieldValue("assetGroupId"),
    });
  }, [discoveryPreset, form]);

  useEffect(() => {
    if (!editId) return;
    let cancelled = false;

    const loadTask = async () => {
      setLoading(true);
      try {
        const task = await getImportTaskById(editId);
        if (cancelled || !task) return;

        const dbNames = task.databaseName
          ? task.databaseName.split("、").filter(Boolean)
          : [];
        setDatabaseOptions(dbNames);

        const connectorType =
          CONNECTOR_TYPE_OPTIONS.database.find(
            (opt) =>
              opt.value.toLowerCase() === task.databaseType.toLowerCase()
          )?.value ?? task.databaseType;

        form.setFieldsValue({
          sourceName: task.sourceName,
          sourceType: task.sourceType,
          databaseType: connectorType,
          ipAddress: task.ipAddress,
          port: task.port,
          username: task.username,
          password: MASKED_PASSWORD,
          databaseName: dbNames,
          assetGroupId: task.assetGroupId,
          scheduleMode: task.scheduleMode,
          executeAt: task.executeAt
            ? dayjs(task.executeAt)
            : task.scheduleMode === "single"
            ? dayjs(task.createTime)
            : undefined,
          sampleCount: 20,
          sampleStrategy: "random",
          sampleStorageMode: "incremental",
          description: task.description,
        });
      } catch (error) {
        console.error("Failed to load import task for editing", error);
        messageApi.error("加载导入任务失败");
      } finally {
        setLoading(false);
      }
    };

    void loadTask();

    return () => {
      cancelled = true;
    };
  }, [editId, form, messageApi]);

  const handleSourceTypeChange = (value: ImportSourceType) => {
    const firstConnector = CONNECTOR_TYPE_OPTIONS[value][0];
    setDatabaseOptions([]);
    setConnectionTestStatus("idle");
    setConnectionTestMessage("");
    setLastTestedFingerprint("");
    form.setFieldsValue({
      databaseType: firstConnector?.value,
      port: firstConnector?.port ?? 0,
      databaseName: undefined,
    });
  };

  const handleConnectorChange = (value: string) => {
    const matched = connectorOptions.find((item) => item.value === value);
    setDatabaseOptions([]);
    setConnectionTestStatus("idle");
    setConnectionTestMessage("");
    setLastTestedFingerprint("");
    form.setFieldsValue({
      port:
        typeof matched?.port === "number"
          ? matched.port
          : form.getFieldValue("port"),
      databaseName: undefined,
    });
  };

  const syncDiscoveredDatabases = (databases: string[]) => {
    const currentDatabaseNames = form.getFieldValue("databaseName");
    const currentSelection = Array.isArray(currentDatabaseNames)
      ? currentDatabaseNames.filter(Boolean)
      : currentDatabaseNames
      ? [currentDatabaseNames]
      : [];
    const preservedSelection = currentSelection.filter((name: string) =>
      databases.includes(name)
    );
    const nextSelection = preservedSelection.length
      ? preservedSelection
      : databases;

    form.setFieldsValue({
      databaseName: nextSelection.length > 0 ? nextSelection : undefined,
    });
  };

  const handleDiscoverDatabases = async (options?: {
    silent?: boolean;
    fingerprint?: string;
  }) => {
    const silent = options?.silent ?? false;
    const values = form.getFieldsValue([
      "sourceType",
      "databaseType",
      "ipAddress",
      "port",
      "username",
      "password",
    ]) as Partial<ImportWorkflowFormValues>;

    if (values.sourceType !== "database") {
      if (!silent) {
        messageApi.warning("当前只有数据库类型支持自动发现数据库列表。");
      }
      return;
    }

    const ipAddress = values.ipAddress?.trim();
    const username = values.username?.trim();
    const password = values.password?.trim();
    const canReuseStoredPassword = Boolean(
      isEditMode && editId && (!password || password === MASKED_PASSWORD)
    );

    if (
      !values.databaseType ||
      !ipAddress ||
      typeof values.port !== "number" ||
      !username ||
      (!password && !canReuseStoredPassword)
    ) {
      if (!silent) {
        await form.validateFields([
          "databaseType",
          "ipAddress",
          "port",
          "username",
          "password",
        ]);
      }
      return;
    }

    setDiscoveringDatabases(true);
    setConnectionTestStatus("testing");
    setConnectionTestMessage(
      silent ? "正在自动测试连通性..." : "正在测试连通性..."
    );

    try {
      const databases = await discoverImportDatabases({
        databaseType: values.databaseType,
        ipAddress,
        port: values.port,
        username,
        ...(canReuseStoredPassword
          ? { taskId: editId }
          : { password: values.password }),
      } satisfies DiscoverImportDatabasesValues);

      setDatabaseOptions(databases);
      syncDiscoveredDatabases(databases);
      setConnectionTestStatus("success");
      setConnectionTestMessage(
        databases.length
          ? `连接成功，已发现 ${databases.length} 个可导入数据库`
          : "连接成功，但未发现可导入数据库"
      );
      setLastTestedFingerprint(
        options?.fingerprint ?? autoConnectionFingerprint
      );

      if (!silent) {
        messageApi.success(
          databases.length
            ? `连接成功，已发现 ${databases.length} 个可导入数据库`
            : "连接成功，但未发现可导入数据库"
        );
      }
    } catch (error) {
      console.error(error);
      setDatabaseOptions([]);
      setConnectionTestStatus("error");
      setConnectionTestMessage("连接失败，无法获取数据库列表");
      setLastTestedFingerprint(
        options?.fingerprint ?? autoConnectionFingerprint
      );
      if (!silent) {
        messageApi.error("连接失败，无法获取数据库列表");
      }
    } finally {
      setDiscoveringDatabases(false);
    }
  };

  const autoConnectionFingerprint = useMemo(() => {
    if (sourceType !== "database") return "";

    const ipAddress = ipAddressValue?.trim();
    const username = usernameValue?.trim();
    const password = passwordValue?.trim();
    const canReuseStoredPassword = Boolean(
      isEditMode && editId && (!password || password === MASKED_PASSWORD)
    );

    if (
      !databaseTypeValue ||
      !ipAddress ||
      typeof portValue !== "number" ||
      !username ||
      (!password && !canReuseStoredPassword)
    ) {
      return "";
    }

    return JSON.stringify({
      sourceType,
      databaseType: databaseTypeValue,
      ipAddress,
      port: portValue,
      username,
      password: canReuseStoredPassword ? MASKED_PASSWORD : password,
      taskId: canReuseStoredPassword ? editId : undefined,
    });
  }, [
    databaseTypeValue,
    editId,
    ipAddressValue,
    isEditMode,
    passwordValue,
    portValue,
    sourceType,
    usernameValue,
  ]);

  useEffect(() => {
    if (
      !autoConnectionFingerprint ||
      autoConnectionFingerprint === lastTestedFingerprint
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      void handleDiscoverDatabases({
        silent: true,
        fingerprint: autoConnectionFingerprint,
      });
    }, 500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [autoConnectionFingerprint, lastTestedFingerprint]);

  const validateStepOne = async () => {
    const currentScheduleMode = form.getFieldValue("scheduleMode");
    const fields = [
      "sourceName",
      "sourceType",
      "databaseType",
      "ipAddress",
      "port",
      "username",
      "password",
      "databaseName",
      "assetGroupId",
      "scheduleMode",
      ...(currentScheduleMode !== "immediate" ? ["executeAt"] : []),
      "sampleCount",
      "sampleStrategy",
      "sampleStorageMode",
    ];
    await form.validateFields(fields);
  };

  const validateStepTwo = async () => {
    if (!form.getFieldValue("createClassificationTask")) {
      return;
    }

    if (
      (form.getFieldValue("classificationTaskMode") ?? "existing") === "existing"
    ) {
      await form.validateFields(["existingClassificationTaskId"]);
      return;
    }

    await form.validateFields([
      "classificationTaskName",
      "classificationTemplateId",
    ]);
  };

  const handleNext = async () => {
    try {
      await validateStepOne();
      setCurrentStep(1);
    } catch {
      messageApi.error("请先完善数据资产属性");
    }
  };

  const handleSubmit = async () => {
    try {
      await validateStepOne();
      await validateStepTwo();
      const values = await form.validateFields();

      setSubmitting(true);

      if (isEditMode && editId) {
        const databaseName = Array.isArray(values.databaseName)
          ? values.databaseName
          : [values.databaseName];

        const findTreeNodeTitle = (
          nodes: Array<{ value: string; title: string; children: any[] }>,
          targetValue: string,
        ): string | undefined => {
          for (const node of nodes) {
            if (node.value === targetValue) return node.title;
            const found = findTreeNodeTitle(node.children ?? [], targetValue);
            if (found) return found;
          }
          return undefined;
        };

        const assetGroupName =
          findTreeNodeTitle(assetGroupOptions, values.assetGroupId) ?? "未分组";

        await updateImportTask(editId, {
          sourceName: values.sourceName,
          sourceType: values.sourceType,
          databaseType: values.databaseType,
          databaseName,
          ipAddress: values.ipAddress,
          port: values.port,
          username: values.username,
          password: values.password,
          assetGroupId: values.assetGroupId,
          assetGroupName,
          scheduleMode: values.scheduleMode,
          executeAt: values.executeAt?.format("YYYY-MM-DD HH:mm:ss"),
          sampleCount: values.sampleCount,
          sampleStrategy: values.sampleStrategy,
          sampleStorageMode: values.sampleStorageMode,
          description: values.description ?? "",
        });

        messageApi.success("导入任务已更新");
        navigate(`/data-assets/import-detail/${editId}`);
        return;
      }

      let linkedClassificationTaskId: string | undefined;

      if (values.createClassificationTask) {
        if ((values.classificationTaskMode ?? "existing") === "existing") {
          const existingTask = classificationTasks.find(
            (task) => task.id === values.existingClassificationTaskId
          );

          if (!existingTask) {
            throw new Error("Selected classification task not found");
          }

          linkedClassificationTaskId = existingTask.id;
        } else {
          const selectedTemplate = templateOptions.find(
            (template) => template.value === values.classificationTemplateId
          );

          const classificationTask = await createClassificationTask(
            {
              taskName:
                values.classificationTaskName ??
                `${values.sourceName}_数据分类分级任务`,
              dataSource: values.sourceName,
              dataType: mapImportSourceTypeToTaskDataType(values.sourceType),
              dataAssetIds: [],
              classificationType: "automatic",
              templateId: values.classificationTemplateId,
              templateName: selectedTemplate?.label,
              scheduleMode: "auto_after_import",
            },
            {
              taskSource: "asset-import",
              sourceLabel: "导入流程",
              creator: "当前用户",
            }
          );

          linkedClassificationTaskId = classificationTask.id;
        }
      }

      const databaseName = Array.isArray(values.databaseName)
        ? values.databaseName
        : [values.databaseName];

      const findTreeNodeTitle = (
        nodes: Array<{ value: string; title: string; children: any[] }>,
        targetValue: string,
      ): string | undefined => {
        for (const node of nodes) {
          if (node.value === targetValue) return node.title;
          const found = findTreeNodeTitle(node.children ?? [], targetValue);
          if (found) return found;
        }
        return undefined;
      };

      const assetGroupName =
        findTreeNodeTitle(assetGroupOptions, values.assetGroupId) ?? "未分组";

      const importTask = await createImportTask(
        {
          sourceName: values.sourceName,
          sourceType: values.sourceType,
          databaseType: values.databaseType,
          databaseName,
          ipAddress: values.ipAddress,
          port: values.port,
          username: values.username,
          password: values.password,
          assetGroupId: values.assetGroupId,
          assetGroupName,
          scheduleMode: values.scheduleMode,
          executeAt: values.executeAt?.format("YYYY-MM-DD HH:mm:ss"),
          sampleCount: values.sampleCount,
          sampleStrategy: values.sampleStrategy,
          sampleStorageMode: values.sampleStorageMode,
          description: values.description ?? "",
        },
        {
          creator: "当前用户",
          classificationTaskId: linkedClassificationTaskId,
          runImmediately:
            values.scheduleMode === "immediate"
              ? true
              : values.runImportImmediately,
          runClassificationImmediatelyAfterImport:
            values.createClassificationTask,
        }
      );

      messageApi.success(
        linkedClassificationTaskId
          ? values.classificationTaskMode === "existing"
            ? "导入任务已创建，并已关联已有分类分级任务"
            : "导入任务和分类分级任务已创建"
          : "导入任务已创建"
      );

      navigate(`/data-assets/import-detail/${importTask.id}`);
    } catch (error) {
      console.error(error);
      if (!submitting) {
        messageApi.error("请先完善表单信息");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    {
      title: "定义数据资产属性",
      description: "配置数据源、连接信息和导入策略",
      icon: <DatabaseOutlined />,
    },
    {
      title: "设计分类分级任务",
      description: "支持关联已有任务或同步新建任务",
      icon: <ExperimentOutlined />,
    },
  ];

  return (
    <PageContainer
      title={isEditMode ? "编辑数据资产导入任务" : "新增数据资产导入任务"}
      onBack={() => navigate(isEditMode && editId ? `/data-assets/import-detail/${editId}` : backPath)}
    >
      {contextHolder}

      <Spin spinning={loading}>
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>
        <Card style={{ marginBottom: 24 }}>
          <Steps current={currentStep} items={steps} />
        </Card>

        <Form<ImportWorkflowFormValues>
          form={form}
          layout="vertical"
          initialValues={{
            sourceType: "database",
            databaseType: "MySQL",
            port: 3306,
            scheduleMode: "immediate",
            sampleCount: 20,
            sampleStrategy: "random",
            sampleStorageMode: "incremental",
            runImportImmediately: false,
            createClassificationTask: true,
            runClassificationImmediatelyAfterImport: false,
            classificationTaskMode: "existing",
            classificationScheduleMode: "single",
          }}
        >
          <div style={{ display: currentStep === 0 ? "block" : "none" }}>
            <Card title="第一步：定义数据资产属性">
              {discoveryPreset.from === "asset-discovery" ? (
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 20 }}
                  message="已从数据资产发现带入连接信息"
                  description="IP、端口和数据库类型已自动预填，请继续补充资产名称、访问密码、资产分组和同步策略。"
                />
              ) : null}

              <Row gutter={20}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="数据资产名称"
                    name="sourceName"
                    rules={[{ required: true, message: "请输入数据资产名称" }]}
                  >
                    <Input
                      placeholder="例如：import_demo_mysql_3308"
                      maxLength={50}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="数据源类型"
                    name="sourceType"
                    rules={[{ required: true, message: "请选择数据源类型" }]}
                  >
                    <Select
                      options={SOURCE_TYPE_OPTIONS}
                      onChange={(value) =>
                        handleSourceTypeChange(value as ImportSourceType)
                      }
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={20}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="接入类型"
                    name="databaseType"
                    rules={[{ required: true, message: "请选择接入类型" }]}
                  >
                    <Select
                      options={connectorOptions}
                      onChange={handleConnectorChange}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="资产分组"
                    name="assetGroupId"
                    rules={[{ required: true, message: "请选择资产分组" }]}
                  >
                    <TreeSelect
                      showSearch
                      treeDefaultExpandAll
                      placeholder="请选择资产分组"
                      treeData={assetGroupOptions}
                      treeNodeFilterProp="title"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={20}>
                <Col xs={24} md={16}>
                  <Form.Item
                    label="接入地址"
                    name="ipAddress"
                    rules={[{ required: true, message: "请输入接入地址" }]}
                  >
                    <Input placeholder="例如：127.0.0.1" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item
                    label="端口号"
                    required
                  >
                    <Space.Compact block>
                      <Form.Item
                        name="port"
                        noStyle
                        rules={[{ required: true, message: "请输入端口号" }]}
                      >
                        <InputNumber
                          min={0}
                          max={65535}
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                      <Button
                        size="small"
                        icon={<SyncOutlined />}
                        loading={discoveringDatabases}
                        onClick={() => {
                          void handleDiscoverDatabases();
                        }}
                      >
                        测试
                      </Button>
                    </Space.Compact>
                  </Form.Item>
                </Col>
              </Row>

              {connectionTestStatus !== "idle" ? (
                <div style={{ marginTop: -12, marginBottom: 16 }}>
                  <Text
                    type={connectionTestStatus === "error" ? "danger" : undefined}
                    style={
                      connectionTestStatus === "success"
                        ? { color: "#389e0d" }
                        : undefined
                    }
                  >
                    {connectionTestMessage}
                  </Text>
                </div>
              ) : null}

              <Row gutter={20}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="访问账号"
                    name="username"
                    rules={[{ required: true, message: "请输入访问账号" }]}
                  >
                    <Input placeholder="例如：importer" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="访问密码"
                    name="password"
                    rules={[{ required: true, message: "请输入访问密码" }]}
                  >
                    <Input.Password
                      placeholder={
                        isEditMode
                          ? "已保存访问密码，如需修改请直接输入新密码"
                          : "请输入访问密码"
                      }
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label="数据库名 / Schema"
                name="databaseName"
                rules={[{ required: true, message: "请选择数据库名" }]}
                extra="数据库名称会从真实连接中自动发现，支持同时选择多个数据库。"
              >
                <Select
                  mode="multiple"
                  showSearch
                  placeholder="请先测试连接并获取数据库列表"
                  options={databaseOptions.map((item) => ({
                    value: item,
                    label: item,
                  }))}
                  optionFilterProp="label"
                />
              </Form.Item>

              <Row gutter={20}>
                <Col xs={24} md={scheduleMode === "immediate" ? 24 : 8}>
                  <Form.Item
                    label="同步策略"
                    name="scheduleMode"
                    rules={[{ required: true, message: "请选择同步策略" }]}
                  >
                    <Select
                      options={SCHEDULE_MODE_OPTIONS}
                      onChange={(value: ImportScheduleMode) => {
                        if (value !== "immediate" && !form.getFieldValue("executeAt")) {
                          form.setFieldsValue({
                            executeAt: dayjs().hour(23).minute(0).second(0),
                          });
                        }
                      }}
                    />
                  </Form.Item>
                </Col>
                {scheduleMode !== "immediate" && (
                  <Col xs={24} md={16}>
                    <Form.Item
                      label={
                        scheduleMode === "single" ? "执行时间" : "首次执行时间"
                      }
                      name="executeAt"
                      rules={[{ required: true, message: "请选择执行时间" }]}
                    >
                      <DatePicker
                        showTime
                        format="YYYY-MM-DD HH:mm"
                        style={{ width: "100%" }}
                      />
                    </Form.Item>
                  </Col>
                )}
              </Row>

              <Row gutter={20}>
                <Col xs={24} md={8}>
                  <Form.Item
                    label="样本抽取数量"
                    name="sampleCount"
                    rules={[{ required: true, message: "请输入样本抽取数量" }]}
                  >
                    <InputNumber
                      min={1}
                      max={200}
                      style={{ width: "100%" }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item
                    label="抽取方式"
                    name="sampleStrategy"
                    rules={[{ required: true, message: "请选择样本抽取方式" }]}
                  >
                    <Select options={SAMPLE_STRATEGY_OPTIONS} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item
                    label="样本存储方式"
                    name="sampleStorageMode"
                    rules={[
                      { required: true, message: "请选择样本存储方式" },
                    ]}
                  >
                    <Select options={SAMPLE_STORAGE_MODE_OPTIONS} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="任务描述" name="description">
                <TextArea
                  rows={4}
                  placeholder="补充说明导入目标、同步策略和业务背景"
                  maxLength={300}
                  showCount
                />
              </Form.Item>

              {!isEditMode && scheduleMode !== "immediate" && (
                <>
                  <Form.Item
                    name="runImportImmediately"
                    valuePropName="checked"
                    style={{ marginBottom: 0 }}
                  >
                    <Checkbox>
                      任务创建成功后立即执行一次导入任务
                    </Checkbox>
                  </Form.Item>
                  <Text type="secondary">
                    取消勾选后，本次仅保存导入任务与执行时间配置，不会在提交后立刻启动导入。
                  </Text>
                </>
              )}
            </Card>
          </div>

          <div style={{ display: currentStep === 1 ? "block" : "none" }}>
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <Card title="第二步：设计数据分类分级任务">
                <Row gutter={[16, 16]} align="middle">
                  <Col span={18}>
                    <Space direction="vertical" size={4}>
                      <Space>
                        <ProfileOutlined />
                        <Text strong>关联分类分级任务</Text>
                        <Tag color="processing">支持关联已有或新建任务</Tag>
                      </Space>
                      <Text type="secondary">
                        你可以把本次导入的数据资产挂到已有分类分级任务下，也可以同步新建一个分类分级任务。
                      </Text>
                    </Space>
                  </Col>
                  <Col span={6} style={{ textAlign: "right" }}>
                    <Form.Item
                      name="createClassificationTask"
                      valuePropName="checked"
                      noStyle
                    >
                      <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              <Card
                title="导入资产摘要"
                extra={
                  <Tag icon={<CheckCircleOutlined />} color="blue">
                    将始终创建导入任务
                  </Tag>
                }
              >
                <Row gutter={[16, 12]}>
                  <Col xs={24} md={8}>
                    <Text type="secondary">数据资产名称：</Text>
                    <Text strong>{sourceName || "-"}</Text>
                  </Col>
                  <Col xs={24} md={8}>
                    <Text type="secondary">数据库名：</Text>
                    <Text>
                      {(() => {
                        const v = form.getFieldValue("databaseName");
                        if (Array.isArray(v)) return v.join("、") || "-";
                        return v || "-";
                      })()}
                    </Text>
                  </Col>
                  <Col xs={24} md={8}>
                    <Text type="secondary">接入类型：</Text>
                    <Text>{form.getFieldValue("databaseType") || "-"}</Text>
                  </Col>
                  <Col xs={24} md={12}>
                    <Text type="secondary">资产分组：</Text>
                    <Text>
                      {(() => {
                        const groupId = form.getFieldValue("assetGroupId");
                        const findTitle = (nodes: any[]): string | undefined => {
                          for (const n of nodes) {
                            if (n.value === groupId) return n.title;
                            const found = findTitle(n.children ?? []);
                            if (found) return found;
                          }
                          return undefined;
                        };
                        return findTitle(assetGroupOptions) || "-";
                      })()}
                    </Text>
                  </Col>
                  <Col xs={24} md={12}>
                    <Text type="secondary">同步策略：</Text>
                    <Text>
                      {scheduleMode === "immediate"
                        ? "任务创建后立即导入"
                        : (() => {
                            const label = scheduleMode === "single" ? "执行时间" : "首次执行时间";
                            const timeVal = form.getFieldValue("executeAt");
                            const timeStr = timeVal
                              ? dayjs(timeVal).format("YYYY-MM-DD HH:mm")
                              : "-";
                            return `${SCHEDULE_MODE_OPTIONS.find((o) => o.value === scheduleMode)?.label ?? "-"} / ${label}：${timeStr}`;
                          })()}
                    </Text>
                  </Col>
                </Row>
              </Card>

              {createClassificationTaskSwitch ? (
                <Card title="分类分级任务参数">
                  <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 20 }}
                    message="分类分级任务将在数据导入完成后自动执行"
                  />

                  <Form.Item
                    label="关联方式"
                    name="classificationTaskMode"
                    style={{ marginBottom: 20 }}
                  >
                    <Radio.Group
                      optionType="button"
                      buttonStyle="solid"
                      options={TASK_MODE_OPTIONS.map((item) => ({
                        ...item,
                        disabled:
                          item.value === "existing" &&
                          classificationTasks.length === 0,
                      }))}
                    />
                  </Form.Item>

                  {classificationTaskMode === "existing" ? (
                    <Space
                      direction="vertical"
                      size={16}
                      style={{ width: "100%" }}
                    >
                      <Form.Item
                        label="已有分类分级任务"
                        name="existingClassificationTaskId"
                        rules={[
                          {
                            required: true,
                            message: "请选择已有分类分级任务",
                          },
                        ]}
                      >
                        <Select
                          showSearch
                          optionFilterProp="label"
                          placeholder="请选择已有分类分级任务"
                          options={classificationTasks.map((task) => ({
                            value: task.id,
                            label: task.taskName,
                          }))}
                        />
                      </Form.Item>

                      {classificationTasks.length ? null : (
                        <Alert
                          type="info"
                          showIcon
                          message="暂无可关联的分类分级任务"
                          description="当前任务列表里还没有可复用的分类分级任务，请切换到“新建分类任务”。"
                        />
                      )}

                      {selectedExistingTask ? (
                        <Card
                          size="small"
                          title="已有任务信息"
                          extra={
                            <Tag color="blue">提交后将追加本次导入资产</Tag>
                          }
                        >
                          <Descriptions column={2} size="small">
                            <Descriptions.Item label="任务名称">
                              {selectedExistingTask.taskName}
                            </Descriptions.Item>
                            <Descriptions.Item label="数据类型">
                              {mapTaskDataTypeToLabel(
                                selectedExistingTask.dataType
                              )}
                            </Descriptions.Item>
                            <Descriptions.Item label="分类分级模版">
                              {selectedExistingTask.templateName || "-"}
                            </Descriptions.Item>
                            <Descriptions.Item label="执行策略">
                              {CLASSIFICATION_SCHEDULE_MODE_OPTIONS.find(
                                (item) =>
                                  item.value === selectedExistingTask.scheduleMode
                              )?.label || "-"}
                            </Descriptions.Item>
                            <Descriptions.Item label="任务执行时间">
                              {selectedExistingTask.executeAt || "-"}
                            </Descriptions.Item>
                            <Descriptions.Item label="已关联数据资产" span={2}>
                              {selectedExistingTask.dataAssetNames.length
                                ? selectedExistingTask.dataAssetNames.join("、")
                                : "-"}
                            </Descriptions.Item>
                          </Descriptions>
                        </Card>
                      ) : null}
                    </Space>
                  ) : (
                    <Space
                      direction="vertical"
                      size={16}
                      style={{ width: "100%" }}
                    >
                      <Alert
                        type="info"
                        showIcon
                        message="将同步创建新的分类分级任务"
                        description="新任务会自动带入本次导入的数据资产；数据类型默认根据数据源类型生成。"
                      />

                      <Row gutter={20}>
                        <Col xs={24} md={12}>
                          <Form.Item
                            label="任务名称"
                            name="classificationTaskName"
                            rules={[
                              {
                                required: true,
                                message: "请输入分类分级任务名称",
                              },
                            ]}
                          >
                            <Input
                              placeholder="请输入分类分级任务名称"
                              maxLength={60}
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item
                            label="关联模板"
                            name="classificationTemplateId"
                            rules={[
                              {
                                required: true,
                                message: "请选择分类分级模板",
                              },
                            ]}
                          >
                            <Select options={templateOptions} />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Row gutter={20}>
                        <Col xs={24} md={12}>
                          <Form.Item label="数据类型">
                            <Input
                              value={mapTaskDataTypeToLabel(
                                mapImportSourceTypeToTaskDataType(sourceType)
                              )}
                              readOnly
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item label="数据资产">
                            <Input value={sourceName || "-"} readOnly />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Row gutter={20}>
                        <Col xs={24} md={12}>
                          <Form.Item label="执行策略">
                            <Input value="导入完成后自动执行" readOnly />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Space>
                  )}
                </Card>
              ) : (
                <Alert
                  type="info"
                  showIcon
                  message="已关闭关联分类分级任务"
                  description="本次仅创建数据资产导入任务，后续仍可在分类分级任务页单独创建或关联分类任务。"
                />
              )}
            </Space>
          </div>
        </Form>

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Space size="large">
            {currentStep > 0 ? (
              <Button onClick={() => setCurrentStep(0)}>上一步</Button>
            ) : null}
            {currentStep === 0 ? (
              <Button type="primary" onClick={() => void handleNext()}>
                下一步
              </Button>
            ) : (
              <Button
                type="primary"
                loading={submitting}
                onClick={() => void handleSubmit()}
              >
                {isEditMode ? "保存修改" : "提交并创建任务"}
              </Button>
            )}
            <Button onClick={() => navigate(backPath)}>取消</Button>
          </Space>
        </div>
      </div>
      </Spin>
    </PageContainer>
  );
};

export default DataImportForm;
