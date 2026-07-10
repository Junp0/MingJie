# MingJie Backend

MingJie 后端服务，基于 NestJS、Prisma 和 MySQL 构建。

## 启动方式

项目统一使用根目录 Docker Compose 启动：

```bash
cd ..
docker compose -f docker-compose.prod.yml up -d --build
```

后端容器启动时会自动执行 Prisma 迁移，并监听 `http://localhost:3001`。

更多端口、环境变量和常用命令请查看根目录 `README.md`。
