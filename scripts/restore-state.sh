#!/bin/bash

# InfoStream MVP 状态恢复脚本
# 使用方法: ./scripts/restore-state.sh

echo "🔄 恢复 InfoStream MVP 开发状态"
echo "================================"

# 检查是否在正确的目录
if [ ! -f "server/package.json" ] || [ ! -f "web/package.json" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    exit 1
fi

# 检查Git状态
echo "📋 检查Git状态..."
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  发现未提交的更改:"
    git status --short
    echo ""
    read -p "是否要提交这些更改? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add .
        git commit -m "chore: 自动保存状态 - $(date '+%Y-%m-%d %H:%M:%S')"
        echo "✅ 更改已提交"
    else
        echo "⚠️  跳过提交，继续恢复状态"
    fi
else
    echo "✅ Git状态干净"
fi

# 检查当前分支
CURRENT_BRANCH=$(git branch --show-current)
echo "🌿 当前分支: $CURRENT_BRANCH"

# 检查是否有未推送的提交
if [ -n "$(git log origin/$CURRENT_BRANCH..HEAD 2>/dev/null)" ]; then
    echo "📤 发现未推送的提交，正在推送..."
    git push origin $CURRENT_BRANCH
    echo "✅ 提交已推送"
else
    echo "✅ 所有提交已同步"
fi

# 检查端口占用
echo ""
echo "🔌 检查端口占用..."
if lsof -i :3001 > /dev/null 2>&1; then
    echo "⚠️  端口 3001 被占用，正在清理..."
    pkill -f "tsx watch src/index.ts" 2>/dev/null || true
    sleep 2
fi

if lsof -i :5173 > /dev/null 2>&1; then
    echo "⚠️  端口 5173 被占用，正在清理..."
    pkill -f "vite" 2>/dev/null || true
    sleep 2
fi

# 启动服务
echo ""
echo "🚀 启动开发环境..."
./scripts/dev-start.sh

echo ""
echo "🎉 状态恢复完成！"
echo "📊 后端: http://localhost:3001"
echo "🌐 前端: http://localhost:5173 (或 5174/5175)"
echo ""
echo "💡 提示: 使用 ./scripts/dev-status.sh 查看状态"
