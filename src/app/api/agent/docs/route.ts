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
      "reminder_at": "2026-06-15T09:00:00+08:00",
      "reminder_notified": false,
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
| reminder_at | string | 否 | 提醒时间，ISO 8601格式，如"2026-06-15T09:00:00+08:00" |

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

**可更新字段**：title, description, date, category, status, priority, duration, task_id, sort_order, reminder_at

**提醒相关字段**：
| 字段 | 类型 | 说明 |
|------|------|------|
| reminder_at | string\|null | 提醒时间，ISO 8601格式。设为null关闭提醒 |
| reminder_notified | boolean | Agent关闭提醒时设为true |

**关闭提醒示例**（用户向Agent确认后调用）：
\`\`\`json
{ "reminder_notified": true }
\`\`\`

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

## 提醒（Reminders）API

### Webhook 推送模式（推荐）

当用户在应用中配置了 Webhook URL 后，系统会在事项到达提醒时间时主动 POST 推送到该 URL，使用 \`deliver-only\` 模式：

- **不走 LLM，不消耗 token**
- 收到 POST → 渲染通知模板 → 直接推送给用户

**推送请求格式**：

请求头：
- \`Content-Type: application/json\`
- \`X-Webhook-Signature: sha256=<HMAC-SHA256签名>\`（仅当配置了 Webhook Secret 时包含）

请求体：
\`\`\`json
{
  "type": "reminder",
  "reminders": [
    {
      "event_id": "uuid",
      "title": "项目评审会议",
      "date": "2026-06-15",
      "category": "work",
      "priority": "important",
      "reminder_at": "2026-06-15T09:00:00+08:00"
    }
  ],
  "count": 1
}
\`\`\`

**签名验证**：如果配置了 Webhook Secret，推送请求会携带 \`X-Webhook-Signature\` 头，值为 \`sha256=\` + HMAC-SHA256(request_body, secret)。验证方法：
\`\`\`
signature = "sha256=" + HMAC-SHA256(request_body, webhook_secret).hex()
compare(signature, X-Webhook-Signature header)
\`\`\`

**收到推送后的操作**：
1. 将 reminders 渲染为通知消息推送给用户（不经过 LLM 处理）
2. 用户回复"知道了"/"确认"/"收到"后，调用关闭提醒接口

### 1. 获取到期提醒（备用，无需轮询）

\`\`\`
GET /api/agent/reminders
\`\`\`

**权限要求**：\`events.read\`

获取当前用户所有已到期但未通知的提醒事项。此接口主要用于备用查询，如已配置 Webhook 推送则无需轮询。

**响应示例**：
\`\`\`json
{
  "data": [
    {
      "id": "uuid",
      "title": "项目评审会议",
      "date": "2026-06-15",
      "category": "work",
      "status": "not_started",
      "priority": "important",
      "reminder_at": "2026-06-15T09:00:00+08:00",
      "reminder_notified": false
    }
  ],
  "total": 1
}
\`\`\`

### 2. 关闭提醒

\`\`\`
POST /api/agent/reminders
\`\`\`

**权限要求**：\`events.update\`

当用户向Agent确认已知悉提醒后，Agent调用此接口关闭提醒。

**请求体**：
\`\`\`json
{
  "event_ids": ["uuid1", "uuid2"]
}
\`\`\`

或单个事项：
\`\`\`json
{
  "event_id": "uuid1"
}
\`\`\`

**响应**：
\`\`\`json
{ "success": true, "dismissed": 2 }
\`\`\`

### 提醒工作流

**Webhook 推送模式（推荐，零 token 消耗）**：
1. 用户在应用中为 Agent 配置 Webhook URL
2. 事项到达提醒时间时，系统主动 POST 到 Webhook URL
3. Agent 收到推送，以 deliver-only 模式直接渲染通知给用户（不走 LLM）
4. 用户回复"知道了"/"确认"/"收到"等明确知悉的答复后
5. Agent 调用 \`POST /api/agent/reminders\` 关闭提醒
6. 用户的网页端也会同步关闭该提醒

**轮询模式（备用，消耗 token）**：
1. Agent 定期调用 \`GET /api/agent/reminders\` 检查到期提醒
2. 发现新提醒时，主动通知用户
3. 用户确认后调用 \`POST /api/agent/reminders\` 关闭提醒

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

## Webhook 配置

用户可在 Schedule 应用中为 Agent 配置 Webhook URL。配置后，系统在事项到达提醒时间时主动 POST 推送。

**配置方式**：在 Schedule 应用的「Agent 推入管理」中设置 Webhook URL

**推送特性**：
- 使用 \`deliver-only\` 模式，Agent 收到后直接渲染推送，不走 LLM，不消耗 token
- 推送超时 5 秒，失败不重试（网页端仍会正常提醒）
- 用户关闭提醒后，网页端和 Agent 端同步关闭

### 如何获取 Webhook URL

#### Codex
1. 打开 Codex 设置 → 通知（Notifications）
2. 选择 Webhook 通知方式
3. 添加端点 URL（即本服务提供的 Webhook 推送目标地址）

#### WorkBuddy
1. 打开 WorkBuddy 客户端，点击左侧 Claw Tab
2. 确认 Claw Service Status 显示 Running（若为 Stopped 则点击 Start Service）
3. 等待约 3 秒，页面下方自动显示全局 Webhook URL（格式 https://claw.codebuddy.cn/wb/xxx-uuid）
4. 点击 Copy URL 复制

#### Hermes
1. 进入 Settings → Integrations
2. 点击 Webhook → Create Webhook
3. 复制 Endpoint URL

#### OpenClaw
1. 进入项目设置 → 通知
2. 点击 Webhook → 添加端点
3. 复制 URL

#### 其他平台
- **Coze（扣子）**：Bot 编辑页 → 触发器 → 添加 Webhook → 复制 URL
- **Dify**：应用 → 编排 → API 扩展 → 添加 Webhook → 复制回调地址
- **FastGPT**：应用 → API 扩展 → Webhook 触发 → 复制接口地址

#### 自建服务
部署一个 HTTP 接口，接收 POST 请求即可。示例（Node.js）：

\`\`\`javascript
const express = require('express');
const app = express();
app.use(express.json());

app.post('/webhook/schedule-reminder', (req, res) => {
  const { type, reminders, count } = req.body;
  // type = "reminder"，reminders 为到期事项数组
  // 在此渲染通知给用户，无需调用 LLM
  console.log(\`收到 \${count} 条提醒\`);
  res.sendStatus(200);
});

app.listen(3000);
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
