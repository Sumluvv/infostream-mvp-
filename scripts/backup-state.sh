#!/bin/bash

# InfoStream MVP 状态备份脚本
# 使用方法: ./scripts/backup-state.sh

echo "💾 备份 InfoStream MVP 开发状态"
echo "================================"

# 检查是否在正确的目录
if [ ! -f "server/package.json" ] || [ ! -f "web/package.json" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    exit 1
fi

# 创建备份目录
BACKUP_DIR="backups/$(date '+%Y%m%d_%H%M%S')"
mkdir -p "$BACKUP_DIR"

echo "📁 创建备份目录: $BACKUP_DIR"

# 备份当前状态
echo "📋 备份Git状态..."
git status > "$BACKUP_DIR/git_status.txt"
git log --oneline -10 > "$BACKUP_DIR/git_log.txt"
git branch -a > "$BACKUP_DIR/git_branches.txt"

# 备份配置文件
echo "⚙️  备份配置文件..."
cp -r server/.env* "$BACKUP_DIR/" 2>/dev/null || true
cp -r web/.env* "$BACKUP_DIR/" 2>/dev/null || true
cp .gitignore "$BACKUP_DIR/" 2>/dev/null || true

# 备份数据库
echo "🗄️  备份数据库..."
if [ -f "server/prisma/dev.db" ]; then
    cp "server/prisma/dev.db" "$BACKUP_DIR/dev.db"
    echo "✅ 数据库已备份"
else
    echo "⚠️  数据库文件不存在"
fi

# 备份日志
echo "📝 备份日志文件..."
mkdir -p "$BACKUP_DIR/logs"
cp -r logs/* "$BACKUP_DIR/logs/" 2>/dev/null || true

# 创建恢复脚本
echo "🔧 创建恢复脚本..."
cat > "$BACKUP_DIR/restore.sh" << 'EOF'
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
EOF

chmod +x "$BACKUP_DIR/restore.sh"

# 提交当前状态
echo "📤 提交当前状态..."
git add .
git commit -m "chore: 自动备份状态 - $(date '+%Y-%m-%d %H:%M:%S')" || true

# 推送到远程
echo "🌐 推送到远程仓库..."
git push origin $(git branch --show-current) || true

# 创建状态摘要
echo "📊 创建状态摘要..."
cat > "$BACKUP_DIR/state_summary.txt" << EOF
InfoStream MVP 状态备份
=======================
备份时间: $(date)
当前分支: $(git branch --show-current)
最新提交: $(git log --oneline -1)
数据库大小: $(du -h server/prisma/dev.db 2>/dev/null || echo "N/A")
日志文件数: $(find logs -name "*.log" 2>/dev/null | wc -l)

恢复方法:
1. 进入备份目录: cd $BACKUP_DIR
2. 运行恢复脚本: ./restore.sh
3. 启动开发环境: ../../scripts/restore-state.sh
EOF

echo ""
echo "🎉 状态备份完成！"
echo "📁 备份位置: $BACKUP_DIR"
echo "📊 状态摘要: $BACKUP_DIR/state_summary.txt"
echo "🔧 恢复脚本: $BACKUP_DIR/restore.sh"
echo ""
echo "💡 下次开机时运行: ./scripts/restore-state.sh"


