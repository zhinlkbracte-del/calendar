import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get('platform') || 'hermes';
  const apiKey = searchParams.get('api_key') || 'YOUR_API_KEY';
  const host = request.headers.get('host') || 'localhost:5000';
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const baseUrl = `${protocol}://${host}`;

  if (platform === 'hermes') {
    return NextResponse.json(generateHermesSkill(baseUrl, apiKey), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  if (platform === 'openclaw') {
    const md = generateOpenClawSkill(baseUrl, apiKey);
    return new NextResponse(md, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': 'attachment; filename="SKILL.md"',
      },
    });
  }

  return NextResponse.json({ error: 'Unsupported platform. Use hermes or openclaw.' }, { status: 400 });
}

function generateHermesSkill(baseUrl: string, apiKey: string) {
  return {
    name: 'schedule-manager',
    version: 1,
    description: '日程管理助手：通过API操作用户的月历事项和工作任务，支持增删改查',
    trigger: ['日程', '事项', '月历', '任务', '安排', '计划', '日历', 'schedule', 'event', 'task', 'calendar'],
    tools_required: ['http_request'],
    skills: [
      {
        name: 'query-events',
        description: '查询指定月份的事项列表',
        steps: [
          `调用 GET ${baseUrl}/api/agent/events?month=YYYY-MM`,
          'Header: X-API-Key: YOUR_API_KEY',
          '返回该月所有事项（含标题、日期、类别、状态、优先级、消耗时长等）',
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
        name: 'check-reminders',
        description: '检查到期提醒，当有事项到达提醒时间时通知用户',
        steps: [
          `调用 GET ${baseUrl}/api/agent/reminders`,
          'Header: X-API-Key: YOUR_API_KEY',
          '返回所有已到期但未通知的提醒事项',
          '主动通知用户有事项需要关注',
        ],
      },
      {
        name: 'dismiss-reminder',
        description: '关闭提醒（用户确认知悉后调用）',
        steps: [
          `调用 POST ${baseUrl}/api/agent/reminders`,
          'Header: X-API-Key: YOUR_API_KEY',
          'Body: {"event_ids":["id1","id2"]} 或 {"event_id":"id1"}',
          '当用户回复"知道了"/"确认"/"收到"等知悉答复后调用此接口',
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
    },
  };
}

function generateOpenClawSkill(baseUrl: string, apiKey: string): string {
  return `---
name: schedule-manager
description: >
  日程管理助手：通过API操作用户的月历事项和工作任务，支持增删改查。
  当用户提到日程、事项、月历、任务、安排、计划、日历等关键词时触发。
version: 1.0.0
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

返回字段：id, title, description, date, category(work/life), status(not_started/in_progress/completed), priority(normal/important/urgent), duration, sort_order, created_at, updated_at

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

只需传需要更新的字段。

### 删除事项

\`\`\`bash
curl -s -X DELETE \\
  -H "X-API-Key: $SCHEDULE_API_KEY" \\
  "$SCHEDULE_BASE_URL/api/agent/events/{id}"
\`\`\`

### 设置提醒

创建事项时可通过 reminder_at 字段设置提醒时间（ISO 8601格式）：

\`\`\`bash
curl -s -X POST \\
  -H "X-API-Key: $SCHEDULE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"项目评审","date":"2026-06-15","category":"work","reminder_at":"2026-06-15T09:00:00+08:00"}' \\
  "$SCHEDULE_BASE_URL/api/agent/events"
\`\`\`

也可通过更新事项设置提醒：

\`\`\`bash
curl -s -X PUT \\
  -H "X-API-Key: $SCHEDULE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"reminder_at":"2026-06-15T09:00:00+08:00"}' \\
  "$SCHEDULE_BASE_URL/api/agent/events/{id}"
\`\`\`

取消提醒：\`{"reminder_at": null}\`

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

## 提醒通知操作

### 检查到期提醒

定期（建议每15秒）调用此接口检查是否有到期提醒：

\`\`\`bash
curl -s -H "X-API-Key: $SCHEDULE_API_KEY" \\
  "$SCHEDULE_BASE_URL/api/agent/reminders"
\`\`\`

返回所有已到期但未通知的提醒事项。发现新提醒时，应主动通知用户。

### 关闭提醒

当用户回复"知道了"/"确认"/"收到"等知悉答复后，调用此接口关闭提醒：

\`\`\`bash
curl -s -X POST \\
  -H "X-API-Key: $SCHEDULE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"event_ids":["uuid1","uuid2"]}' \\
  "$SCHEDULE_BASE_URL/api/agent/reminders"
\`\`\`

也可关闭单个提醒：\`{"event_id":"uuid1"}\`

---

## 注意事项

1. 所有日期格式为 YYYY-MM-DD
2. 查询事项必须指定 month 参数（格式 YYYY-MM）
3. 操作前先查询确认目标事项/任务的存在
4. 删除操作不可逆，请确认后再执行
5. 每个API Key有独立的权限控制，部分操作可能被禁止
`;
}
