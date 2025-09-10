# Infra

本目录包含数据库与缓存的本地开发编排：PostgreSQL 与 Redis。

## 快速开始
1. 复制环境变量模板：`cp .env.example .env`
2. 启动服务：`docker compose --env-file .env -f docker-compose.yml up -d`
3. 查看状态：`docker ps` 或 `docker compose ps`

## 常见问题
- 端口占用：确认本机 5432/6379 未被占用，或修改映射端口。
- 数据持久化：数据保存在 Docker 卷 `pgdata` 与 `redisdata`。
