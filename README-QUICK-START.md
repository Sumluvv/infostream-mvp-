# InfoStream MVP 快速启动指南

## 🚀 开机后快速恢复

### 方法一：一键恢复（推荐）
```bash
cd /Users/liao/infostream-mvp
./scripts/restore-state.sh
```

### 方法二：分步启动
```bash
cd /Users/liao/infostream-mvp
./scripts/quick-start.sh
```

## 📋 可用脚本

| 脚本 | 功能 | 说明 |
|------|------|------|
| `./scripts/restore-state.sh` | 状态恢复 | 恢复Git状态并启动服务 |
| `./scripts/quick-start.sh` | 快速启动 | 检查依赖并启动服务 |
| `./scripts/dev-start.sh` | 启动服务 | 仅启动前后端服务 |
| `./scripts/dev-stop.sh` | 停止服务 | 停止所有服务 |
| `./scripts/dev-status.sh` | 查看状态 | 检查服务运行状态 |
| `./scripts/backup-state.sh` | 备份状态 | 备份当前开发状态 |

## 🔧 服务地址

- **后端API**: http://localhost:3001
- **前端界面**: http://localhost:5173 (或 5174/5175)
- **健康检查**: http://localhost:3001/health

## 📝 日志文件

- **后端日志**: `logs/server.log`
- **前端日志**: `logs/web.log`

## 🛠️ 故障排除

### 端口被占用
```bash
# 查看端口占用
lsof -i :3001
lsof -i :5173

# 清理端口
./scripts/dev-stop.sh
```

### 依赖问题
```bash
# 重新安装依赖
cd server && npm install && cd ..
cd web && npm install && cd ..
```

### 数据库问题
```bash
# 重置数据库
cd server && npx prisma db push && cd ..
```

## 💡 开发提示

1. **保存状态**: 关机前运行 `./scripts/backup-state.sh`
2. **查看状态**: 使用 `./scripts/dev-status.sh` 检查服务
3. **停止服务**: 使用 `./scripts/dev-stop.sh` 清理环境
4. **Git同步**: 脚本会自动处理Git状态和推送

## 🎯 项目特色

- **网页转RSS**: 拖拽式构建RSS订阅源
- **智能分段**: 自动识别网页内容结构
- **实时更新**: RSS每30秒，网页RSS每30分钟
- **Apple风格UI**: 现代化响应式设计
- **性能优化**: 连接池、缓存、智能重试

---

**GitHub**: https://github.com/Sumluvv/infostream-mvp-


