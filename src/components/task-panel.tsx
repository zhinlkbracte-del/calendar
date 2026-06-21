'use client';

import { useState, useEffect, useCallback } from 'react';
import type { TaskItem, TaskStatus, TaskUrgencyType, TaskDelayStatus, EventItem } from '@/lib/types';
import { TASK_STATUS_CONFIG, TASK_DELAY_CONFIG, TASK_URGENCY_CONFIG, STATUS_CONFIG, CATEGORY_CONFIG, PRIORITY_CONFIG } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import {
  Plus, Trash2, ChevronDown, ChevronRight, Calendar, Clock, Edit3, CheckCircle2, Play, Pause, Link2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const h: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

export default function TaskPanel({ onTasksChange }: { onTasksChange?: () => void }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [taskEvents, setTaskEvents] = useState<Record<string, EventItem[]>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formPlannedEndDate, setFormPlannedEndDate] = useState('');
  const [formActualEndDate, setFormActualEndDate] = useState('');
  const [formDelayStatus, setFormDelayStatus] = useState<TaskDelayStatus>('normal');
  const [formProgress, setFormProgress] = useState('');
  const [formUrgencyType, setFormUrgencyType] = useState<TaskUrgencyType>('not_important_not_urgent');
  const [formStatus, setFormStatus] = useState<TaskStatus>('not_started');

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch('/api/tasks', { credentials: 'include', headers: authHeaders() });
      if (res.ok) {
        const json = await res.json();
        setTasks(json.data || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const openAddDialog = () => {
    setEditingTask(null);
    setFormTitle(''); setFormStartDate(''); setFormPlannedEndDate('');
    setFormActualEndDate(''); setFormDelayStatus('normal'); setFormProgress('');
    setFormUrgencyType('not_important_not_urgent'); setFormStatus('not_started');
    setDialogOpen(true);
  };

  const openEditDialog = (task: TaskItem) => {
    setEditingTask(task);
    setFormTitle(task.title); setFormStartDate(task.start_date || '');
    setFormPlannedEndDate(task.planned_end_date || ''); setFormActualEndDate(task.actual_end_date || '');
    setFormDelayStatus(task.delay_status); setFormProgress(task.latest_progress || '');
    setFormUrgencyType(task.urgency_type); setFormStatus(task.status);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const body = {
      title: formTitle, start_date: formStartDate, planned_end_date: formPlannedEndDate,
      actual_end_date: formActualEndDate, delay_status: formDelayStatus,
      latest_progress: formProgress, urgency_type: formUrgencyType, status: formStatus,
    };
    try {
      if (editingTask) {
        await fetch(`/api/tasks/${editingTask.id}`, {
          method: 'PUT', credentials: 'include', headers: authHeaders(),
          body: JSON.stringify(body),
        });
      } else {
        await fetch('/api/tasks', {
          method: 'POST', credentials: 'include', headers: authHeaders(),
          body: JSON.stringify(body),
        });
      }
      setDialogOpen(false);
      fetchTasks();
      onTasksChange?.();
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'DELETE', credentials: 'include', headers: authHeaders(),
      });
      setDeleteConfirmId(null);
      fetchTasks();
      onTasksChange?.();
    } catch { /* ignore */ }
  };

  const handleQuickStatus = async (task: TaskItem, newStatus: TaskStatus) => {
    const body: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'completed' && task.status !== 'completed') {
      body.actual_end_date = new Date().toISOString().split('T')[0];
    }
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT', credentials: 'include', headers: authHeaders(),
        body: JSON.stringify(body),
      });
      fetchTasks();
      onTasksChange?.();
    } catch { /* ignore */ }
  };

  const toggleExpand = async (taskId: string) => {
    if (expandedTaskId === taskId) {
      setExpandedTaskId(null);
      return;
    }
    setExpandedTaskId(taskId);
    if (!taskEvents[taskId]) {
      try {
        const res = await fetch(`/api/tasks/${taskId}/events`, { credentials: 'include', headers: authHeaders() });
        if (res.ok) {
          const json = await res.json();
          setTaskEvents(prev => ({ ...prev, [taskId]: json.data || [] }));
        }
      } catch { /* ignore */ }
    }
  };

  const statusOrder: TaskStatus[] = ['in_progress', 'not_started', 'completed'];
  const sortedTasks = [...tasks].sort((a, b) => {
    const si = statusOrder.indexOf(a.status), sb = statusOrder.indexOf(b.status);
    if (si !== sb) return si - sb;
    const da = a.planned_end_date || '9999-12-31', db = b.planned_end_date || '9999-12-31';
    return da.localeCompare(db);
  });

  const inProgressTasks = sortedTasks.filter(t => t.status === 'in_progress');
  const notStartedTasks = sortedTasks.filter(t => t.status === 'not_started');
  const completedTasks = sortedTasks.filter(t => t.status === 'completed');

  const renderTaskCard = (task: TaskItem) => {
    const isExpanded = expandedTaskId === task.id;
    const urgency = TASK_URGENCY_CONFIG[task.urgency_type];
    const statusCfg = TASK_STATUS_CONFIG[task.status];
    const delayCfg = TASK_DELAY_CONFIG[task.delay_status];

    return (
      <div key={task.id} className={`rounded border ${task.status === 'completed' ? 'border-border/40 opacity-60' : 'border-border/50'} bg-card/60 overflow-hidden`}>
        {/* Task header */}
        <div className="p-3 sm:p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${urgency.bg} ${urgency.color} border ${urgency.border}`}>
                  {urgency.label}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusCfg.bg} ${statusCfg.color}`}>
                  {statusCfg.label}
                </span>
                {task.delay_status === 'delayed' && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${delayCfg.bg} ${delayCfg.color}`}>
                    {delayCfg.label}
                  </span>
                )}
              </div>
              <h3 className={`mt-1.5 font-medium text-sm sm:text-base ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                {task.title}
              </h3>
              {(task.start_date || task.planned_end_date) && (
                <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                  {task.start_date && (
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{task.start_date}</span>
                  )}
                  {task.planned_end_date && (
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />计划至 {task.planned_end_date}</span>
                  )}
                  {task.actual_end_date && (
                    <span className="flex items-center gap-1 text-green-500">完成于 {task.actual_end_date}</span>
                  )}
                </div>
              )}
              {task.latest_progress && (
                <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{task.latest_progress}</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {/* Quick status buttons */}
              {task.status === 'not_started' && (
                <button onClick={() => handleQuickStatus(task, 'in_progress')} title="开始"
                  className="p-1.5 rounded-sm hover:bg-amber-500/10 text-amber-400 transition-colors">
                  <Play className="w-3.5 h-3.5" />
                </button>
              )}
              {task.status === 'in_progress' && (
                <button onClick={() => handleQuickStatus(task, 'completed')} title="完成"
                  className="p-1.5 rounded-sm hover:bg-green-500/10 text-green-400 transition-colors">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
              )}
              {task.status === 'completed' && (
                <button onClick={() => handleQuickStatus(task, 'in_progress')} title="重新开启"
                  className="p-1.5 rounded-sm hover:bg-amber-500/10 text-amber-400 transition-colors">
                  <Pause className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={() => openEditDialog(task)} title="编辑"
                className="p-1.5 rounded-sm hover:bg-muted/60 text-muted-foreground transition-colors">
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setDeleteConfirmId(deleteConfirmId === task.id ? null : task.id)} title="删除"
                className="p-1.5 rounded-sm hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {/* Delete confirmation */}
          {deleteConfirmId === task.id && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-red-400">确认删除此任务？</span>
              <button onClick={() => handleDelete(task.id)} className="px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30">删除</button>
              <button onClick={() => setDeleteConfirmId(null)} className="px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-muted">取消</button>
            </div>
          )}
          {/* Expand for related events */}
          <button onClick={() => toggleExpand(task.id)}
            className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-muted-foreground transition-colors">
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <Link2 className="w-3 h-3" />关联事项
          </button>
        </div>
        {/* Expanded events */}
        {isExpanded && (
          <div className="border-t border-border/50 bg-background/40 p-3">
            {taskEvents[task.id]?.length ? (
              <div className="space-y-1.5">
                {taskEvents[task.id].map(ev => {
                  const catCfg = CATEGORY_CONFIG[ev.category];
                  const priCfg = PRIORITY_CONFIG[ev.priority];
                  const stCfg = STATUS_CONFIG[ev.status];
                  return (
                    <div key={ev.id} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-sm bg-card/60">
                      <span className={`w-1.5 h-1.5 rounded-full ${catCfg.dot}`} />
                      <span className="text-muted-foreground flex-1 truncate">{ev.title}</span>
                      <span className={priCfg.color}>{priCfg.icon}</span>
                      <span className={`${stCfg.color} text-[10px]`}>{stCfg.label}</span>
                      <span className="text-muted-foreground text-[10px]">{ev.date}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">暂无关联事项</p>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderSection = (title: string, items: TaskItem[], emptyText: string) => {
    if (items.length === 0 && title !== '进行中') return null;
    return (
      <div className="mb-6">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
          {title} <span className="text-muted-foreground">({items.length})</span>
        </h2>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{emptyText}</p>
        ) : (
          <div className="space-y-2">{items.map(renderTaskCard)}</div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground">加载中...</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto min-h-0 px-4 sm:px-6 lg:px-8 py-4">
      <div className="max-w-4xl mx-auto">
        {/* Add task button */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-muted-foreground">共 {tasks.length} 个任务</div>
          <Button onClick={openAddDialog} size="sm" className="bg-foreground text-background hover:bg-foreground/80 rounded-sm shadow-none">
            <Plus className="w-4 h-4 mr-1" />添加任务
          </Button>
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded bg-card/60 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-muted-foreground">暂无任务</h3>
            <p className="text-sm text-muted-foreground mt-1">点击上方按钮添加第一个任务</p>
          </div>
        ) : (
          <>
            {renderSection('进行中', inProgressTasks, '暂无进行中的任务')}
            {renderSection('未开始', notStartedTasks, '暂无未开始的任务')}
            {renderSection('已完成', completedTasks, '暂无已完成的任务')}
          </>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTask ? '编辑任务' : '添加任务'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">任务标题 *</label>
              <Input value={formTitle} onChange={e => setFormTitle(e.target.value)}
                className="bg-muted border-border text-foreground" placeholder="输入任务标题" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">开始时间</label>
                <Input type="date" value={formStartDate} onChange={e => setFormStartDate(e.target.value)}
                  className="bg-muted border-border text-foreground" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">计划结束时间</label>
                <Input type="date" value={formPlannedEndDate} onChange={e => setFormPlannedEndDate(e.target.value)}
                  className="bg-muted border-border text-foreground" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">实际结束时间</label>
                <Input type="date" value={formActualEndDate} onChange={e => setFormActualEndDate(e.target.value)}
                  className="bg-muted border-border text-foreground" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">状态</label>
                <Select value={formStatus} onValueChange={v => setFormStatus(v as TaskStatus)}>
                  <SelectTrigger className="bg-muted border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-muted border-border">
                    {Object.entries(TASK_STATUS_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="text-foreground focus:bg-muted">{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">延期状态</label>
                <Select value={formDelayStatus} onValueChange={v => setFormDelayStatus(v as TaskDelayStatus)}>
                  <SelectTrigger className="bg-muted border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-muted border-border">
                    {Object.entries(TASK_DELAY_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="text-foreground focus:bg-muted">{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">重要紧急程度</label>
                <Select value={formUrgencyType} onValueChange={v => setFormUrgencyType(v as TaskUrgencyType)}>
                  <SelectTrigger className="bg-muted border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-muted border-border">
                    {Object.entries(TASK_URGENCY_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="text-foreground focus:bg-muted">{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">最新进展</label>
              <Textarea value={formProgress} onChange={e => setFormProgress(e.target.value)}
                className="bg-muted border-border text-foreground min-h-[80px]" placeholder="记录最新进展..." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}
                className="border-border text-muted-foreground hover:text-white">取消</Button>
              <Button onClick={handleSave} disabled={!formTitle.trim()}
                className="bg-foreground text-background hover:bg-foreground/80">保存</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
