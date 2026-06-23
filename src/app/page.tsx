'use client';

import { useState, useEffect, useCallback, useMemo, useRef, Fragment } from 'react';
import type { EventItem, EventCategory, EventStatus, EventPriority, FilterCategory, TaskItem } from '@/lib/types';
import { CATEGORY_CONFIG, STATUS_CONFIG, PRIORITY_CONFIG, TASK_STATUS_CONFIG } from '@/lib/types';
import { getMonthExtras, type DayExtra } from '@/lib/holidays';
import { useAuth } from '@/lib/auth-context';
import AuthPage from '@/components/auth-page';
import ProfileDialog from '@/components/profile-dialog';
import TaskPanel from '@/components/task-panel';
import { SearchDialog } from '@/components/search-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday, parseISO, isValid } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTheme } from '@/lib/use-theme';
import ReactDOM from 'react-dom';

function FontPreload() {
  ReactDOM.preconnect('https://fonts.googleapis.cn');
  ReactDOM.preconnect('https://fonts.gstatic.cn');
  return null;
}

/* ─── 优先级标签 ─── */
function PriorityBadge({ priority, compact }: { priority: EventPriority; compact?: boolean }) {
  const cfg = PRIORITY_CONFIG[priority];
  if (priority === 'normal') return null;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold tracking-wide uppercase ${cfg.color} ${compact ? 'text-[9px]' : ''}`}>
      {compact ? cfg.icon : cfg.label}
    </span>
  );
}

/* ─── 统计栏 ─── */
function StatsBar({ category, events, filterPriority, onPriorityClick }: {
  category: EventCategory;
  events: EventItem[];
  filterPriority: EventPriority | null;
  onPriorityClick: (p: EventPriority) => void;
}) {
  const isMobile = useIsMobile();
  const cfg = CATEGORY_CONFIG[category];
  const pending = events.filter(e => e.status !== 'completed');
  const counts = { urgent: 0, important: 0, normal: 0 };
  pending.forEach(e => { counts[e.priority]++; });
  const total = pending.length;

  return (
    <div className={`flex items-center gap-1.5 rounded px-2 py-1.5 ${cfg.border} border ${cfg.bg} ${isMobile ? 'flex-1 min-w-0' : ''}`}>
      {!isMobile && (
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} mr-1`} />
      )}
      {!isMobile && (
        <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
      )}
      {!isMobile && (
        <span className="text-[11px] text-muted-foreground tabular-nums">{total}</span>
      )}
      {(['normal', 'important', 'urgent'] as EventPriority[]).map(p => {
        const pc = PRIORITY_CONFIG[p];
        const active = filterPriority === p;
        return (
          <button
            key={p}
            onClick={() => onPriorityClick(p)}
            className={`text-[11px] px-1 py-0.5 rounded-sm transition-colors whitespace-nowrap ${
              active
                ? 'bg-foreground text-background font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {pc.label} {counts[p]}
          </button>
        );
      })}
    </div>
  );
}

/* ─── 排序弹窗 ─── */
function SortDialog({ open, onClose, date, events, onReorder }: {
  open: boolean; onClose: () => void; date: string;
  events: EventItem[]; onReorder: () => void;
}) {
  const [items, setItems] = useState(events);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const { getToken } = useAuth();

  useEffect(() => { setItems(events); }, [events]);

  const handleDragStart = (i: number) => setDragIdx(i);
  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === i) return;
    const next = [...items];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(i, 0, moved);
    setItems(next);
    setDragIdx(i);
  };
  const handleDragEnd = () => setDragIdx(null);

  const save = async () => {
    const token = getToken();
    await fetch('/api/events/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      credentials: 'include',
      body: JSON.stringify({ items: items.map((it, i) => ({ id: it.id, sort_order: String(i) })) }),
    });
    onReorder();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>排序事项 · {date}</DialogTitle>
          <DialogDescription>拖动调整顺序</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
          {items.map((ev, i) => (
            <div key={ev.id} draggable onDragStart={() => handleDragStart(i)}
              onDragOver={e => handleDragOver(e, i)} onDragEnd={handleDragEnd}
              className={`flex items-center gap-2 p-2 rounded-sm border cursor-grab active:cursor-grabbing transition-colors ${
                dragIdx === i ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'
              }`}>
              <span className="text-muted-foreground text-xs">☰</span>
              <span className={`w-1.5 h-1.5 rounded-full ${CATEGORY_CONFIG[ev.category].dot}`} />
              <span className="text-sm truncate flex-1">{ev.title}</span>
              <PriorityBadge priority={ev.priority} compact />
            </div>
          ))}
        </div>
        <Button onClick={save} className="w-full">保存排序</Button>
      </DialogContent>
    </Dialog>
  );
}

/* ─── 移动周视图 ─── */
function MobileWeekView({ currentDate, events, filterCategory, filterPriority, expandedDates, dateSettings,
  toggleExpand, openNewEvent, openEditEvent, openSortDialog, isWorkday, handleLongPressStart, handleLongPressEnd, longPressDateRef, monthExtras }: {
  currentDate: Date; events: EventItem[]; filterCategory: FilterCategory; filterPriority: EventPriority | null;
  expandedDates: Set<string>; dateSettings: Record<string, string>;
  toggleExpand: (d: string) => void; openNewEvent: (d: string) => void;
  openEditEvent: (e: EventItem) => void; openSortDialog: (d: string) => void;
  isWorkday: (d: Date) => boolean;
  handleLongPressStart: (d: string) => void; handleLongPressEnd: () => void;
  longPressDateRef: React.MutableRefObject<string>;
  monthExtras: Record<string, DayExtra>;
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const allDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const weeks: Date[][] = [];
  let week: Date[] = [];
  allDays.forEach(d => { week.push(d); if (week.length === 7) { weeks.push(week); week = []; } });
  if (week.length) weeks.push(week);

  const weekRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeWeek, setActiveWeek] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (!isSameMonth(currentDate, new Date())) return;
    const todayWeekIdx = weeks.findIndex(w => w.some(d => isSameDay(d, new Date())));
    if (todayWeekIdx >= 0) {
      setActiveWeek(todayWeekIdx);
      setTimeout(() => {
        const el = weekRefs.current[todayWeekIdx];
        if (el && containerRef.current) {
          const containerRect = containerRef.current.getBoundingClientRect();
          const elRect = el.getBoundingClientRect();
          containerRef.current.scrollTo({
            top: containerRef.current.scrollTop + elRect.top - containerRect.top,
            behavior: 'smooth',
          });
        }
      }, 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const idx = weekRefs.current.indexOf(entry.target as HTMLDivElement);
          if (idx >= 0) setActiveWeek(idx);
        }
      });
    }, { root: containerRef.current, threshold: 0.3 });
    weekRefs.current.forEach(ref => { if (ref) observer.observe(ref); });
    return () => observer.disconnect();
  }, [weeks.length]);

  const scrollToDate = (dateStr: string) => {
    const wIdx = weeks.findIndex(w => w.some(d => format(d, 'yyyy-MM-dd') === dateStr));
    if (wIdx >= 0) {
      const el = weekRefs.current[wIdx];
      if (el && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        containerRef.current.scrollTo({
          top: containerRef.current.scrollTop + elRect.top - containerRect.top,
          behavior: 'smooth',
        });
      }
    }
  };

  const weekDayLabels = ['一', '二', '三', '四', '五', '六', '日'];

  const filtered = (evs: EventItem[]) => evs.filter(e =>
    (filterCategory === 'all' || e.category === filterCategory) &&
    (!filterPriority || e.priority === filterPriority)
  );

  return (
    <div className="flex flex-col h-full">
      {/* 周快速切换 */}
      <div className="flex gap-1 px-3 py-1.5 border-b border-border overflow-x-auto shrink-0">
        {weeks.map((w, i) => {
          const hasToday = w.some(d => isSameDay(d, new Date()) && isSameMonth(d, currentDate));
          return (
            <button key={i} onClick={() => {
              setActiveWeek(i);
              const el = weekRefs.current[i];
              if (el && containerRef.current) {
                const containerRect = containerRef.current.getBoundingClientRect();
                const elRect = el.getBoundingClientRect();
                containerRef.current.scrollTo({
                  top: containerRef.current.scrollTop + elRect.top - containerRect.top,
                  behavior: 'smooth',
                });
              }
            }}
              className={`px-2 py-0.5 rounded-sm text-[11px] font-medium transition-colors whitespace-nowrap ${
                activeWeek === i ? 'bg-primary text-primary-foreground' : hasToday ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}>
              第{i + 1}周
            </button>
          );
        })}
      </div>

      {/* 周列表 */}
      <div ref={containerRef} className="flex-1 overflow-y-auto min-h-0 px-3 pb-8">
        {weeks.map((week, wi) => (
          <div key={wi} ref={el => { weekRefs.current[wi] = el; }} className="mb-3">
            <div className="text-[11px] text-muted-foreground font-medium mb-1">第{wi + 1}周</div>
            {week.filter(d => isSameMonth(d, currentDate)).map(d => {
              const dateStr = format(d, 'yyyy-MM-dd');
              const dow = getDay(d);
              const workday = isWorkday(d);
              const dayEvs = filtered(events.filter(e => e.date === dateStr)).sort((a, b) => (a.sort_order || '').localeCompare(b.sort_order || ''));

              return (
                <div key={dateStr}
                  className={`mb-1.5 rounded border ${
                    isToday(d)
                      ? 'border-primary shadow-sm ring-1 ring-primary/20'
                      : 'border-border'
                  } ${!workday ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-800/30' : 'bg-card'}`}
                  onTouchStart={() => handleLongPressStart(dateStr)}
                  onTouchEnd={handleLongPressEnd}
                  onTouchCancel={handleLongPressEnd}
                  onContextMenu={e => e.preventDefault()}>
                  <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-border cursor-pointer hover:bg-accent/50 transition-colors"
                       onClick={() => openNewEvent(dateStr)}>
                    <span className={`text-sm font-semibold tabular-nums ${
                      isToday(d) ? 'bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs' : 'text-foreground'
                    }`}>
                      {format(d, 'd')}
                    </span>
                    <span className={`text-[11px] ${workday ? 'text-muted-foreground' : 'text-amber-600 dark:text-amber-400'}`}>
                      {weekDayLabels[dow === 0 ? 6 : dow - 1]}
                    </span>
                    {!workday && <span className="text-[10px] text-amber-600 dark:text-amber-400">休</span>}
                    {monthExtras[dateStr]?.holiday && (
                      <span className="text-[10px] text-red-500 dark:text-red-400 font-medium">{monthExtras[dateStr].holiday}</span>
                    )}
                    {!monthExtras[dateStr]?.holiday && monthExtras[dateStr]?.jieqi && (
                      <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">{monthExtras[dateStr].jieqi}</span>
                    )}
                    <div className="flex-1" />
                    {dayEvs.length >= 1 && (
                      <button onClick={e => { e.stopPropagation(); openSortDialog(dateStr); }} className="text-muted-foreground hover:text-foreground text-xs p-1" title="排序">☰</button>
                    )}
                    <span className="text-primary/50 text-base font-light leading-none">+</span>
                  </div>
                  {dayEvs.length > 0 && (
                    <div className="px-2.5 py-1 space-y-0.5">
                      {dayEvs.map(ev => (
                        <div key={ev.id} onClick={() => openEditEvent(ev)}
                          className={`flex items-center gap-1.5 py-0.5 cursor-pointer group rounded-sm px-1 transition-colors hover:bg-accent ${CATEGORY_CONFIG[ev.category].bg}`}>
                          <span className={`w-1.5 self-stretch rounded-sm shrink-0 ${CATEGORY_CONFIG[ev.category].sidebar}`} />
                          <span className="text-xs truncate flex-1">
                            {ev.title}
                          </span>
                          <PriorityBadge priority={ev.priority} compact />
                          {ev.task_id && (
                            <span className="text-[9px] text-muted-foreground truncate max-w-[60px]">◆ {ev.task_title}</span>
                          )}
                          {ev.status === 'completed' && <span className="text-[10px] text-primary shrink-0">✓</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* 下个月 */}
        <button onClick={() => {}} className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
          → 下个月
        </button>

        {/* 回到顶部 */}
        <button onClick={() => containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-4 right-4 z-30 bg-card border border-border rounded-sm px-3 py-1.5 text-xs text-muted-foreground shadow-sm hover:text-foreground transition-colors">
          ↑ 顶部
        </button>
      </div>
    </div>
  );
}

/* ─── 主组件 ─── */
export default function CalendarPage() {
  const { user, getToken, logout, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [filterPriority, setFilterPriority] = useState<EventPriority | null>(null);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  // 事项弹窗
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formCategory, setFormCategory] = useState<EventCategory>('work');
  const [formStatus, setFormStatus] = useState<EventStatus>('not_started');
  const [formPriority, setFormPriority] = useState<EventPriority>('normal');
  const [formTaskId, setFormTaskId] = useState<string | null>(null);

  // 排序弹窗
  const [sortDialogDate, setSortDialogDate] = useState('');
  const [sortDialogOpen, setSortDialogOpen] = useState(false);

  // 可用任务 & 最近选择
  const [availableTasks, setAvailableTasks] = useState<TaskItem[]>([]);
  const [lastSelectedTaskId, setLastSelectedTaskId] = useState<string | null>(null);

  // 日期设置
  const [dateSettings, setDateSettings] = useState<Record<string, string>>({});
  const [dateSettingDialogOpen, setDateSettingDialogOpen] = useState(false);
  const [dateSettingDate, setDateSettingDate] = useState('');
  const [dateSettingType, setDateSettingType] = useState<'workday' | 'restday'>('workday');
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressDateRef = useRef('');
  const longPressTriggered = useRef(false);

  // 模块切换
  const [activeModule, setActiveModule] = useState<'schedule' | 'tasks'>('schedule');

  // 导入导出
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors?: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getToken]);

  const yearMonth = format(currentDate, 'yyyy-MM');

  const fetchEvents = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/events?month=${yearMonth}`, {
        credentials: 'include',
        headers: { ...getAuthHeaders() },
      });
      const json = await res.json();
      if (json.data) setEvents(json.data);
    } catch (err) {
      console.error('获取事项失败:', err);
    } finally {
      setLoading(false);
    }
  }, [yearMonth, getToken, getAuthHeaders]);

  const fetchDateSettings = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`/api/date-settings?month=${yearMonth}`, {
        credentials: 'include',
        headers: { ...getAuthHeaders() },
      });
      const json = await res.json();
      if (json.data) {
        if (typeof json.data === 'object' && !Array.isArray(json.data)) {
          setDateSettings(json.data as Record<string, string>);
        } else {
          const map: Record<string, string> = {};
          (json.data as { date: string; day_type: string }[]).forEach((s) => { map[s.date] = s.day_type; });
          setDateSettings(map);
        }
      }
    } catch (err) {
      console.error('获取日期设置失败:', err);
    }
  }, [yearMonth, getToken, getAuthHeaders]);

  const fetchAvailableTasks = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch('/api/tasks', {
        credentials: 'include',
        headers: { ...getAuthHeaders() },
      });
      const json = await res.json();
      if (json.data) setAvailableTasks(json.data.filter((t: TaskItem) => t.status !== 'completed'));
    } catch (err) {
      console.error('获取任务失败:', err);
    }
  }, [getToken, getAuthHeaders]);

  useEffect(() => {
    let mounted = true;
    if (user && mounted) { fetchEvents(); fetchDateSettings(); fetchAvailableTasks(); }
    return () => { mounted = false; };
  }, [fetchEvents, fetchDateSettings, fetchAvailableTasks, user]);

  const isWorkday = useCallback((d: Date) => {
    const dateStr = format(d, 'yyyy-MM-dd');
    if (dateSettings[dateStr]) return dateSettings[dateStr] === 'workday';
    const dow = getDay(d);
    return dow >= 1 && dow <= 5;
  }, [dateSettings]);

  const handleLongPressStart = useCallback((dateStr: string) => {
    longPressTriggered.current = false;
    longPressDateRef.current = dateStr;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      const d = parseISO(dateStr);
      const workday = isWorkday(d);
      setDateSettingDate(dateStr);
      setDateSettingType(workday ? 'workday' : 'restday');
      setDateSettingDialogOpen(true);
    }, 500);
  }, [isWorkday]);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  }, []);

  const saveDateSetting = async () => {
    await fetch('/api/date-settings', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ date: dateSettingDate, day_type: dateSettingType }),
    });
    setDateSettingDialogOpen(false);
    fetchDateSettings();
  };

  const deleteDateSetting = async () => {
    await fetch(`/api/date-settings?date=${dateSettingDate}`, {
      method: 'DELETE', credentials: 'include', headers: { ...getAuthHeaders() },
    });
    setDateSettingDialogOpen(false);
    fetchDateSettings();
  };

  /* ─── 事项操作 ─── */
  const openNewEvent = (dateStr: string) => {
    if (longPressTriggered.current) { longPressTriggered.current = false; return; }
    setEditingEvent(null);
    setFormTitle(''); setFormDescription(''); setFormDate(dateStr);
    setFormCategory(filterCategory === 'life' ? 'life' : 'work');
    setFormStatus('not_started'); setFormPriority('normal');
    setFormTaskId(null);
    setDialogOpen(true);
  };

  const openEditEvent = (ev: EventItem) => {
    setEditingEvent(ev);
    setFormTitle(ev.title); setFormDescription(ev.description || ''); setFormDate(ev.date);
    setFormCategory(ev.category); setFormStatus(ev.status); setFormPriority(ev.priority);
    setFormTaskId(ev.task_id || null);
    if (ev.task_id) setLastSelectedTaskId(ev.task_id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const isNew = !editingEvent;
    const body = { title: formTitle, description: formDescription || undefined, date: formDate, category: formCategory, status: formStatus, priority: formPriority, task_id: formTaskId || undefined };
    const url = editingEvent ? `/api/events/${editingEvent.id}` : '/api/events';
    const method = editingEvent ? 'PUT' : 'POST';
    await fetch(url, { method, credentials: 'include', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, body: JSON.stringify(body) });
    setDialogOpen(false);
    fetchEvents();
  };

  const handleDelete = async () => {
    if (!editingEvent) return;
    await fetch(`/api/events/${editingEvent.id}`, { method: 'DELETE', credentials: 'include', headers: { ...getAuthHeaders() } });
    setDialogOpen(false);
    fetchEvents();
  };

  /* ─── 导入导出 ─── */
  const handleExport = async () => {
    try {
      const res = await fetch('/api/events/export', { credentials: 'include', headers: { ...getAuthHeaders() } });
      if (!res.ok) throw new Error('导出失败');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // 从响应头获取文件名，否则用默认名
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      a.download = match ? match[1] : 'events_export.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : '导出失败');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/events/template');
      if (!res.ok) throw new Error('下载模板失败');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'events_template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : '下载模板失败');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/events/import', {
        method: 'POST',
        credentials: 'include',
        headers: { ...getAuthHeaders() },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '导入失败');
      setImportResult(data);
      if (data.imported > 0) fetchEvents();
    } catch (err) {
      alert(err instanceof Error ? err.message : '导入失败');
    } finally {
      setImporting(false);
      // reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /* ─── 节气节日 ─── */
  const monthExtras = useMemo(() => getMonthExtras(currentDate.getFullYear(), currentDate.getMonth() + 1), [currentDate]);

  /* ─── 筛选逻辑 ─── */
  const categoryFilteredEvents = useMemo(() => events.filter(e => filterCategory === 'all' || e.category === filterCategory), [events, filterCategory]);
  const filteredEvents = useMemo(() => categoryFilteredEvents.filter(e => !filterPriority || e.priority === filterPriority), [categoryFilteredEvents, filterPriority]);

  const toggleExpand = (dateStr: string) => {
    setExpandedDates(prev => { const n = new Set(prev); n.has(dateStr) ? n.delete(dateStr) : n.add(dateStr); return n; });
  };

  const isFiltered = filterCategory !== 'all' || filterPriority !== null;

  const sortedTasks = useMemo(() => {
    const sorted = [...availableTasks];
    if (lastSelectedTaskId) {
      const idx = sorted.findIndex(t => t.id === lastSelectedTaskId);
      if (idx > 0) { const [item] = sorted.splice(idx, 1); sorted.unshift(item); }
    }
    sorted.sort((a, b) => {
      if (lastSelectedTaskId && a.id === lastSelectedTaskId) return -1;
      if (lastSelectedTaskId && b.id === lastSelectedTaskId) return 1;
      const so: Record<string, number> = { in_progress: 0, not_started: 1, completed: 2 };
      const diff = (so[a.status] || 0) - (so[b.status] || 0);
      if (diff !== 0) return diff;
      return (a.planned_end_date || '').localeCompare(b.planned_end_date || '');
    });
    return sorted;
  }, [availableTasks, lastSelectedTaskId]);

  /* ─── 日历数据 ─── */
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calStart, end: calEnd });
  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToday = () => setCurrentDate(new Date());

  const showWork = filterCategory === 'all' || filterCategory === 'work';
  const showLife = filterCategory === 'all' || filterCategory === 'life';

  /* ─── 未登录 ─── */
  if (authLoading) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground font-[family-name:var(--font-lora)]">加载中…</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-dvh flex flex-col bg-background text-foreground overflow-hidden">
        {/* ─── 顶栏 ─── */}
        <header className="shrink-0 border-b border-border bg-card">
          <div className="flex items-center justify-between px-3 py-2">
            {/* 左：模块切换 */}
            <div className="flex items-center rounded border border-border overflow-hidden">
              <button onClick={() => setActiveModule('schedule')}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  activeModule === 'schedule' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}>
                {isMobile ? '日程' : '日程管理'}
              </button>
              <button onClick={() => setActiveModule('tasks')}
                className={`px-3 py-1 text-xs font-medium transition-colors border-l border-border ${
                  activeModule === 'tasks' ? 'bg-amber-600 text-white' : 'text-muted-foreground hover:text-foreground'
                }`}>
                {isMobile ? '任务' : '任务面板'}
              </button>
            </div>

            {/* 右：主题切换 + 用户 */}
            <div className="flex items-center gap-2">
              <button onClick={toggleTheme} className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" title="切换主题">
                {theme === 'dark' ? '☀' : '☾'}
              </button>
              {isMobile && (
                <button onClick={goToday} className="text-[11px] text-primary hover:underline">今天</button>
              )}
              <button onClick={() => setProfileOpen(true)} className="w-7 h-7 rounded-full bg-muted overflow-hidden">
                {user.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-xs">{user.nickname?.[0] || '?'}</span>}
              </button>
              <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
              <SearchDialog
                open={searchOpen}
                onOpenChange={setSearchOpen}
                onEditEvent={openEditEvent}
                availableTasks={availableTasks}
                onRefresh={fetchEvents}
              />
            </div>
          </div>
        </header>

        {/* ─── 内容 ─── */}
        {activeModule === 'tasks' ? (
          <TaskPanel onTasksChange={fetchAvailableTasks} />
        ) : (
          <div className="flex-1 flex flex-col min-h-0 max-w-[1600px] w-full mx-auto">
            {/* 月份导航 + 统计 */}
            <div className="shrink-0 px-3 pt-3 pb-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {/* 月份标题 + 箭头 */}
                <button onClick={prevMonth} className="p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">‹</button>
                <div className="flex items-baseline gap-1">
                  <span className={`font-semibold tabular-nums ${isMobile ? 'text-sm' : 'text-xl'}`}>
                    {format(currentDate, 'yyyy年')}
                  </span>
                  <span className={`font-semibold tabular-nums ${isMobile ? 'text-sm' : 'text-xl'}`}>
                    {format(currentDate, 'M月')}
                  </span>
                </div>
                <button onClick={nextMonth} className="p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">›</button>
                {!isMobile && (
                  <button onClick={goToday} className="text-xs text-primary hover:underline ml-1">今天</button>
                )}
                <div className="flex-1" />
                {/* 筛选按钮 */}
                <div className="flex rounded border border-border overflow-hidden">
                  {(['all', 'work', 'life'] as FilterCategory[]).map(f => (
                    <button key={f} onClick={() => { setFilterCategory(f); setFilterPriority(null); }}
                      className={`px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                        f !== 'all' ? 'border-l border-border' : ''
                      } ${
                        filterCategory === f
                          ? f === 'work' ? 'bg-[var(--work-active-bg)] text-[var(--work-active-color)]' : f === 'life' ? 'bg-[var(--life-active-bg)] text-[var(--life-active-color)]' : 'bg-foreground text-background'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}>
                      {f === 'all' ? '全部' : f === 'work' ? '工作' : '生活'}
                    </button>
                  ))}
                </div>
                {/* 搜索 */}
                <button
                  onClick={() => setSearchOpen(true)}
                  className="p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors border border-border px-2"
                  title="搜索事项"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </button>
                {/* 导入导出 */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-[11px] border border-border px-2" title="导入导出">
                      ⋮
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem onClick={handleDownloadTemplate}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 shrink-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/></svg>下载模板
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExport}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 shrink-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="12" x2="12" y2="18"/><polyline points="9 15 12 12 15 15"/></svg>导出事项
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => fileInputRef.current?.click()} disabled={importing}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 shrink-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/></svg>{importing ? '导入中...' : '导入事项'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
              </div>
              {/* 统计栏 */}
              <div className="flex gap-2">
                {showWork && <StatsBar category="work" events={categoryFilteredEvents} filterPriority={filterPriority} onPriorityClick={p => setFilterPriority(prev => prev === p ? null : p)} />}
                {showLife && <StatsBar category="life" events={categoryFilteredEvents} filterPriority={filterPriority} onPriorityClick={p => setFilterPriority(prev => prev === p ? null : p)} />}
              </div>
            </div>

            {/* 日历主体 */}
            {isMobile ? (
              <MobileWeekView currentDate={currentDate} events={events} filterCategory={filterCategory} filterPriority={filterPriority}
                expandedDates={expandedDates} dateSettings={dateSettings}
                toggleExpand={toggleExpand} openNewEvent={openNewEvent} openEditEvent={openEditEvent}
                openSortDialog={(d: string) => { setSortDialogDate(d); setSortDialogOpen(true); }}
                isWorkday={isWorkday} handleLongPressStart={handleLongPressStart} handleLongPressEnd={handleLongPressEnd} longPressDateRef={longPressDateRef} monthExtras={monthExtras} />
            ) : (
              /* PC 月历 */
              <div className="flex-1 overflow-y-auto min-h-0 px-3 pb-3">
                {/* 星期头 */}
                <div className="grid grid-cols-7 border-b border-border mb-0.5">
                  {weekDays.map((w, i) => (
                    <div key={i} className={`text-center text-[11px] font-medium py-1 ${i >= 5 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>{w}</div>
                  ))}
                </div>
                {/* 日期格子 */}
                <div className="grid grid-cols-7 gap-px bg-border">
                  {calendarDays.map(d => {
                    const dateStr = format(d, 'yyyy-MM-dd');
                    const inMonth = isSameMonth(d, currentDate);
                    const workday = isWorkday(d);
                    const today = isToday(d);
                    const dayEvs = filteredEvents.filter(e => e.date === dateStr).sort((a, b) => (a.sort_order || '').localeCompare(b.sort_order || ''));
                    const isExpanded = expandedDates.has(dateStr);
                    const showCount = 2;
                    const visibleEvs = isExpanded ? dayEvs : dayEvs.slice(0, showCount);
                    const hiddenCount = dayEvs.length - showCount;

                    return (
                      <div key={dateStr}
                        className={`group min-h-[80px] p-1.5 cursor-pointer transition-colors hover:bg-accent/50 ${
                          today ? 'ring-1 ring-primary/30 shadow-sm' : ''
                        } ${!inMonth ? 'opacity-30 bg-card' : !workday ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-card'}`}
                        onClick={() => openNewEvent(dateStr)}
                        onMouseDown={() => handleLongPressStart(dateStr)}
                        onMouseUp={handleLongPressEnd}
                        onMouseLeave={() => handleLongPressEnd()}>
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className={`text-sm tabular-nums font-medium ${
                            today ? 'bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs' :
                            !workday ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'
                          }`}>{format(d, 'd')}</span>
                          {!workday && inMonth && <span className="text-[11px] text-amber-600 dark:text-amber-400">休</span>}
                          {inMonth && monthExtras[dateStr]?.holiday && (
                            <span className="text-[11px] text-red-500 dark:text-red-400 font-medium truncate">{monthExtras[dateStr].holiday}</span>
                          )}
                          {inMonth && !monthExtras[dateStr]?.holiday && monthExtras[dateStr]?.jieqi && (
                            <span className="text-[11px] text-teal-600 dark:text-teal-400 font-medium truncate">{monthExtras[dateStr].jieqi}</span>
                          )}
                          <div className="flex-1" />
                          {dayEvs.length >= 1 && inMonth && (
                            <button onClick={e => { e.stopPropagation(); setSortDialogDate(dateStr); setSortDialogOpen(true); }}
                              className="text-muted-foreground hover:text-foreground text-[10px] p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">☰</button>
                          )}
                          {inMonth && (
                            <button onClick={e => { e.stopPropagation(); openNewEvent(dateStr); }}
                              className="text-muted-foreground hover:text-primary text-[11px] p-0.5 opacity-0 group-hover:opacity-100 transition-opacity font-light">+</button>
                          )}
                        </div>
                        <div className="space-y-px">
                          {visibleEvs.map(ev => (
                            <Tooltip key={ev.id}>
                              <TooltipTrigger asChild>
                                <div onClick={e => { e.stopPropagation(); openEditEvent(ev); }}
                                  className={`flex items-center gap-1 px-1 py-px rounded-sm text-[11px] cursor-pointer transition-colors hover:bg-accent ${CATEGORY_CONFIG[ev.category].bg}`}>
                                  <span className={`w-1 self-stretch rounded-sm shrink-0 ${CATEGORY_CONFIG[ev.category].sidebar}`} />
                                  <span className="truncate">{ev.title}</span>
                                  <PriorityBadge priority={ev.priority} compact />
                                  {ev.task_id && <span className="text-[9px] text-violet-500 dark:text-violet-400 shrink-0">◆</span>}
                                  {ev.status === 'completed' && <span className="text-[10px] text-primary shrink-0 ml-auto">✓</span>}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                {ev.title}{ev.task_title ? ` · ${ev.task_title}` : ''}
                              </TooltipContent>
                            </Tooltip>
                          ))}
                          {!isExpanded && hiddenCount > 0 && (
                            <button onClick={e => { e.stopPropagation(); toggleExpand(dateStr); }}
                              className="text-[10px] text-primary hover:underline">+{hiddenCount}</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── 筛选重置 ─── */}
        {isFiltered && activeModule === 'schedule' && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30">
            <button onClick={() => { setFilterCategory('all'); setFilterPriority(null); }}
              className="bg-card border border-border rounded-sm px-4 py-1.5 text-xs text-foreground shadow-md hover:bg-accent transition-colors">
              显示全部
            </button>
          </div>
        )}

        {/* 导入结果通知 */}
        {importResult && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 w-80">
            <div className="bg-card border border-border rounded-sm shadow-lg p-4 text-xs">
              <div className="font-medium mb-2">导入完成</div>
              <div className="text-muted-foreground">
                成功导入 {importResult.imported} 条事项
                {importResult.skipped > 0 && `，跳过 ${importResult.skipped} 条`}
              </div>
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="mt-2 text-red-500 space-y-0.5 max-h-24 overflow-y-auto">
                  {importResult.errors.map((e, i) => <div key={i}>{e}</div>)}
                </div>
              )}
              <button onClick={() => setImportResult(null)}
                className="w-full mt-3 py-2 rounded-sm bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
                确定
              </button>
            </div>
          </div>
        )}

        {/* ─── 事项弹窗 ─── */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[440px]">
            <DialogHeader>
              <DialogTitle>{editingEvent ? '编辑事项' : '添加事项'}</DialogTitle>
              <DialogDescription>{formDate}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {/* 关联任务 */}
              {sortedTasks.length > 0 && (
                <div>
                  <Label className="text-[11px] text-muted-foreground">关联任务</Label>
                  <Select value={formTaskId || '_none'} onValueChange={v => {
                    const val = v === '_none' ? null : v;
                    setFormTaskId(val);
                    if (val && !editingEvent && !formTitle) {
                      const task = availableTasks.find(t => t.id === val);
                      if (task) setFormTitle(task.title);
                    }
                    if (val) setLastSelectedTaskId(val);
                  }}>
                    <SelectTrigger className="w-full h-9 mt-0.5"><SelectValue placeholder="不关联任务" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">不关联任务</SelectItem>
                      {sortedTasks.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label className="text-[11px] text-muted-foreground">标题</Label>
                <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} className="h-9 mt-0.5" placeholder="事项标题" />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">描述</Label>
                <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} className="mt-0.5 min-h-[60px]" placeholder="可选" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] text-muted-foreground">类别</Label>
                  <div className="flex gap-1.5 mt-0.5">
                    {(['work', 'life'] as EventCategory[]).map(c => (
                      <button key={c} type="button" onClick={() => setFormCategory(c)}
                        className={`flex-1 py-1.5 rounded-sm text-xs font-medium transition-colors border ${
                          formCategory === c
                            ? `${CATEGORY_CONFIG[c].activeBg} ${CATEGORY_CONFIG[c].activeColor} ${CATEGORY_CONFIG[c].activeBorder}`
                            : 'border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {CATEGORY_CONFIG[c].label}
                      </button>
                    ))}
                  </div>
                </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">状态</Label>
                <div className="flex gap-1.5 mt-0.5">
                  {(['not_started', 'in_progress', 'completed'] as EventStatus[]).map(s => (
                    <button key={s} type="button" onClick={() => setFormStatus(s)}
                      className={`flex-1 py-1.5 rounded-sm text-xs font-medium transition-colors border ${
                        formStatus === s
                          ? `${STATUS_CONFIG[s].activeBg} ${STATUS_CONFIG[s].activeColor} ${STATUS_CONFIG[s].activeBorder}`
                          : 'border-border text-muted-foreground hover:text-foreground'
                      }`}>
                      {STATUS_CONFIG[s].label}
                    </button>
                  ))}
                </div>
              </div>
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">优先级</Label>
                <div className="flex gap-1.5 mt-0.5">
                  {(['normal', 'important', 'urgent'] as EventPriority[]).map(p => (
                    <button key={p} onClick={() => setFormPriority(p)}
                      className={`flex-1 py-1.5 rounded-sm text-xs font-medium transition-colors border ${
                        formPriority === p
                          ? `${PRIORITY_CONFIG[p].activeBg} ${PRIORITY_CONFIG[p].activeColor} ${PRIORITY_CONFIG[p].activeBorder}`
                          : 'border-border text-muted-foreground hover:text-foreground'
                      }`}>
                      {PRIORITY_CONFIG[p].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              {editingEvent && (
                <Button variant="destructive" onClick={handleDelete} className="mr-auto">删除</Button>
              )}
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleSave} disabled={!formTitle.trim()}>保存</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ─── 排序弹窗 ─── */}
        <SortDialog open={sortDialogOpen} onClose={() => setSortDialogOpen(false)}
          date={sortDialogDate} events={filteredEvents.filter(e => e.date === sortDialogDate)} onReorder={fetchEvents} />

        {/* ─── 日期设置弹窗 ─── */}
        <Dialog open={dateSettingDialogOpen} onOpenChange={setDateSettingDialogOpen}>
          <DialogContent className="sm:max-w-[320px]">
            <DialogHeader>
              <DialogTitle>日期设置</DialogTitle>
              <DialogDescription>{dateSettingDate}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label className="text-xs">将该日期设为</Label>
              <div className="flex gap-2">
                <button onClick={() => setDateSettingType('workday')}
                  className={`flex-1 py-2 rounded-sm text-sm font-medium border transition-colors ${
                    dateSettingType === 'workday' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'
                  }`}>工作日</button>
                <button onClick={() => setDateSettingType('restday')}
                  className={`flex-1 py-2 rounded-sm text-sm font-medium border transition-colors ${
                    dateSettingType === 'restday' ? 'bg-amber-600 text-white border-amber-600' : 'border-border text-muted-foreground'
                  }`}>休息日</button>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              {dateSettings[dateSettingDate] && (
                <Button variant="outline" onClick={deleteDateSetting} className="mr-auto text-xs">恢复默认</Button>
              )}
              <Button variant="outline" onClick={() => setDateSettingDialogOpen(false)}>取消</Button>
              <Button onClick={saveDateSetting}>保存</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
