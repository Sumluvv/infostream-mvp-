#!/bin/bash

# InfoStream MVP 开发环境启动脚本
# 使用方法: ./scripts/dev-start.sh

echo "🚀 启动 InfoStream MVP 开发环境..."

# 检查是否在正确的目录
if [ ! -f "server/package.json" ] || [ ! -f "web/package.json" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    exit 1
fi

# 创建日志目录
mkdir -p logs

# 启动后端服务
echo "📦 启动后端服务..."
cd server
npm run dev > ../logs/server.log 2>&1 &
SERVER_PID=$!
echo "后端服务已启动 (PID: $SERVER_PID)"
cd ..

# 等待后端启动
echo "⏳ 等待后端服务启动..."
sleep 3

# 检查后端是否启动成功
if ! curl -s http://localhost:3001/health > /dev/null; then
    echo "❌ 后端服务启动失败，请检查 logs/server.log"
    exit 1
fi

echo "✅ 后端服务启动成功"

# 启动前端服务
echo "🌐 启动前端服务..."
cd web
npm run dev > ../logs/web.log 2>&1 &
WEB_PID=$!
echo "前端服务已启动 (PID: $WEB_PID)"
cd ..

# 保存进程ID到文件
echo $SERVER_PID > .server.pid
echo $WEB_PID > .web.pid

echo ""
echo "🎉 开发环境启动完成！"
echo "📊 后端服务: http://localhost:3001"
echo "🌐 前端服务: http://localhost:5173 (或 5174/5175)"
echo ""
echo "📝 日志文件:"
echo "   - 后端: logs/server.log"
echo "   - 前端: logs/web.log"
echo ""
echo "🛑 停止服务: ./scripts/dev-stop.sh"
echo "📊 查看状态: ./scripts/dev-status.sh"
