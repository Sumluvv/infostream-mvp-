#!/bin/bash

# InfoStream MVP 开发环境状态检查脚本
# 使用方法: ./scripts/dev-status.sh

echo "📊 InfoStream MVP 开发环境状态"
echo "================================"

# 检查后端服务
echo "📦 后端服务状态:"
if [ -f ".server.pid" ]; then
    SERVER_PID=$(cat .server.pid)
    if kill -0 $SERVER_PID 2>/dev/null; then
        echo "   ✅ 运行中 (PID: $SERVER_PID)"
        if curl -s http://localhost:3001/health > /dev/null; then
            echo "   ✅ 健康检查通过"
        else
            echo "   ⚠️  健康检查失败"
        fi
    else
        echo "   ❌ 进程不存在"
        rm .server.pid
    fi
else
    echo "   ❌ 未启动"
fi

# 检查前端服务
echo ""
echo "🌐 前端服务状态:"
if [ -f ".web.pid" ]; then
    WEB_PID=$(cat .web.pid)
    if kill -0 $WEB_PID 2>/dev/null; then
        echo "   ✅ 运行中 (PID: $WEB_PID)"
        # 检查端口
        if lsof -i :5173 > /dev/null 2>&1; then
            echo "   ✅ 端口 5173 可用"
        elif lsof -i :5174 > /dev/null 2>&1; then
            echo "   ✅ 端口 5174 可用"
        elif lsof -i :5175 > /dev/null 2>&1; then
            echo "   ✅ 端口 5175 可用"
        else
            echo "   ⚠️  端口检查失败"
        fi
    else
        echo "   ❌ 进程不存在"
        rm .web.pid
    fi
else
    echo "   ❌ 未启动"
fi

# 检查端口占用
echo ""
echo "🔌 端口占用情况:"
echo "   3001 (后端): $(lsof -i :3001 > /dev/null 2>&1 && echo "✅ 占用" || echo "❌ 空闲")"
echo "   5173 (前端): $(lsof -i :5173 > /dev/null 2>&1 && echo "✅ 占用" || echo "❌ 空闲")"
echo "   5174 (前端): $(lsof -i :5174 > /dev/null 2>&1 && echo "✅ 占用" || echo "❌ 空闲")"
echo "   5175 (前端): $(lsof -i :5175 > /dev/null 2>&1 && echo "✅ 占用" || echo "❌ 空闲")"

# 检查日志文件
echo ""
echo "📝 日志文件:"
if [ -f "logs/server.log" ]; then
    echo "   后端日志: logs/server.log ($(wc -l < logs/server.log) 行)"
else
    echo "   后端日志: ❌ 不存在"
fi

if [ -f "logs/web.log" ]; then
    echo "   前端日志: logs/web.log ($(wc -l < logs/web.log) 行)"
else
    echo "   前端日志: ❌ 不存在"
fi

echo ""
echo "🔗 访问地址:"
echo "   后端API: http://localhost:3001"
echo "   前端界面: http://localhost:5173 (或 5174/5175)"
echo "   健康检查: http://localhost:3001/health"


