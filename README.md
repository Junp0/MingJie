# My Ant Design Pro

## Import Test Database

用于手工导入测试的建库脚本已经在仓库里：

- 主数据脚本：`scripts/mysql3308-import-demo.sql`
- 脱敏/加密验证脚本：`scripts/mysql3308-protection-feature-demo.sql`
- 独立实例编排：`docker-compose.import-test.yml`
- 初始化入口脚本：`scripts/mysql3308-entrypoint-init.sh`

这个独立实例不会影响当前业务库 `127.0.0.1:3307/my_ant_design_pro`，它单独监听 `127.0.0.1:3308`，首次启动时会自动创建并导入 `import_demo_mysql_3308`。

### 启动

```bash
docker compose -f docker-compose.import-test.yml up -d
```

### 连接信息

- Host: `127.0.0.1`
- Port: `3308`
- Database: `import_demo_mysql_3308`
- Username: `importer`
- Password: `importer123`
- Root password: `root_password`

### 手工导入额外 SQL

```bash
mysql -h 127.0.0.1 -P 3308 -u importer -pimporter123 import_demo_mysql_3308 < your-file.sql
```

### 清理并重建

如果你希望重新执行初始化导入，需要连同数据卷一起删除：

```bash
docker compose -f docker-compose.import-test.yml down -v
docker compose -f docker-compose.import-test.yml up -d
```
