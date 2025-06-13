# LLM Ranking Website 🎯

> Large Language Model ranking table system with drag-and-drop sorting, data editing, and configuration management

## 🚀 Online Access

**Website**: http://124.221.176.216:5173

## ✨ Core Features

- **Drag & Drop Sorting**: Free arrangement of models and columns
- **Real-time Editing**: Double-click to edit data and notes, add/hide items
- **Multi-value Processing**: Automatically average multi-source data, support estimated values
- **User Configuration**: Save personal table data and layout
- **CSV Import/Export**: Complete data management
- **Multi-language**: Simplified Chinese/English interface switching

## 🛠️ Tech Stack

**Frontend**: React 18 + TypeScript + Ant Design + Zustand  
**Backend**: Node.js + Express + Prisma + SQLite  
**Tools**: Vite + ESLint + Prettier

## 🔧 Quick Start

```bash
# Install dependencies
npm install

# Setup database
cd server && npx prisma db push && npx prisma generate

# Import data
npx tsx src/scripts/import-csv.ts

# Start development environment
npm run dev

# Format code
npx prettier --write .

# Deploy to production
bash deploy-production.sh
```

## 📚 Detailed Documentation

The `docs` directory contains detailed development guides and data format specifications.

## 🔐 Permission Management

- **Users**: Save personal configurations, export data
- **Administrators**: Modify default data, system configuration

## 🤝 Contributing

If you have any questions or suggestions, please feel free to submit an [Issue](https://github.com/jiuwen236/LLMrank/issues). If you want to contribute code, please submit a [Pull Request](https://github.com/jiuwen236/LLMrank/pulls).

## 📄 License

[MIT License](https://opensource.org/license/mit/)
