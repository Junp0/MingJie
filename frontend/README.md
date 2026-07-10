# MingJie Frontend

MingJie 前端应用，基于 React、UMI Max 和 Ant Design Pro 构建。

## 启动方式

项目统一使用根目录 Docker Compose 启动：

```bash
cd ..
docker compose -f docker-compose.prod.yml up -d --build
```

前端容器会通过 Nginx 提供静态站点，并监听 `http://localhost:8000`。

更多端口、环境变量和常用命令请查看根目录 `README.md`。
