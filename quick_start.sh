#!/bin/bash
# Infostream MVP - 快速启动脚本
# 使用方法: chmod +x quick_start.sh && ./quick_start.sh

set -e

echo "🚀 Infostream MVP - 快速启动脚本"
echo "=================================="

# 检查当前版本
CURRENT_VERSION=$(git describe --tags --exact-match HEAD 2>/dev/null || echo "detached")
echo "📊 当前版本: $CURRENT_VERSION"

# 检查数据库
echo "1️⃣ 检查数据库状态..."
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
if psql -h localhost -U infostream -d infostream -c "SELECT 1;" >/dev/null 2>&1; then
    echo "✅ 数据库连接正常"
else
    echo "⚠️ 数据库连接失败，请检查PostgreSQL服务"
    echo "启动数据库: brew services start postgresql@16"
    exit 1
fi

# 检查后端服务
echo "2️⃣ 检查后端服务..."
if curl -s "http://127.0.0.1:3002/health" >/dev/null 2>&1; then
    echo "✅ 后端服务运行正常"
else
    echo "🔄 启动后端服务..."
    cd server
    pkill -f "tsx watch src/index.ts" 2>/dev/null || true
    npm run dev > dev.log 2>&1 &
    cd ..
    sleep 3
    
    if curl -s "http://127.0.0.1:3002/health" >/dev/null 2>&1; then
        echo "✅ 后端服务启动成功"
    else
        echo "❌ 后端服务启动失败"
        exit 1
    fi
fi

# 检查前端服务
echo "3️⃣ 检查前端服务..."
if curl -s "http://localhost:3000" >/dev/null 2>&1; then
    echo "✅ 前端服务运行正常"
else
    echo "🔄 启动前端服务..."
    cd frontend
    pkill -f "vite" 2>/dev/null || true
    npm run dev > dev.log 2>&1 &
    cd ..
    sleep 3
    
    if curl -s "http://localhost:3000" >/dev/null 2>&1; then
        echo "✅ 前端服务启动成功"
    else
        echo "❌ 前端服务启动失败"
        exit 1
    fi
fi

echo ""
echo "🎉 所有服务启动成功！"
echo "=================================="
echo "🌐 访问地址:"
echo "   前端: http://localhost:3000"
echo "   后端API: http://127.0.0.1:3002"
echo "   健康检查: http://127.0.0.1:3002/health"
echo ""
echo "📊 测试API:"
echo "   K线数据: curl http://127.0.0.1:3002/api/feeds/kline/600519.SH"
echo "   估值数据: curl http://127.0.0.1:3002/api/valuation/600519.SH"
echo "   DCF估值: curl http://127.0.0.1:3002/api/valuation/dcf/600519.SH"
echo "   AI评分: curl http://127.0.0.1:3002/api/valuation/ai-score/600519.SH"
echo ""
echo "📋 版本说明:"
case $CURRENT_VERSION in
    "v3.1-final")
        echo "🎉 最终版本 - 项目100%完成"
        echo "✅ 包含所有功能: 基础设施 + 数据ETL + 后端API + 前端界面 + AI评分系统"
        ;;
    "v3.0-ai-complete")
        echo "🤖 AI评分系统完成版本"
        echo "✅ 包含功能: 基础设施 + 数据ETL + 后端API + 前端界面 + AI评分系统"
        ;;
    "v2.1-dcf-complete")
        echo "💰 DCF估值模型完成版本"
        echo "✅ 包含功能: 基础设施 + 数据ETL + 后端API + 前端界面 + DCF估值"
        ;;
    "v2.0-frontend-complete")
        echo "🎨 前端界面完成版本"
        echo "✅ 包含功能: 基础设施 + 数据ETL + 后端API + 前端界面"
        ;;
    "v1.0-valuation-complete")
        echo "📊 估值系统完成版本"
        echo "✅ 包含功能: 基础设施 + 数据ETL + 后端API"
        ;;
    *)
        echo "📝 其他版本"
        ;;
esac
echo ""
echo "🔄 回滚到其他版本: ./rollback.sh <version>"
echo "📖 查看版本历史: git tag -l"
