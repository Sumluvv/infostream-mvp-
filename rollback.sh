#!/bin/bash
# Infostream MVP - 回滚脚本
# 使用方法: chmod +x rollback.sh && ./rollback.sh [version]

set -e

echo "🔄 Infostream MVP - 版本回滚脚本"
echo "=================================="

# 检查参数
VERSION=${1:-"v2.0-frontend-complete"}

echo "📋 可用版本:"
git tag -l | sort -V

echo ""
echo "🎯 目标版本: $VERSION"

# 确认回滚
read -p "⚠️  确认回滚到版本 $VERSION? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 回滚已取消"
    exit 1
fi

echo "🔄 开始回滚到版本 $VERSION..."

# 停止当前服务
echo "1️⃣ 停止当前服务..."
pkill -f "tsx watch src/index.ts" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true

# 回滚代码
echo "2️⃣ 回滚代码到版本 $VERSION..."
git checkout $VERSION

# 检查回滚结果
echo "3️⃣ 验证回滚结果..."
CURRENT_VERSION=$(git describe --tags --exact-match HEAD 2>/dev/null || echo "detached")
echo "✅ 当前版本: $CURRENT_VERSION"

# 恢复数据库（如果需要）
echo "4️⃣ 检查数据库状态..."
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
if psql -h localhost -U infostream -d infostream -c "SELECT 1;" >/dev/null 2>&1; then
    echo "✅ 数据库连接正常"
else
    echo "⚠️ 数据库连接失败，请检查PostgreSQL服务"
fi

# 重新安装依赖（如果需要）
echo "5️⃣ 检查依赖..."
if [ -d "server/node_modules" ]; then
    echo "✅ Node.js依赖已存在"
else
    echo "📦 安装Node.js依赖..."
    cd server && npm install && cd ..
fi

if [ -d "etl/.venv" ]; then
    echo "✅ Python依赖已存在"
else
    echo "📦 安装Python依赖..."
    cd etl && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && cd ..
fi

echo ""
echo "🎉 回滚完成！"
echo "=================================="
echo "📊 当前版本: $CURRENT_VERSION"
echo "📈 健康检查: curl http://127.0.0.1:3002/health"
echo ""
echo "🚀 启动服务:"
echo "   cd server && npm run dev"
echo ""
echo "📖 版本历史: git log --oneline --graph"
