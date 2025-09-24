# Infostream MVP - 快速启动指南

## 🚀 一键恢复 (推荐)

```bash
cd /Users/liao/infostream-mvp
./restore.sh
```

## 📋 手动启动步骤

### 1. 启动数据库服务
```bash
brew services start postgresql@16
brew services start redis
```

### 2. 启动API服务器
```bash
cd /Users/liao/infostream-mvp/server
npm install pg  # 如果缺失
npm run dev
```

### 3. 验证服务
```bash
# 健康检查
curl http://127.0.0.1:3002/health

# 测试股票概览 (需要先注册用户)
curl -X POST http://127.0.0.1:3002/api/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"a@a.com","password":"secret123"}'

curl -X POST http://127.0.0.1:3002/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"a@a.com","password":"secret123"}'
```

## 🔧 环境配置

### 数据库连接
- **主机**: localhost
- **端口**: 5432
- **数据库**: infostream
- **用户**: infostream
- **密码**: infostream

### API服务
- **端口**: 3002
- **健康检查**: http://127.0.0.1:3002/health

## 📊 当前数据状态

### 已导入数据
- ✅ 股票列表: 5000+只A股
- ✅ 价格数据: 600519.SH (贵州茅台)
- ✅ 技术指标: MA, MACD, RSI, BOLL

### 测试用例
- **主要测试股票**: 600519.SH (贵州茅台)
- **测试用户**: a@a.com / secret123

## 🚧 待完成功能

### 阻塞问题
- **Tushare权限**: 需要开通 `fina_indicator`, `income` 接口
- **当前状态**: 返回 code 2002 (权限不足)

### 下一步开发
1. 财务数据ETL (Tushare权限开通后)
2. 估值API (PE/PB计算)
3. 前端界面 (K线图表)

## 📁 项目结构

```
infostream-mvp/
├── restore.sh          # 一键恢复脚本
├── PROGRESS.md         # 详细进度记录
├── QUICK_START.md      # 快速启动指南
├── db/
│   └── schema.sql      # 数据库结构
├── etl/                # 数据ETL脚本
├── server/             # Fastify API服务器
└── infra/              # Docker配置
```

## 🆘 常见问题

### API服务器启动失败
```bash
# 检查端口占用
lsof -iTCP:3002 -sTCP:LISTEN

# 停止旧进程
pkill -f "tsx watch src/index.ts"
```

### 数据库连接失败
```bash
# 检查PostgreSQL状态
brew services list | grep postgresql

# 重启服务
brew services restart postgresql@16
```

### 依赖缺失
```bash
# 安装Node.js依赖
cd server && npm install

# 安装Python依赖
cd etl && source .venv/bin/activate && pip install -r requirements.txt
```

## 📞 技术支持

- **项目状态**: 开发中 (60% 完成)
- **最后更新**: 2025-01-15
- **当前阶段**: 财务数据ETL + 估值API开发

