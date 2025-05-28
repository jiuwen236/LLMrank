# 数据库设计

## 技术栈

- **数据库**: SQLite (本地文件)
- **ORM**: Prisma
- **位置**: `server/prisma/dev.db`

## Schema 查看

数据库的完整结构定义在 Prisma Schema 文件中：

```bash
# 查看数据库Schema
cat server/prisma/schema.prisma
```

## 核心表说明

### Model (模型表)

存储LLM模型信息，包括名称、隐藏状态、排序等。

### Dataset (数据集表)

存储数据集信息，区分模型信息列和评测数据集列。

### DataPoint (数据点表)

存储模型在各数据集上的具体数据，支持多值和推测值。

### UserTable (用户表配置)

以JSON格式存储用户的完整表格配置。

### IdCounter (ID计数器)

管理模型和数据集的ID自动分配。

### AdminPassword (管理员密码)

存储管理员认证信息。

## ID 分配规则

- **模型ID**: 100+ (递增)
- **数据集ID**:
  - 模型信息列: 50-99
  - 评测数据集: 100+
- **控制行ID**: 1-6 (特殊用途)

## 数据关系

```
Model (1) ←→ (N) DataPoint (N) ←→ (1) Dataset
             ↓
         UserTable (JSON存储完整配置)
```

## 重要字段说明

### isModelInfo

- `true`: 模型信息列 (价格、上下文等)
- `false`: 评测数据集列

### showInModel / showInColumn

- 控制详细信息图标的显示位置
- 用于模型名和列名旁的信息展示

### 特殊ID含义

- `id=50`: 输入价格
- `id=51`: 输出价格
- `id=53`: 上下文长度
- `id=54`: 知识截止日期
- `id=56`: API名称
- `id=57`: 是否Thinking模式

## 数据库操作

### 查看数据库

```bash
cd server
npx prisma studio
```

### 更新Schema

```bash
cd server
npx prisma db push
npx prisma generate
```

### 常用查询示例

```typescript
// 获取所有可见模型
const models = await prisma.model.findMany({
  where: { isHidden: false, isModel: true },
  orderBy: { sortOrder: 'asc' },
});

// 获取模型的数据点
const dataPoints = await prisma.dataPoint.findMany({
  where: { modelId: 100 },
  include: { dataset: true },
});
```
