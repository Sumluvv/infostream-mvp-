## 简介

InfoStream 新版“网页转 RSS 模块”已上线：支持快速网页快照预览、智能分段（标题词条/文章内容词条），以及基于用户拖拽选择的一键生成 RSS 订阅源。后端基于 Node/Fastify + Prisma，默认监听 `http://localhost:3001`。

## 功能清单

- 智能分段：按 H1/H2/H3 将页面分为“标题词条”及其后邻近的“文章内容词条”组，并做同域名过滤。
- 拖拽式构建 RSS：前端将标题词条、内容词条拖入后端，生成订阅源，命名为【网站/标题】。
- 定时刷新：已生成的“网站转化 RSS”每 20 分钟按照所选标题分组刷新新文章；若页面结构变化导致匹配不到该分组，刷新返回空集合（前端可提示用户重新选择）。

## 环境与启动

开发环境：macOS，本地 Node 18+。在 `infostream-mvp/server` 运行：

```bash
npm run dev
```

健康检查：

```bash
curl -s http://localhost:3001/health
```

## 接口说明（后端）

所有接口都在 `Authorization: Bearer <token>` 下使用。登录获取 token：

```bash
curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"snap@test.com","password":"123456"}'
```

### 1) 智能分段（供“大框1/2 拖拽”使用）

POST `/api/feeds/webpage-segmentation`

请求体：

```json
{ "url": "https://example.com" }
```

返回体（简化）：

```json
{
  "groups": [
    {
      "titleToken": "要闻动态",
      "contentTokensPreview": "文章标题示例",
      "articles": [ { "title": "...", "link": "https://...", "pubDate": "ISO" } ]
    }
  ]
}
```

说明：
- groups 基于 H1/H2/H3 标题分组；`articles` 仅保留同域链接，去重并限量。
- 前端展示：
  - 大框1（右）：按组显示，标题组淡红背景、内容组淡黄背景；支持展开与拖拽。
  - 大框2（左）：上下两个输入框，分别接收“标题词条”和“文章内容词条”的拖入。

### 2) 构建 RSS（根据用户选择）

POST `/api/feeds/webpage-build-rss`

请求体：

```json
{
  "url": "https://example.com",
  "titleToken": "要闻动态",
  "articles": [
    { "title": "标题1", "link": "https://example.com/a1", "pubDate": "2025-01-01T00:00:00.000Z" },
    { "title": "标题2", "link": "https://example.com/a2" }
  ]
}
```

返回体（简化）：

```json
{ "id": "...", "title": "example.com/要闻动态", "articlesCount": 2 }
``;

说明：
- 订阅源命名为【网站/标题】。
- 刷新任务每 20 分钟运行一次，按标题分组重新抓取新文章；失配时返回空集合（前端负责提示用户“请重新选择标题词条”）。

## 最小验证步骤

1) 获取 token 并调用分段接口：

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login -H 'Content-Type: application/json' -d '{"email":"snap@test.com","password":"123456"}' | jq -r .token)
curl -s -X POST http://localhost:3001/api/feeds/webpage-segmentation \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" \
  -d '{"url":"https://example.com"}' | jq '.groups[0]'
```

2) 构建 RSS：

```bash
curl -s -X POST http://localhost:3001/api/feeds/webpage-build-rss \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" \
  -d '{"url":"https://example.com","titleToken":"示例标题","articles":[{"title":"A1","link":"https://example.com/a1"}]}' | jq .
```

3) 查看文章：

```bash
curl -s http://localhost:3001/api/feeds/<feedId>/items -H "Authorization: Bearer $TOKEN" | jq '.items[0]'
```

## 已知风险与待改进

- 某些页面依赖前端渲染，静态分段可能获取不到目标分组；需要前端选择“使用快照（Puppeteer）模式”再分段。
- 目前“分组匹配失败”仅返回空集合；前端需明显提醒并提供“一键重新选择”入口。
- 链接去重与同域过滤策略可继续收紧（可选路径白名单）。

## 手动验收清单

- 打开前端 → 输入 URL → 点击“智能分类”，应显示可缩放/拖动的快照；大框1/2 可拖拽；
- 从大框1拖入一个标题组与若干文章，再“生成 RSS”，订阅源出现且文章可点“阅读原文”；
- 等待 20 分钟或手动触发刷新，新增文章会进入该订阅源；
- 若站点改版导致分组失配，前端提示“请重新选择标题词条”。

# 个人信息流聚合与展示工具（Web 版 MVP）

本项目是一个个人向信息流聚合网站的 MVP，实现基础的用户与 RSS 管理。

## 目录结构
- server：后端服务（Fastify + TypeScript）
- web：前端网站（React + Vite + TailwindCSS）
- infra：基础设施（PostgreSQL、Redis、调度）

## 快速开始
详见 infra/docker-compose 与各子目录 README。
