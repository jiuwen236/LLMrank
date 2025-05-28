# API 接口文档

## 基础信息

- **Base URL**: `http://服务器IP:3000/api`
- **Content-Type**: `application/json`

## 核心接口

### 1. 获取默认数据

```
GET /api/models          # 获取所有模型
GET /api/datasets        # 获取所有数据集
GET /api/data-points     # 获取所有数据点
```

### 2. 用户表管理

```
GET  /api/user-tables/default        # 获取默认表配置
GET  /api/user-tables/{userId}       # 获取用户表
POST /api/user-tables                # 保存用户表
```

**保存用户表请求体**:

```json
{
  "userId": "user123",
  "adminPassword": "optional_admin_password",
  "data": {
    "modelsData": [...],
    "datasetsData": [...],
    "dataPointsData": [...],
    "modelOrder": [...],
    "datasetOrder": [...],
    "hiddenModels": [...],
    "hiddenDatasets": [...]
  }
}
```

### 3. 数据管理

```
POST /api/models         # 添加模型
PUT  /api/models/{id}    # 更新模型
POST /api/datasets       # 添加数据集
PUT  /api/datasets/{id}  # 更新数据集
```

### 4. 工具接口

```
GET  /api/max-ids        # 获取下一个可用ID
POST /api/download       # 生成CSV下载包
```

**下载请求体**:

```json
{
  "models": [...],
  "datasets": [...],
  "dataPoints": [...],
  "visibleModelIds": [...],
  "visibleDatasetIds": [...]
}
```

## 数据结构

### Model

```typescript
{
  id: string,
  name: string,
  fullName?: string,
  apiName?: string,
  isHidden: boolean,
  sortOrder: number,
  showInColumn: boolean
}
```

### Dataset

```typescript
{
  id: string,
  name: string,
  fullName: string,
  notes?: string,
  isHidden: boolean,
  sortOrder: number,
  isModelInfo: boolean,
  showInModel: boolean
}
```

### DataPoint

```typescript
{
  id: string,
  modelId: string,
  datasetId: string,
  value?: string,
  notes?: string
}
```

## 响应格式

成功响应:

```json
{
  "success": true,
  "data": {...},
  "isAdmin": false
}
```

错误响应:

```json
{
  "success": false,
  "error": "Error message"
}
```
