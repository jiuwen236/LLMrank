# 常用命令

## 环境安装

### 项目初始化

```bash
# 安装依赖
npm install

# 数据库初始化
cd server
npx prisma db push
npx prisma generate

# 导入默认数据
npx tsx scripts/import-csv.ts

# 启动开发环境
cd ..
npm run dev
```

## 开发调试

### 启动服务

```bash
# 同时启动前后端
npm run dev

# 仅启动前端 (5173端口)
npm run dev:client

# 仅启动后端 (3000端口)
npm run dev:server

# 格式化代码
npx prettier --write .
```

### 直接部署

```bash
# 构建所有项目
npm run build

# 生产模式启动
npm run start

# 生产部署
npm run build
cd server
npm run start
```

### pm2部署

```bash
# 部署到生产环境
bash deploy-production.sh
# 停止服务
pm2 stop all
```

## 数据库管理

### 基本操作

```bash
cd server

# 打开数据库管理界面
npx prisma studio

# 更新数据库schema
npx prisma db push

# 生成Prisma客户端
npx prisma generate

# 查看数据库Schema
cat server/prisma/schema.prisma
```

### 数据备份恢复

```bash
# 备份数据库
cp server/prisma/dev.db server/prisma/dev.db.backup

# 恢复数据库
cp server/prisma/dev.db.backup server/prisma/dev.db
```

## CSV数据管理

### 数据导入导出

```bash
cd server

# 导入默认数据
npx tsx scripts/import-csv.ts

# 增量更新 (保留现有数据)
npx tsx scripts/update-from-csv.ts

# 修改admin密码
npx tsx scripts/set-admin-password.js

# 导出到CSV
npx tsx scripts/export-to-csv.ts
```

### 数据备份

```bash
# CSV文件备份
cd server
bash data/back_up.sh
```

## 调试排错

### 日志查看

```bash
cd server

# 检查数据库状态
npx prisma studio
```

### 文件查看

```bash
# 查看CSV文件
cat server/data/default-ranking.csv
cat server/data/data-notes.csv

# 查看数据库Schema
cat server/prisma/schema.prisma
```

## 快速参考

### 端口配置

- 前端开发: http://localhost:5173
- 后端API: http://localhost:3000
- 数据库管理: npx prisma studio (通常是 http://localhost:5555)

### 重要目录

- 前端源码: `client/src/`
- 后端源码: `server/src/`
- 数据库文件: `server/prisma/dev.db`
- CSV数据: `server/data/`
- 备份目录: `server/data/private/`

### 常见任务快捷方式

```bash
# 重置开发环境
cd server
rm prisma/dev.db
npx prisma db push
npx tsx scripts/import-csv.ts

# 数据更新流程
cd server/data
bash back_up.sh              # 备份
cd ..
npx tsx scripts/import-csv.ts  # 导入
npx prisma studio            # 验证

# 格式化代码
npx prettier --write .
```
