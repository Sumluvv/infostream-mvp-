#!/bin/bash
echo "🔄 恢复 InfoStream MVP 状态"
echo "=========================="

# 恢复数据库
if [ -f "dev.db" ]; then
    echo "🗄️  恢复数据库..."
    cp dev.db ../../server/prisma/dev.db
    echo "✅ 数据库已恢复"
fi

# 恢复配置文件
echo "⚙️  恢复配置文件..."
cp .env* ../../server/ 2>/dev/null || true
cp .env* ../../web/ 2>/dev/null || true

echo "🎉 状态恢复完成！"
echo "💡 运行 ../../scripts/restore-state.sh 启动开发环境"
