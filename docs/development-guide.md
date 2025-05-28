# 开发指南

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 8.0.0

### 安装与启动

```bash
# 1. 安装依赖
npm install

# 2. 数据库初始化
cd server
npx prisma db push
npx prisma generate

# 3. 导入默认数据
npx tsx scripts/import-csv.ts

# 4. 启动开发服务器
cd ..
npm run dev
```

访问: http://localhost:5173

## 项目结构

```
├── client/               # React前端
│   ├── src/components/   # 组件
│   ├── src/stores/       # Zustand状态管理
│   ├── src/types/        # TypeScript类型
│   └── src/locales/      # 中英文翻译
├── server/               # Node.js后端
│   ├── src/routes/       # API路由
│   ├── prisma/           # 数据库Schema
│   └── data/             # 默认CSV数据
└── docs/                 # 文档
```

## 核心技术栈

**前端**

- React 18 + TypeScript
- Ant Design (UI组件)
- @dnd-kit (拖拽排序)
- Zustand (状态管理)

**后端**

- Node.js + Express
- Prisma + SQLite
- TypeScript

## 开发规范

### 代码风格

- 使用TypeScript严格模式
- 组件用函数式写法
- 所有注释用英文
- 遵循ESLint/Prettier规范

### Git提交格式

```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 样式调整
refactor: 重构
```

## 常用命令

```bash
# 开发
npm run dev              # 同时启动前后端
npm run dev:client       # 仅前端 (5173端口)
npm run dev:server       # 仅后端 (3000端口)

# 构建
npm run build            # 构建所有项目
npm run start            # 生产模式启动

# 数据库
cd server
npx prisma studio        # 打开数据库管理界面
npx prisma db push       # 更新数据库schema
```

## 部署信息

**服务器配置**

- 前端: 5173端口
- 后端: 3000端口
- 数据库: SQLite本地文件

**生产部署**

```bash
npm run build
cd server
npm run start
```
