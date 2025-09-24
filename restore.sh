#!/bin/bash
# Infostream MVP - 快速恢复脚本
# 使用方法: chmod +x restore.sh && ./restore.sh

set -e

echo "🚀 Infostream MVP - 快速恢复脚本"
echo "=================================="

# 检查是否在正确目录
if [ ! -f "PROGRESS.md" ]; then
    echo "❌ 请在项目根目录运行此脚本"
    exit 1
fi

echo "📋 当前进度状态:"
echo "✅ 基础设施: PostgreSQL + Redis"
echo "✅ 数据库Schema: 已创建"
echo "✅ ETL脚本: 股票列表 + OHLCV + 技术指标"
echo "✅ API服务器: Fastify + JWT认证"
echo "🚧 财务数据ETL: 等待Tushare权限开通"
echo "📋 待开发: 估值API + 前端界面"

echo ""
echo "🔧 启动服务..."

# 1. 启动数据库服务
echo "1️⃣ 启动PostgreSQL和Redis..."
brew services start postgresql@16 2>/dev/null || echo "PostgreSQL已运行"
brew services start redis 2>/dev/null || echo "Redis已运行"

# 等待服务启动
sleep 2

# 2. 检查数据库连接
echo "2️⃣ 检查数据库连接..."
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
if psql -h localhost -U infostream -d infostream -c "SELECT 1;" >/dev/null 2>&1; then
    echo "✅ 数据库连接正常"
else
    echo "❌ 数据库连接失败，请检查PostgreSQL服务"
    exit 1
fi

# 3. 启动API服务器
echo "3️⃣ 启动API服务器..."
cd server

# 检查并安装缺失的依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装Node.js依赖..."
    npm install
fi

# 检查pg包
if ! npm list pg >/dev/null 2>&1; then
    echo "📦 安装pg包..."
    npm install pg
fi

# 设置环境变量
if [ ! -f ".env" ]; then
    echo "⚙️ 创建环境配置文件..."
    cat > .env << EOF
PORT=3002
JWT_SECRET=devsecret
PGHOST=localhost
PGPORT=5432
PGDATABASE=infostream
PGUSER=infostream
PGPASSWORD=infostream
DATABASE_URL=file:./prisma/dev.db
FEEDS_DISABLE_TASKS=true
EOF
fi

# 停止可能运行的旧进程
echo "🛑 停止旧进程..."
pkill -f "tsx watch src/index.ts" 2>/dev/null || true
lsof -iTCP:3002 -sTCP:LISTEN -n | awk 'NR>1{print $2}' | xargs -r kill -9 2>/dev/null || true

# 启动服务器
echo "🚀 启动API服务器 (端口3002)..."
nohup npm run dev </dev/null >dev.log 2>&1 &
sleep 3

# 4. 验证服务状态
echo "4️⃣ 验证服务状态..."

# 检查健康状态
if curl -sS http://127.0.0.1:3002/health >/dev/null 2>&1; then
    echo "✅ API服务器运行正常"
else
    echo "❌ API服务器启动失败，查看日志:"
    tail -n 10 dev.log
    exit 1
fi

# 检查数据库数据
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
STOCK_COUNT=$(psql -h localhost -U infostream -d infostream -t -c "SELECT COUNT(*) FROM dim_stock;" 2>/dev/null | tr -d ' ')
if [ "$STOCK_COUNT" -gt 0 ]; then
    echo "✅ 数据库包含 $STOCK_COUNT 只股票数据"
else
    echo "⚠️ 数据库为空，需要运行ETL脚本"
fi

echo ""
echo "🎉 恢复完成！"
echo "=================================="
echo "📊 API服务器: http://127.0.0.1:3002"
echo "📈 健康检查: curl http://127.0.0.1:3002/health"
echo "📋 股票概览: curl http://127.0.0.1:3002/api/feeds/overview/600519.SH"
echo ""
echo "🔑 测试用户:"
echo "   邮箱: a@a.com"
echo "   密码: secret123"
echo ""
echo "📝 下一步:"
echo "   1. 开通Tushare Pro权限"
echo "   2. 运行财务数据ETL: cd etl && python ingest_financials.py 600519.SH"
echo "   3. 开发估值API和前端界面"
echo ""
echo "📖 详细进度: cat PROGRESS.md"

