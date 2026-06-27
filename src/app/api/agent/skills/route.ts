import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getServiceRoleClient } from '../_lib';

export async function GET(request: NextRequest) {
  // Skills now require login - API key is fetched from user's agent config
  const token = request.cookies.get('token')?.value || request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: '未登录' }, { status: 401 });
  
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: '登录已过期' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const platform = searchParams.get('platform') || 'hermes';
  const agentId = searchParams.get('agent_id');
  
  if (!agentId) {
    return NextResponse.json({ error: '缺少 agent_id 参数' }, { status: 400 });
  }

  const host = request.headers.get('host') || 'localhost:5000';
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const baseUrl = `${protocol}://${host}`;

  // Fetch agent config to get API key (verify ownership)
  const supabase = getServiceRoleClient();
  const { data: agent, error } = await supabase
    .from('agent_configs')
    .select('id, api_key, webhook_url, user_id')
    .eq('id', agentId)
    .eq('user_id', payload.userId)
    .single();

  if (error || !agent) {
    return NextResponse.json({ error: 'Agent 不存在或无权操作' }, { status: 403 });
  }

  const apiKey = agent.api_key;
  const webhookUrl = agent.webhook_url;

  if (platform === 'hermes') {
    return NextResponse.json(generateHermesSkill(baseUrl, apiKey, webhookUrl), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  if (platform === 'openclaw') {
    const md = generateOpenClawSkill(baseUrl, apiKey, webhookUrl);
    return new NextResponse(md, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': 'attachment; filename="SKILL.md"',
      },
    });
  }

  return NextResponse.json({ error: 'Unsupported platform. Use hermes or openclaw.' }, { status: 400 });
}

function generateHermesSkill(baseUrl: string, apiKey: string, webhookUrl: string | null) {
  return {
    name: 'schedule-manager',
    version: 2,
    description: '日程管理助手：通过API操作用户的月历事项和工作任务，支持增删改查。提醒通知通过Webhook推送，无需轮询。',
    trigger: ['日程', '事项', '月历', '任务', '安排', '计划', '日历', 'schedule', 'event', 'task', 'calendar'],
    tools_required: ['http_request'],
    skills: [
      {
        name: 'query-events',
        description: '查询指定月份的事项列表',
        steps: [
          `调用 GET ${baseUrl}/api/agent/events?month=YYYY-MM`,
          'Header: X-API-Key: YOUR_API_KEY',
          '返回该月所有事项（含标题、日期、类别、状态、优先级、消耗时长、提醒时间等）',
        ],
      },
      {
        name: 'create-event',
        description: '创建新事项',
        steps: [
          `调用 POST ${baseUrl}/api/agent/events`,
          'Header: X-API-Key: YOUR_API_KEY',
          'Body: {"title":"事项标题","date":"YYYY-MM-DD","category":"work|life","status":"not_started|in_progress|completed","priority":"normal|important|urgent","description":"可选描述","duration":"可选时长(小时)","reminder_at":"可选提醒时间ISO8601"}',
        ],
      },
      {
        name: 'update-event',
        description: '更新事项',
        steps: [
          `调用 PUT ${baseUrl}/api/agent/events/{id}`,
          'Header: X-API-Key: YOUR_API_KEY',
          'Body: 需要更新的字段即可，如 {"status":"completed"}',
        ],
      },
      {
        name: 'delete-event',
        description: '删除事项',
        steps: [
          `调用 DELETE ${baseUrl}/api/agent/events/{id}`,
          'Header: X-API-Key: YOUR_API_KEY',
        ],
      },
      {
        name: 'query-tasks',
        description: '查询任务列表',
        steps: [
          `调用 GET ${baseUrl}/api/agent/tasks`,
          'Header: X-API-Key: YOUR_API_KEY',
          '返回所有任务（含标题、状态、日期、关联事项等）',
        ],
      },
      {
        name: 'create-task',
        description: '创建新任务',
        steps: [
          `调用 POST ${baseUrl}/api/agent/tasks`,
          'Header: X-API-Key: YOUR_API_KEY',
          'Body: {"title":"任务标题","status":"not_started|in_progress|completed","planned_start_date":"可选YYYY-MM-DD","planned_end_date":"可选YYYY-MM-DD","actual_end_date":"可选YYYY-MM-DD"}',
        ],
      },
      {
        name: 'update-task',
        description: '更新任务',
        steps: [
          `调用 PUT ${baseUrl}/api/agent/tasks/{id}`,
          'Header: X-API-Key: YOUR_API_KEY',
          'Body: 需要更新的字段即可',
        ],
      },
      {
        name: 'delete-task',
        description: '删除任务',
        steps: [
          `调用 DELETE ${baseUrl}/api/agent/tasks/{id}`,
          'Header: X-API-Key: YOUR_API_KEY',
        ],
      },
      {
        name: 'dismiss-reminder',
        description: '关闭提醒（当用户对提醒确认知悉后调用）',
        steps: [
          `调用 POST ${baseUrl}/api/agent/reminders`,
          'Header: X-API-Key: YOUR_API_KEY',
          'Body: {"event_ids":["id1","id2"]} 或 {"event_id":"id1"}',
          '当用户回复"知道了"/"确认"/"收到"等知悉答复后调用此接口关闭提醒',
        ],
      },
    ],
    config: {
      env: {
        SCHEDULE_API_KEY: apiKey,
        SCHEDULE_BASE_URL: baseUrl,
      },
      headers: {
        'X-API-Key': apiKey,
      },
      ...(webhookUrl ? { webhook: { url: webhookUrl, mode: 'deliver-only', signature: 'HMAC-SHA256 via X-Hub-Signature-256 header (if webhook_secret configured)' } } : {}),
    },
    webhook: webhookUrl ? {
      description: '提醒通知推送（Webhook deliver-only 模式，不走 LLM，不消耗 token）',
      url: webhookUrl,
      mode: 'deliver-only',
      signature: 'HMAC-SHA256（X-Hub-Signature-256: sha256=<hex>），仅当配置了 Webhook Secret 时包含',
      note: '当用户的事项到达提醒时间时，系统会主动 POST 到此 webhook URL，收到后直接渲染推送给用户即可，无需 LLM 处理。用户确认后调用 dismiss-reminder 关闭提醒。',
      how_to_get_url: {
        codex: '设置 → 通知 → Webhook → 添加端点 URL',
        workbuddy: 'Claw Tab → Start Service → 复制全局 Webhook URL（格式 https://claw.codebuddy.cn/wb/xxx-uuid）',
        hermes: 'Settings → Integrations → Webhook → Create Webhook → 复制 Endpoint URL',
        openclaw: '项目设置 → 通知 → Webhook → 添加端点 → 复制 URL',
        other: 'Coze 扣子：Bot 编辑页 → 触发器 → 添加 Webhook；Dify：应用 → 编排 → API 扩展 → Webhook；FastGPT：应用 → API 扩展 → Webhook 触发',
        custom: '部署 HTTP 接口接收 POST 请求，如 https://your-server.com/webhook/schedule-reminder',
      },
    } : undefined,
  };
}

