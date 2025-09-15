#!/bin/bash

# InfoStream MVP 快速启动脚本
# 使用方法: ./scripts/quick-start.sh

echo "⚡ InfoStream MVP 快速启动"
echo "=========================="

# 检查是否在正确的目录
if [ ! -f "server/package.json" ] || [ ! -f "web/package.json" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    exit 1
fi

# 检查依赖是否安装
echo "🔍 检查依赖..."
if [ ! -d "server/node_modules" ]; then
    echo "📦 安装后端依赖..."
    cd server && npm install && cd ..
fi

if [ ! -d "web/node_modules" ]; then
    echo "📦 安装前端依赖..."
    cd web && npm install && cd ..
fi

# 检查数据库
echo "🗄️  检查数据库..."
if [ ! -f "server/prisma/dev.db" ]; then
    echo "📊 初始化数据库..."
    cd server && npx prisma db push && cd ..
fi

# 启动服务
echo "🚀 启动服务..."
./scripts/dev-start.sh

echo ""
echo "🎉 快速启动完成！"
echo "📊 后端: http://localhost:3001"
echo "🌐 前端: http://localhost:5173 (或 5174/5175)"
echo ""
echo "💡 提示: 使用 ./scripts/dev-status.sh 查看状态"
