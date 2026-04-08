# MingJie - 数据分类分级治理平台

MingJie 是一款企业级数据分类分级治理平台，提供数据资产发现、自动分类分级、敏感数据识别、脱敏加密策略管理及全链路审计等能力，帮助组织高效落地数据安全合规治理。

## 功能概览

| 模块 | 说明 |
|------|------|
| **数据总览** | 数据资产统计仪表盘，支持全量、表级、遗漏数据多维视图 |
| **数据资产管理** | 树形资产分组、数据库/表/列元数据自动采集与管理 |
| **数据导入** | 多源数据库连接、批量导入、字段级采样策略、进度追踪 |
| **自动扫描** | 基于 Cron 的定时扫描规则，自动发现新增数据资产 |
| **分类分级** | 模板化分类框架、正则规则引擎、四级数据分级 (公开/内部/机密/绝密) |
| **脱敏加密** | 基于数据级别的脱敏与加密策略定义与管理 |
| **审计日志** | 全操作审计追踪，覆盖认证、资产、分类、扫描等全业务链路 |
| **用户与角色** | RBAC 权限模型，内置超级管理员/数据管理员/审计员/只读 四种预设角色 |

## 技术栈

**后端**
- NestJS 11 + TypeScript
- Prisma ORM + MySQL 8.4
- JWT 认证 + Passport.js
- Swagger/OpenAPI 文档

**前端**
- React 19 + TypeScript
- UMI Max + Ant Design 5 + Pro Components
- Ant Design Charts 数据可视化

**基础设施**
- Docker Compose 容器编排
- 资源监控脚本（内存/CPU/磁盘/OOM 检测）

## 快速开始

### 环境要求

- Node.js >= 18
- Docker & Docker Compose
- 内存 >= 3.6 GB

### 一键启动（开发环境）

```bash
chmod +x start.sh
./start.sh
```

启动脚本会自动完成：MySQL 容器启动 → 数据库健康检查 → 后端依赖安装 & Prisma 客户端生成 → 后端启动 → 前端依赖安装 → 前端启动。

### 手动启动

**1. 启动数据库**

```bash
docker compose up -d
```

**2. 启动后端**

```bash
cd backend
cp .env.example .env  # 按需修改数据库连接等配置
npm install
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

**3. 启动前端**

```bash
cd frontend
pnpm install   # 或 npm install
npm run start:dev
```

### 访问地址

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:8000 |
| 后端 API | http://localhost:3001 |
| Swagger 文档 | http://localhost:3001/docs |
| MySQL | 127.0.0.1:3307 |

## 环境变量

在 `backend/.env` 中配置：

```env
# 数据库连接
DATABASE_URL="mysql://app:your_password@127.0.0.1:3307/my_ant_design_pro"

# 服务端口
PORT=3001

# JWT 密钥（生产环境务必替换）
JWT_SECRET="replace-with-your-jwt-secret"
```

## 项目结构

```
MingJieDCG/
├── backend/
│   ├── src/
│   │   ├── auth/                    # JWT 认证 & RBAC 鉴权
│   │   ├── users/                   # 用户管理
│   │   ├── roles/                   # 角色 & 权限管理
│   │   ├── asset-groups/            # 资产分组（树形结构）
│   │   ├── data-assets/             # 数据资产目录
│   │   ├── import-tasks/            # 数据导入任务
│   │   ├── classification-tasks/    # 分类分级任务
│   │   ├── classification-templates/# 分类模板
│   │   ├── auto-scan/               # 自动扫描
│   │   ├── protection-features/     # 脱敏 & 加密策略
│   │   ├── data-overview/           # 数据总览统计
│   │   ├── audit-logs/              # 审计日志
│   │   └── task-scheduler/          # 后台任务调度
│   └── prisma/
│       ├── schema.prisma            # 数据模型定义
│       └── migrations/              # 数据库迁移
├── frontend/
│   ├── src/
│   │   ├── pages/                   # 页面组件
│   │   ├── services/                # API 调用层
│   │   └── components/              # 公共组件
│   └── config/
│       ├── routes.ts                # 路由配置
│       └── config.ts                # UMI 配置
├── scripts/                         # 监控 & 初始化脚本
├── docker-compose.yml               # 主数据库编排
├── docker-compose.import-test.yml   # 测试数据库编排
└── start.sh                         # 一键启动脚本
```

## 权限模型

系统采用 RBAC 权限模型，共 8 个权限组、23 项细粒度权限：

| 权限组 | 权限项 |
|--------|--------|
| 平台首页 | 查看 |
| 数据总览 | 查看 |
| 数据资产 | 查看、创建、编辑、删除 |
| 分类分级 | 查看、创建、编辑、删除 |
| 审计日志 | 查看 |
| 用户管理 | 查看、创建、编辑、删除 |
| 角色管理 | 查看、创建、编辑、删除 |
| 系统管理 | 查看、编辑 |

**预设角色：**

- **超级管理员** — 全部 23 项权限
- **数据管理员** — 数据资产 + 分类分级完整权限
- **审计员** — 各模块只读 + 审计日志查看
- **只读用户** — 基础模块只读权限

## 测试数据库

用于导入功能测试的独立 MySQL 实例：

```bash
# 启动测试数据库
docker compose -f docker-compose.import-test.yml up -d
```

| 端口 | 数据库 | 用户名 | 密码 |
|------|--------|--------|------|
| 3308 | import_demo_mysql_3308 | importer | importer123 |
| 3310 | import_demo_mysql_3310 | importer | importer123 |

```bash
# 清理并重建
docker compose -f docker-compose.import-test.yml down -v
docker compose -f docker-compose.import-test.yml up -d
```

## 构建部署

```bash
# 后端构建
cd backend && npm run build

# 前端构建
cd frontend && npm run build
```

## License

MIT