function generateOpenClawSkill(baseUrl: string, apiKey: string, webhookUrl: string | null): string {
  const webhookSection = webhookUrl ? `

## 提醒推送（Webhook）

本技能已配置 Webhook 掐送，提醒通知由服务端主动推送，**无需轮询，不走 LLM，不消耗 token**。

- Webhook URL: \`${webhookUrl}\`
- 模式: \`--deliver-only\`（收到 POST → 渲染模板 → 直接推送给用户）

### 推送格式

当事项到达提醒时间，系统会 POST 如下 JSON 到 webhook：

请求头：
- \`Content-Type: application/json\`
- \`X-Hub-Signature-256: sha256=<HMAC-SHA256签名>\`（仅当配置了 Webhook Secret 时包含）

签名验证：使用 Webhook Secret 对请求 body 做 HMAC-SHA256，与 X-Hub-Signature-256 头比对即可验证来源。

\`\`\`json
{
  "type": "提醒通知",
  "title": "事项标题",
  "date": "2026年6月15日",
  "category": "工作",
  "priority": "紧急",
  "reminder_at": "2026年6月15日 09:00",
  "reminders": [
    {
      "event_id": "uuid",
      "title": "事项标题",
      "date": "2026年6月15日",
      "category": "工作",
      "priority": "紧急",
      "reminder_at": "2026年6月15日 09:00"
    }
  ],
  "count": 1
}
\`\`\`

顶层字段取自第一条提醒，模板可直接用 \`{title}\` \`{date}\` \`{category}\` \`{priority}\` \`{reminder_at}\` 引用。

### 收到推送后的操作

1. 将 reminders 渲染为通知消息推送给用户（不经过 LLM）
2. 用户回复"知道了"/"确认"/"收到"后，调用关闭提醒接口：

\`\`\`bash
curl -s -X POST \\
  -H "X-API-Key: $SCHEDULE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"event_ids":["uuid"]}' \\
  "$SCHEDULE_BASE_URL/api/agent/reminders"
\`\`\`

### 如何获取 Webhook URL

| 平台 | 获取方式 |
|------|----------|
| Codex | 设置 → 通知 → Webhook → 添加端点 URL |
| WorkBuddy | Claw Tab → Start Service → 复制全局 Webhook URL（格式 https://claw.codebuddy.cn/wb/xxx-uuid） |
| Hermes | Settings → Integrations → Webhook → Create Webhook → 复制 Endpoint URL |
| OpenClaw | 项目设置 → 通知 → Webhook → 添加端点 → 复制 URL |
| 其他 | Coze 扣子：Bot 编辑页 → 触发器 → 添加 Webhook；Dify：应用 → 编排 → API 扩展 → Webhook；FastGPT：应用 → API 扩展 → Webhook 触发 |
| 自建服务 | 部署 HTTP 接口接收 POST 请求，如 https://your-server.com/webhook/schedule-reminder |
` : '';

  return `---
name: schedule-manager
description: >
  日程管理助手：通过API操作用户的月历事项和工作任务，支持增删改查。
  提醒通知通过Webhook推送（deliver-only模式），无需轮询，不消耗token。
  当用户提到日程、事项、月历、任务、安排、计划、日历等关键词时触发。
version: 2.0.0
author: Schedule App
requires:
  - curl
metadata: {"openclaw":{"emoji":"📅","requires":{"env":["SCHEDULE_API_KEY","SCHEDULE_BASE_URL"],"bins":["curl"]},"primaryEnv":"SCHEDULE_API_KEY"}}
---

# 日程管理助手

本技能通过 HTTP API 操作用户的日程事项和工作任务。

## 环境变量

- \`SCHEDULE_BASE_URL\` = ${baseUrl}
- \`SCHEDULE_API_KEY\` = ${apiKey}

## 认证方式

所有请求需携带 Header：\`X-API-Key: \${SCHEDULE_API_KEY}\`

---

## 事项操作

### 查询事项

查询指定月份的所有事项：

\`\`\`bash
curl -s -H "X-API-Key: $SCHEDULE_API_KEY" \\
  "$SCHEDULE_BASE_URL/api/agent/events?month=YYYY-MM"
\`\`\`

返回字段：id, title, description, date, category(work/life), status(not_started/in_progress/completed), priority(normal/important/urgent), duration, sort_order, reminder_at, reminder_notified, created_at, updated_at

### 创建事项

\`\`\`bash
curl -s -X POST \\
  -H "X-API-Key: $SCHEDULE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"事项标题","date":"YYYY-MM-DD","category":"work","status":"not_started","priority":"normal","description":"可选描述","duration":"可选时长(小时)","reminder_at":"可选提醒时间ISO8601"}' \\
  "$SCHEDULE_BASE_URL/api/agent/events"
\`\`\`

必填字段：title, date, category
- category: work 或 life
- status: not_started(默认) / in_progress / completed
- priority: normal(默认) / important / urgent
- duration: 消耗时长（小时），支持小数，如 "2.5"
- reminder_at: 提醒时间，ISO 8601格式，如 "2026-06-15T09:00:00+08:00"

### 更新事项

\`\`\`bash
curl -s -X PUT \\
  -H "X-API-Key: $SCHEDULE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"status":"completed"}' \\
  "$SCHEDULE_BASE_URL/api/agent/events/{id}"
\`\`\`

只需传需要更新的字段。取消提醒：\`{"reminder_at": null}\`

### 删除事项

\`\`\`bash
curl -s -X DELETE \\
  -H "X-API-Key: $SCHEDULE_API_KEY" \\
  "$SCHEDULE_BASE_URL/api/agent/events/{id}"
\`\`\`

---

## 任务操作

### 查询任务

\`\`\`bash
curl -s -H "X-API-Key: $SCHEDULE_API_KEY" \\
  "$SCHEDULE_BASE_URL/api/agent/tasks"
\`\`\`

### 创建任务

\`\`\`bash
curl -s -X POST \\
  -H "X-API-Key: $SCHEDULE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"任务标题","status":"not_started","planned_start_date":"2025-01-01","planned_end_date":"2025-01-31"}' \\
  "$SCHEDULE_BASE_URL/api/agent/tasks"
\`\`\`

### 更新任务

\`\`\`bash
curl -s -X PUT \\
  -H "X-API-Key: $SCHEDULE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"status":"completed","actual_end_date":"2025-01-28"}' \\
  "$SCHEDULE_BASE_URL/api/agent/tasks/{id}"
\`\`\`

### 删除任务

\`\`\`bash
curl -s -X DELETE \\
  -H "X-API-Key: $SCHEDULE_API_KEY" \\
  "$SCHEDULE_BASE_URL/api/agent/tasks/{id}"
\`\`\`

---

## 提醒关闭

当用户对推送的提醒确认知悉后，调用此接口关闭提醒：

\`\`\`bash
curl -s -X POST \\
  -H "X-API-Key: $SCHEDULE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"event_ids":["uuid1","uuid2"]}' \\
  "$SCHEDULE_BASE_URL/api/agent/reminders"
\`\`\`

也可关闭单个提醒：\`{"event_id":"uuid1"}\`
${webhookSection}
---

## 注意事项

1. 所有日期格式为 YYYY-MM-DD
2. 查询事项必须指定 month 参数（格式 YYYY-MM）
3. 操作前先查询确认目标事项/任务的存在
4. 删除操作不可逆，请确认后再执行
5. 每个API Key有独立的权限控制，部分操作可能被禁止
6. 提醒通知通过Webhook主动推送（deliver-only模式），无需轮询
`;
}
