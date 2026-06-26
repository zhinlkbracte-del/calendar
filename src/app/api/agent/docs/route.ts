import { NextResponse } from 'next/server';

const DOCS = `# Schedule Agent API 接入文档

## 概述

Schedule 是一个月历日程管理应用，支持事项（Events）和任务（Tasks）的增删改查。通过 Agent API，外部应用可以对用户的日程数据进行操作。

## 认证方式

所有 Agent API 请求需在 HTTP Header 中携带 API Key：

\`\`\`
X-API-Key: sk-xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx
\`\`\`

或使用 Authorization Header：

\`\`\`
Authorization: Bearer sk-xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx
\`\`\`

API Key 由用户在 Schedule 应用中创建 Agent 时生成。每个 Key 绑定一个用户，且具有独立的权限配置。

## 基础信息

- 基础 URL：\`{应用域名}/api/agent\`
- 响应格式：JSON
- 字符编码：UTF-8

### 响应格式

成功：
\`\`\`json
{ "data": ..., "total": 10 }
\`\`\`

失败：
\`\`\`json
{ "error": "错误描述" }
\`\`\`

### HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未授权（API Key 无效或缺失） |
| 403 | 权限不足（当前 Agent 无此操作权限） |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 事项（Events）API

### 1. 查询事项列表

\`\`\`
GET /api/agent/events?month=YYYY-MM
\`\`\`

**权限要求**：\`events.read\`

**参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| month | string | 是 | 月份，格式 YYYY-MM（如 2026-06）；传 \`all\` 获取所有事项 |

**响应示例**：
\`\`\`json
{
  "data": [
    {
      "id": "uuid",
      "title": "项目评审会议",
      "description": "与团队进行项目进度评审",
      "date": "2026-06-15",
      "category": "work",
      "status": "not_started",
      "priority": "important",
      "sort_order": "0",
      "duration": "2.5",
      "task_id": null,
      "created_at": "2026-06-01T10:00:00+08:00",
      "updated_at": "2026-06-01T10:00:00+08:00"
    }
  ],
  "total": 1
}
\`\`\`

### 2. 创建事项

\`\`\`
POST /api/agent/events
\`\`\`

**权限要求**：\`events.create\`

**请求体**：
\`\`\`json
{
  "title": "项目评审会议",
  "date": "2026-06-15",
  "category": "work",
  "status": "not_started",
  "priority": "important",
  "description": "与团队进行项目进度评审",
  "duration": "2.5"
}
\`\`\`

**字段说明**：
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 是 | 事项标题，最长255字 |
| date | string | 是 | 日期，格式 YYYY-MM-DD |
| category | string | 否 | 类别：work（工作，默认）/ life（生活） |
| status | string | 否 | 状态：not_started（未开始，默认）/ in_progress（进行中）/ completed（已完成） |
| priority | string | 否 | 优先级：normal（普通，默认）/ important（重要）/ urgent（紧急） |
| description | string | 否 | 事项描述 |
| duration | string | 否 | 消耗时长（小时），如"2.5" |

**响应**：返回创建的事项对象，HTTP 201

### 3. 更新事项

\`\`\`
PUT /api/agent/events/{id}
\`\`\`

**权限要求**：\`events.update\`

**请求体**：只需传需要更新的字段：
\`\`\`json
{
  "status": "completed",
  "priority": "urgent"
}
\`\`\`

**可更新字段**：title, description, date, category, status, priority, duration, task_id, sort_order

**响应**：返回更新后的事项对象

### 4. 删除事项

\`\`\`
DELETE /api/agent/events/{id}
\`\`\`

**权限要求**：\`events.delete\`

**响应**：
\`\`\`json
{ "success": true }
\`\`\`

---

## 任务（Tasks）API

### 1. 查询任务列表

\`\`\`
GET /api/agent/tasks
\`\`\`

**权限要求**：\`tasks.read\`

**响应示例**：
\`\`\`json
{
  "data": [
    {
      "id": "uuid",
      "title": "Q1项目交付",
      "start_date": "2026-01-01",
      "planned_end_date": "2026-03-31",
      "actual_end_date": null,
      "delay_status": "normal",
      "latest_progress": "需求评审完成",
      "urgency_type": "important_and_urgent",
      "status": "in_progress",
      "created_at": "2026-01-01T10:00:00+08:00",
      "updated_at": "2026-06-01T10:00:00+08:00"
    }
  ],
  "total": 1
}
\`\`\`

### 2. 创建任务

\`\`\`
POST /api/agent/tasks
\`\`\`

**权限要求**：\`tasks.create\`

**请求体**：
\`\`\`json
{
  "title": "Q1项目交付",
  "start_date": "2026-01-01",
  "planned_end_date": "2026-03-31",
  "urgency_type": "important_and_urgent",
  "status": "not_started",
  "latest_progress": ""
}
\`\`\`

**字段说明**：
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 是 | 任务标题 |
| start_date | string | 否 | 计划开始日期，YYYY-MM-DD |
| planned_end_date | string | 否 | 计划结束日期，YYYY-MM-DD |
| urgency_type | string | 否 | 紧急度：not_important_not_urgent（默认）/ important_not_urgent / urgent_not_important / important_and_urgent |
| status | string | 否 | 状态：not_started（默认）/ in_progress / completed |
| latest_progress | string | 否 | 最新进展 |

**响应**：返回创建的任务对象，HTTP 201

### 3. 更新任务

\`\`\`
PUT /api/agent/tasks/{id}
\`\`\`

**权限要求**：\`tasks.update\`

**请求体**：只需传需要更新的字段：
\`\`\`json
{
  "status": "completed",
  "actual_end_date": "2026-06-20",
  "latest_progress": "已交付上线"
}
\`\`\`

**可更新字段**：title, start_date, planned_end_date, actual_end_date, delay_status, latest_progress, urgency_type, status

**响应**：返回更新后的任务对象

### 4. 删除任务

\`\`\`
DELETE /api/agent/tasks/{id}
\`\`\`

**权限要求**：\`tasks.delete\`

**响应**：
\`\`\`json
{ "success": true }
\`\`\`

---

## 权限体系

每个 Agent 的权限独立配置，分为两组共8项：

### 事项权限
| 权限标识 | 说明 | 对应操作 |
|----------|------|----------|
| events.read | 查看事项 | GET /api/agent/events |
| events.create | 创建事项 | POST /api/agent/events |
| events.update | 编辑事项 | PUT /api/agent/events/{id} |
| events.delete | 删除事项 | DELETE /api/agent/events/{id} |

### 任务权限
| 权限标识 | 说明 | 对应操作 |
|----------|------|----------|
| tasks.read | 查看任务 | GET /api/agent/tasks |
| tasks.create | 创建任务 | POST /api/agent/tasks |
| tasks.update | 编辑任务 | PUT /api/agent/tasks/{id} |
| tasks.delete | 删除任务 | DELETE /api/agent/tasks/{id} |

---

## 常见操作示例

### 查看本月事项

\`\`\`bash
curl -H "X-API-Key: sk-your-api-key" \\
  "https://your-domain/api/agent/events?month=2026-06"
\`\`\`

### 创建一条工作事项

\`\`\`bash
curl -X POST \\
  -H "X-API-Key: sk-your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"周会","date":"2026-06-16","category":"work","priority":"important"}' \\
  "https://your-domain/api/agent/events"
\`\`\`

### 标记事项为已完成

\`\`\`bash
curl -X PUT \\
  -H "X-API-Key: sk-your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{"status":"completed"}' \\
  "https://your-domain/api/agent/events/{event-id}"
\`\`\`

### 查看所有任务

\`\`\`bash
curl -H "X-API-Key: sk-your-api-key" \\
  "https://your-domain/api/agent/tasks"
\`\`\`

### 更新任务进展

\`\`\`bash
curl -X PUT \\
  -H "X-API-Key: sk-your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{"latest_progress":"前端开发完成80%","status":"in_progress"}' \\
  "https://your-domain/api/agent/tasks/{task-id}"
\`\`\`

---

## 注意事项

1. **数据隔离**：每个 API Key 只能操作其绑定用户的数据，无法访问其他用户的数据
2. **权限校验**：每次请求都会校验 Agent 是否具有对应权限，无权限返回 403
3. **Agent 状态**：用户可以禁用 Agent，禁用后所有请求返回 401
4. **频率限制**：建议请求间隔不低于 100ms，避免高频请求
5. **日期格式**：所有日期统一使用 YYYY-MM-DD 格式
6. **时区**：服务器时间为东八区（UTC+8）
`;

export async function GET() {
  return new NextResponse(DOCS, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
