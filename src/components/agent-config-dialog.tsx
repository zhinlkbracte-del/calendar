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
import { Bot, Plus, Copy, Trash2, Eye, ExternalLink, Key, BookOpen } from 'lucide-react';

interface AgentConfig {
  id: string;
  name: string;
  api_key: string;
  permissions: {
    events: { read: boolean; create: boolean; update: boolean; delete: boolean };
    tasks: { read: boolean; create: boolean; update: boolean; delete: boolean };
  };
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

  const generateAgentConfig = (agent: { name: string; api_key: string; permissions: Record<string, Record<string, boolean>> }) => {
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
- 接口文档：${docsUrl}

## 接口列表

### 事项（Events）
${perms.events?.read ? `- GET /api/agent/events?month=YYYY-MM  查询指定月份事项
  参数：month（必填，格式 YYYY-MM，如 2026-06）` : ''}
${perms.events?.create ? `- POST /api/agent/events  创建事项
  Body：{ "title": "事项标题（必填）", "date": "YYYY-MM-DD（必填）", "category": "work|life", "status": "not_started|in_progress|completed", "priority": "normal|important|urgent", "duration": "消耗时长（小时，可选）", "description": "描述（可选）", "task_id": "关联任务ID（可选）" }` : ''}
${perms.events?.update ? `- PUT /api/agent/events/{id}  更新事项
  Body：需更新的字段（同创建，均为可选）` : ''}
${perms.events?.delete ? `- DELETE /api/agent/events/{id}  删除事项` : ''}

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
`.replace(/\n{3,}/g, '\n\n');
  };

  const copyAgentConfig = (agent: { name: string; api_key: string; permissions: Record<string, Record<string, boolean>> }) => {
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
            <p>1. 点击「新建 Agent」创建凭证，勾选需要的权限</p>
            <p>2. 点击 Agent 卡片上的「一键复制配置」按钮</p>
            <p>3. 将复制的内容粘贴到你的 Agent 平台即可，Agent 会自动读取配置</p>
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

                  {/* Permissions */}
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

                  {/* One-click copy config */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => copyAgentConfig(agent)}
                  >
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    {copiedConfig === agent.api_key ? '已复制' : '一键复制配置给 Agent'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
