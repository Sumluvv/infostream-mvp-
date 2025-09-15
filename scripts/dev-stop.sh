#!/bin/bash

# InfoStream MVP 开发环境停止脚本
# 使用方法: ./scripts/dev-stop.sh

echo "🛑 停止 InfoStream MVP 开发环境..."

# 停止后端服务
if [ -f ".server.pid" ]; then
    SERVER_PID=$(cat .server.pid)
    if kill -0 $SERVER_PID 2>/dev/null; then
        echo "📦 停止后端服务 (PID: $SERVER_PID)..."
        kill $SERVER_PID
        rm .server.pid
        echo "✅ 后端服务已停止"
    else
        echo "⚠️  后端服务进程不存在"
        rm .server.pid
    fi
else
    echo "⚠️  未找到后端服务PID文件"
fi

# 停止前端服务
if [ -f ".web.pid" ]; then
    WEB_PID=$(cat .web.pid)
    if kill -0 $WEB_PID 2>/dev/null; then
        echo "🌐 停止前端服务 (PID: $WEB_PID)..."
        kill $WEB_PID
        rm .web.pid
        echo "✅ 前端服务已停止"
    else
        echo "⚠️  前端服务进程不存在"
        rm .web.pid
    fi
else
    echo "⚠️  未找到前端服务PID文件"
fi

# 清理可能残留的进程
echo "🧹 清理残留进程..."
pkill -f "tsx watch src/index.ts" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

echo "🎉 开发环境已完全停止"
