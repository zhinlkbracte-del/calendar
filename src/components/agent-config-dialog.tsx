'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, Plus, Copy, Trash2, Eye, ExternalLink, Key, BookOpen, Download, Check, Link, Webhook, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface AgentConfig {
  id: string;
  name: string;
  api_key: string;
  permissions: {
    events: { read: boolean; create: boolean; update: boolean; delete: boolean };
    tasks: { read: boolean; create: boolean; update: boolean; delete: boolean };
  };
  webhook_url: string | null;
  is_active: boolean;
  created_at: string;
}

interface AgentConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PERMISSION_LABELS: Record<string, Record<string, string>> = {
  events: {
    read: '查看事项',
    create: '创建事项',
    update: '编辑事项',
    delete: '删除事项',
  },
  tasks: {
    read: '查看任务',
    create: '创建任务',
    update: '编辑任务',
    delete: '删除任务',
  },
};

const GROUP_LABELS: Record<string, string> = {
  events: '事项权限',
  tasks: '任务权限',
};

export function AgentConfigDialog({ open, onOpenChange }: AgentConfigDialogProps) {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<string | null>(null);
  const [webhookInput, setWebhookInput] = useState('');
  const [showWebhookGuide, setShowWebhookGuide] = useState(false);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/agent/config');
      if (res.ok) {
        const json = await res.json();
        setAgents(json.data || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const [copiedConfig, setCopiedConfig] = useState<string | null>(null);

  const generateAgentConfig = (agent: { name: string; api_key: string; permissions: Record<string, Record<string, boolean>>; webhook_url: string | null }) => {
    const baseUrl = docsUrl?.replace('/api/agent/docs', '') || windowOrigin;
    const perms = agent.permissions;
    const enabledPerms: string[] = [];
    if (perms.events?.read) enabledPerms.push('事项查询');
    if (perms.events?.create) enabledPerms.push('事项新增');
    if (perms.events?.update) enabledPerms.push('事项编辑');
    if (perms.events?.delete) enabledPerms.push('事项删除');
    if (perms.tasks?.read) enabledPerms.push('任务查询');
    if (perms.tasks?.create) enabledPerms.push('任务新增');
    if (perms.tasks?.update) enabledPerms.push('任务编辑');
    if (perms.tasks?.delete) enabledPerms.push('任务删除');

    return `# 日程管理工具配置

## 基本信息
- 工具名称：日程管理（Schedule）
- 描述：管理用户的日程事项和任务，支持增删改查操作
- 已授权操作：${enabledPerms.join('、') || '无'}

## 接口配置
- Base URL：${baseUrl}
- 认证方式：请求头添加 X-API-Key
- API Key：${agent.api_key}
- Webhook URL：${agent.webhook_url || '未配置'}
- 接口文档：${docsUrl}

## 提醒推送（Webhook）

当事项到达提醒时间，系统会主动 POST 到配置的 Webhook URL（deliver-only 模式，不走 LLM，不消耗 token）：

推送格式：
{
  "type": "reminder",
  "reminders": [
    { "event_id": "uuid", "title": "事项标题", "date": "YYYY-MM-DD", "category": "work|life", "priority": "normal|important|urgent", "reminder_at": "ISO8601" }
  ],
  "count": 1
}

收到推送后直接渲染通知给用户。用户确认后调用关闭提醒接口。

### Webhook URL 获取方式
- Codex：设置 → 通知 → Webhook → 添加端点 URL
- WorkBuddy：Claw Tab → Start Service → 复制全局 Webhook URL（格式 https://claw.codebuddy.cn/wb/xxx-uuid）
- Hermes：Settings → Integrations → Webhook → Create Webhook → 复制 Endpoint URL
- OpenClaw：项目设置 → 通知 → Webhook → 添加端点 → 复制 URL
- 其他平台：Coze（扣子）Bot 编辑页 → 触发器 → 添加 Webhook → 复制 URL；Dify 应用 → 编排 → API 扩展 → 添加 Webhook → 复制回调地址；FastGPT 应用 → API 扩展 → Webhook 触发 → 复制接口地址
- 自建服务：部署 HTTP 接口接收 POST 请求，如 https://your-server.com/webhook/schedule-reminder

## 接口列表

### 事项（Events）
${perms.events?.read ? `- GET /api/agent/events?month=YYYY-MM  查询指定月份事项
  参数：month（必填，格式 YYYY-MM，如 2026-06）` : ''}
${perms.events?.create ? `- POST /api/agent/events  创建事项
  Body：{ "title": "事项标题（必填）", "date": "YYYY-MM-DD（必填）", "category": "work|life", "status": "not_started|in_progress|completed", "priority": "normal|important|urgent", "duration": "消耗时长（小时，可选）", "reminder_at": "提醒时间ISO8601（可选）", "description": "描述（可选）", "task_id": "关联任务ID（可选）" }` : ''}
${perms.events?.update ? `- PUT /api/agent/events/{id}  更新事项
  Body：需更新的字段（同创建，均为可选），另外 {"reminder_notified":true} 可关闭提醒` : ''}
${perms.events?.delete ? `- DELETE /api/agent/events/{id}  删除事项` : ''}

### 提醒（Reminders）
${perms.events?.update ? `- POST /api/agent/reminders  关闭提醒
  Body：{ "event_ids": ["id1","id2"] } 或 { "event_id": "id1" }
  当用户回复"知道了"/"确认"/"收到"等知悉答复后调用` : ''}

### 任务（Tasks）
${perms.tasks?.read ? `- GET /api/agent/tasks  查询所有任务` : ''}
${perms.tasks?.create ? `- POST /api/agent/tasks  创建任务
  Body：{ "name": "任务名称（必填）", "plan_start": "计划开始日期（可选）", "plan_end": "计划结束日期（可选）" }` : ''}
${perms.tasks?.update ? `- PUT /api/agent/tasks/{id}  更新任务
  Body：需更新的字段（同创建，均为可选），另外 "actual_end" 可填实际结束日期` : ''}
${perms.tasks?.delete ? `- DELETE /api/agent/tasks/{id}  删除任务` : ''}

## 使用说明
1. 所有请求必须携带请求头 X-API-Key: ${agent.api_key}
2. 日期格式统一为 YYYY-MM-DD
3. 类别 category 取值：work（工作）、life（生活）
4. 状态 status 取值：not_started（未开始）、in_progress（进行中）、completed（已完成）
5. 优先级 priority 取值：normal（普通）、important（重要）、urgent（紧急）
6. 完整接口文档请访问：${docsUrl}
7. 提醒通知通过Webhook主动推送（deliver-only模式），无需轮询
`.replace(/\n{3,}/g, '\n\n');
  };

  const copyAgentConfig = (agent: { name: string; api_key: string; permissions: Record<string, Record<string, boolean>>; webhook_url: string | null }) => {
    const config = generateAgentConfig(agent);
    navigator.clipboard.writeText(config).then(() => {
      setCopiedConfig(agent.api_key);
      setTimeout(() => setCopiedConfig(null), 2000);
    });
  };

  useEffect(() => {
    if (open) fetchAgents();
  }, [open, fetchAgents]);

  const createAgent = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/agent/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName || 'My Agent' }),
      });
      if (res.ok) {
        const json = await res.json();
        setAgents([json.data, ...agents]);
        setNewName('');
        setShowNew(false);
      }
    } finally {
      setCreating(false);
    }
  };

  const updatePermission = async (agentId: string, group: 'events' | 'tasks', action: string, value: boolean) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;

    const newPermissions = {
      ...agent.permissions,
      [group]: { ...agent.permissions[group], [action]: value },
    };

    const res = await fetch('/api/agent/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: agentId, permissions: newPermissions }),
    });

    if (res.ok) {
      setAgents(agents.map(a => a.id === agentId ? { ...a, permissions: newPermissions } : a));
    }
  };

  const updateWebhookUrl = async (agentId: string) => {
    const res = await fetch('/api/agent/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: agentId, webhook_url: webhookInput || null }),
    });
    if (res.ok) {
      const json = await res.json();
      setAgents(agents.map(a => a.id === agentId ? { ...a, webhook_url: webhookInput || null } : a));
      setEditingWebhook(null);
    }
  };

  const toggleActive = async (agentId: string, isActive: boolean) => {
    const res = await fetch('/api/agent/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: agentId, is_active: isActive }),
    });
    if (res.ok) {
      setAgents(agents.map(a => a.id === agentId ? { ...a, is_active: isActive } : a));
    }
  };

  const deleteAgent = async (agentId: string) => {
    if (!confirm('确定删除此 Agent？删除后相关 API Key 将立即失效。')) return;
    const res = await fetch(`/api/agent/config?id=${agentId}`, { method: 'DELETE' });
    if (res.ok) {
      setAgents(agents.filter(a => a.id !== agentId));
    }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const docsUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/agent/docs` : '';
  const windowOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Agent 接入管理
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Quick Guide */}
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground space-y-1.5">
            <p className="font-medium text-foreground">如何接入你的 Agent</p>
            <p>1. 点击「新建 Agent」创建凭证，配置 Webhook URL（用于接收提醒推送）</p>
            <p>2. 勾选需要的权限，下载或复制 Skill 给你的 Agent</p>
            <p>3. 当事项到达提醒时间时，系统会自动推送到 Webhook（deliver-only 模式，不走 LLM）</p>
            <div className="flex items-center gap-1 text-xs pt-0.5">
              <span>完整接口文档：</span>
              <a href={docsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-primary hover:underline">
                <ExternalLink className="w-3 h-3 shrink-0" />/api/agent/docs
              </a>
            </div>
          </div>

          {/* Create new */}
          {!showNew ? (
            <Button variant="outline" size="sm" onClick={() => setShowNew(true)} className="w-full">
              <Plus className="w-4 h-4 mr-1" /> 新建 Agent
            </Button>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder="Agent 名称"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="flex-1"
                onKeyDown={e => e.key === 'Enter' && createAgent()}
              />
              <Button size="sm" onClick={createAgent} disabled={creating}>
                {creating ? '创建中...' : '创建'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowNew(false); setNewName(''); }}>
                取消
              </Button>
            </div>
          )}

          {/* Agent list */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : agents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无 Agent，点击上方按钮创建
            </div>
          ) : (
            <div className="space-y-4">
              {agents.map(agent => (
                <div key={agent.id} className="border rounded-lg p-4 space-y-3">
                  {/* Header: name + active toggle + delete */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-primary" />
                      <span className="font-medium">{agent.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${agent.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {agent.is_active ? '启用' : '禁用'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Switch
                          checked={agent.is_active}
                          onCheckedChange={v => toggleActive(agent.id, v)}
                        />
                        <span className="text-muted-foreground">{agent.is_active ? '启用' : '禁用'}</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => deleteAgent(agent.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* API Key */}
                  <div className="flex items-center gap-2 bg-muted/30 rounded-md px-3 py-2">
                    <Key className="w-4 h-4 text-muted-foreground shrink-0" />
                    <code className="text-xs font-mono flex-1 truncate select-all">
                      {agent.api_key}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => copyKey(agent.api_key)}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedKey === agent.api_key ? '已复制' : '复制'}
                    </Button>
                  </div>

                  {/* Webhook URL */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Webhook className="w-3.5 h-3.5" />
                      <span>Webhook URL（提醒推送地址）</span>
                    </div>
                    {editingWebhook === agent.id ? (
                      <div className="flex gap-2">
                        <Input
                          placeholder="https://your-agent-webhook.example.com/notify"
                          value={webhookInput}
                          onChange={e => setWebhookInput(e.target.value)}
                          className="flex-1 text-xs h-8"
                          onKeyDown={e => e.key === 'Enter' && updateWebhookUrl(agent.id)}
                        />
                        <Button size="sm" className="h-8 text-xs" onClick={() => updateWebhookUrl(agent.id)}>
                          保存
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setEditingWebhook(null)}>
                          取消
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="flex items-center gap-2 bg-muted/30 rounded-md px-3 py-1.5 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => { setEditingWebhook(agent.id); setWebhookInput(agent.webhook_url || ''); }}
                      >
                        <code className="text-xs font-mono flex-1 truncate text-muted-foreground">
                          {agent.webhook_url || '未配置 - 点击设置'}
                        </code>
                        <Eye className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      配置后，事项到达提醒时间将主动 POST 推送（deliver-only 模式，不走 LLM，不消耗 token）
                    </p>
                    <button
                      type="button"
                      className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-400 mt-1"
                      onClick={() => setShowWebhookGuide(!showWebhookGuide)}
                    >
                      <HelpCircle className="w-3 h-3" />
                      {showWebhookGuide ? '收起获取教程' : '如何获取 Webhook URL？'}
                      {showWebhookGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    {showWebhookGuide && (
                      <div className="text-[10px] text-muted-foreground bg-muted/20 rounded-md p-2.5 space-y-2 border border-border/50">
                        <p className="font-medium text-foreground">Webhook URL 获取方式</p>
                        <div>
                          <p className="font-medium">Codex</p>
                          <p>设置 → 通知（Notifications）→ Webhook → 添加端点 URL</p>
                        </div>
                        <div>
                          <p className="font-medium">WorkBuddy</p>
                          <p>左侧 Claw Tab → Start Service → 等待状态为 Running → 复制全局 Webhook URL（格式 https://claw.codebuddy.cn/wb/xxx-uuid）</p>
                        </div>
                        <div>
                          <p className="font-medium">Hermes</p>
                          <p>Settings → Integrations → Webhook → Create Webhook → 复制 Endpoint URL</p>
                        </div>
                        <div>
                          <p className="font-medium">OpenClaw</p>
                          <p>项目设置 → 通知 → Webhook → 添加端点 → 复制 URL</p>
                        </div>
                        <div>
                          <p className="font-medium">其他平台</p>
                          <p>Coze（扣子）Bot 编辑页 → 触发器 → 添加 Webhook → 复制 URL；Dify 应用 → 编排 → API 扩展 → 添加 Webhook → 复制回调地址；FastGPT 应用 → API 扩展 → Webhook 触发 → 复制接口地址</p>
                        </div>
                        <div>
                          <p className="font-medium">自建服务</p>
                          <p>部署一个 HTTP 接口，接收 POST 请求即可，URL 格式如：https://your-server.com/webhook/schedule-reminder</p>
                        </div>
                        <p className="text-[10px] italic">提示：Webhook 推送为 deliver-only 模式，Agent 收到后直接渲染通知给用户，无需 LLM 处理，不消耗 token</p>
                      </div>
                    )}
                  </div>

                  {/* Tabs: Skills / Permissions */}
                  <Tabs defaultValue="skills" className="w-full">
                    <TabsList className="w-full h-8">
                      <TabsTrigger value="skills" className="flex-1 text-xs">Skills</TabsTrigger>
                      <TabsTrigger value="permissions" className="flex-1 text-xs">权限</TabsTrigger>
                    </TabsList>
                    <TabsContent value="skills" className="mt-3 space-y-2">
                      <p className="text-[11px] text-muted-foreground">下载或复制 Skill 给你的 Agent，内含 API Key 和接口说明：</p>
                      <p className="text-[11px] text-red-500 font-medium">⚠ skill里面已包含你的 API Key，切勿发送给他人！</p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 text-xs h-7" onClick={() => {
                          const url = `${windowOrigin}/api/agent/skills?agent_id=${agent.id}&platform=hermes`;
                          navigator.clipboard.writeText(url);
                          setCopiedConfig('hermes-link');
                          setTimeout(() => setCopiedConfig(null), 2000);
                        }}>
                          {copiedConfig === 'hermes-link' ? <Check className="w-3 h-3 mr-1 text-green-500" /> : <Link className="w-3 h-3 mr-1" />}
                          {copiedConfig === 'hermes-link' ? '已复制' : 'Hermes skill 链接'}
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 text-xs h-7" onClick={() => {
                          const url = `${windowOrigin}/api/agent/skills?agent_id=${agent.id}&platform=openclaw`;
                          navigator.clipboard.writeText(url);
                          setCopiedConfig('openclaw-link');
                          setTimeout(() => setCopiedConfig(null), 2000);
                        }}>
                          {copiedConfig === 'openclaw-link' ? <Check className="w-3 h-3 mr-1 text-green-500" /> : <Link className="w-3 h-3 mr-1" />}
                          {copiedConfig === 'openclaw-link' ? '已复制' : 'OpenClaw skill 链接'}
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs h-7"
                          onClick={() => {
                            const url = `${windowOrigin}/api/agent/skills?agent_id=${agent.id}&platform=hermes`;
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `schedule-hermes-skill.json`;
                            a.click();
                          }}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          下载 Hermes skill
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs h-7"
                          onClick={() => {
                            const url = `${windowOrigin}/api/agent/skills?agent_id=${agent.id}&platform=openclaw`;
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `TOOLS.md`;
                            a.click();
                          }}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          下载 OpenClaw skill
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => copyAgentConfig(agent)}
                      >
                        <Copy className="w-3.5 h-3.5 mr-1.5" />
                        {copiedConfig === agent.api_key ? '已复制' : '一键复制配置给 Agent，自行构建 skills'}
                      </Button>
                    </TabsContent>
                    <TabsContent value="permissions" className="mt-3">
                      <div className="grid grid-cols-2 gap-4">
                        {(['events', 'tasks'] as const).map(group => (
                          <div key={group} className="space-y-2">
                            <div className="text-sm font-medium text-muted-foreground">
                              {GROUP_LABELS[group]}
                            </div>
                            <div className="space-y-1.5">
                              {Object.entries(PERMISSION_LABELS[group]).map(([action, label]) => (
                                <div key={action} className="flex items-center justify-between">
                                  <span className="text-sm">{label}</span>
                                  <Switch
                                    checked={agent.permissions[group]?.[action as keyof typeof agent.permissions.events] ?? false}
                                    onCheckedChange={v => updatePermission(agent.id, group, action, v)}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
