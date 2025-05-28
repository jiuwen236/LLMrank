#!/bin/bash

echo "Deploying..."

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}📦 Installing PM2...${NC}"
    sudo npm install -g pm2
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install PM2. Please run: sudo npm install -g pm2${NC}"
        exit 1
    fi
fi

# Check if serve is installed
if ! command -v serve &> /dev/null; then
    echo -e "${YELLOW}📦 Installing serve globally...${NC}"
    sudo npm install -g serve
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install serve. Please run: sudo npm install -g serve${NC}"
        exit 1
    fi
fi

# Stop any existing processes
echo -e "${YELLOW}🛑 Stopping existing processes...${NC}"
pm2 delete llm-backend 2>/dev/null || true
pm2 delete llm-frontend 2>/dev/null || true
pkill -f "tsx.*src/index.ts" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "serve.*dist" 2>/dev/null || true

# Clean up existing build artifacts for a fresh build
echo -e "${YELLOW}🧹 Cleaning up old build files...${NC}"
rm -rf client/dist
rm -rf server/dist

# Build the project with optimization flags
echo -e "${YELLOW}🔨 Building project with optimizations...${NC}"
NODE_ENV=production npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed. Please check the errors above.${NC}"
    exit 1
fi

# Create logs directory
mkdir -p logs

# Start services with PM2
echo -e "${YELLOW}🚀 Starting services with PM2...${NC}"
pm2 start ./ecosystem.config.js
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to start services with PM2${NC}"
    exit 1
fi

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
echo -e "${YELLOW}⚡ Setting up PM2 startup script...${NC}"
pm2 startup | tail -n 1 | sudo bash

# Wait a moment for services to start
echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
sleep 10

# Display PM2 status
echo -e "\n${YELLOW}📊 PM2 Process Status:${NC}"
pm2 status

# Generate and display bundle analysis
echo -e "\n${YELLOW}📊 Generating bundle analysis...${NC}"
echo "Bundle analysis available at: client/stats.html"

echo -e "\n${YELLOW}📝 Useful PM2 Commands:${NC}"
echo "pm2 status          - Check process status"
echo "pm2 logs            - View all logs"
echo "pm2 logs llm-backend - View backend logs"
echo "pm2 logs llm-frontend - View frontend logs"
echo "pm2 restart all     - Restart all processes"
echo "pm2 stop all        - Stop all processes"
echo "pm2 delete all      - Delete all processes"

echo -e "\n${GREEN}🎉 Production deployment completed!${NC}"
echo -e "Frontend: http://124.221.176.216:5173"
echo -e "Backend:  http://124.221.176.216:3000" 
