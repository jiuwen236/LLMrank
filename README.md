# LLM 排名网站 🎯

> 大模型排名表格系统，支持拖拽排序、数据编辑、配置管理

## 🚀 在线访问

**网站**: http://124.221.176.216:5173

## ✨ 核心功能

- **拖拽排序**: 模型和列的自由排列
- **实时编辑**: 双击编辑数据和备注，可以添加项、隐藏项
- **多值处理**: 自动平均多源数据，支持推测值
- **用户配置**: 保存个人表格数据和布局
- **CSV导入导出**: 完整的数据管理
- **多语言**: 简体中文/English界面切换

## 🛠️ 技术栈

**前端**: React 18 + TypeScript + Ant Design + Zustand  
**后端**: Node.js + Express + Prisma + SQLite  
**工具**: Vite + ESLint + Prettier

## 🔧 快速开始

```bash
# 安装依赖
npm install

# 设置数据库
cd server && npx prisma db push && npx prisma generate

# 导入数据
npx tsx src/scripts/import-csv.ts

# 启动开发环境
npm run dev

# 格式化代码
npx prettier --write .

# 部署到生产环境
bash deploy-production.sh
```

## 📚 详细文档

`docs` 目录下有详细的开发指南和数据格式说明。

## 🔐 权限管理

- **用户**: 保存个人配置、导出数据
- **管理员**: 修改默认数据、系统配置

## 🤝 欢迎贡献

如果您有任何问题或建议，请随时提交 [Issue](https://github.com/jiuwen236/LLMrank/issues)。如果您想贡献代码，请提交 [Pull Request](https://github.com/jiuwen236/LLMrank/pulls)。

## 📄 许可证

[MIT License](https://opensource.org/license/mit/)
