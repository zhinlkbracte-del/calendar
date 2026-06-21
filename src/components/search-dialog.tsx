'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { EventItem, EventCategory, TaskItem } from '@/lib/types';
import { CATEGORY_CONFIG, STATUS_CONFIG, PRIORITY_CONFIG } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditEvent: (ev: EventItem) => void;
  availableTasks: TaskItem[];
  onRefresh: () => void;
}

export function SearchDialog({ open, onOpenChange, onEditEvent, availableTasks, onRefresh }: SearchDialogProps) {
  const { getToken } = useAuth();
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<EventItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageSize] = useState(20);
  const [searching, setSearching] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);
  const [batchTaskId, setBatchTaskId] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const searchedRef = useRef(false);

  // 搜索
  const doSearch = useCallback(async (q: string, p: number = 1) => {
    if (!q.trim()) {
      setResults([]);
      setTotal(0);
      setTotalPages(0);
      setPage(1);
      searchedRef.current = false;
      return;
    }
    setSearching(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/events/search?q=${encodeURIComponent(q.trim())}&page=${p}&pageSize=${pageSize}`, {
        credentials: 'include',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const json = await res.json();
      if (json.data) {
        setResults(json.data);
        setTotal(json.total || 0);
        setPage(json.page || 1);
        setTotalPages(json.totalPages || 0);
        searchedRef.current = true;
      }
    } catch {
      // ignore
    } finally {
      setSearching(false);
    }
  }, [getToken, pageSize]);

  // 翻页
  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages) return;
    setSelectedIds(new Set());
    setBatchMode(false);
    doSearch(keyword, p);
  };

  // 防抖搜索（只在关键词变化时触发翻到第一页）
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setPage(1);
    debounceRef.current = setTimeout(() => {
      doSearch(keyword, 1);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [keyword, open, doSearch]);

  // 打开时聚焦输入框
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setKeyword('');
      setResults([]);
      setTotal(0);
      setPage(1);
      setTotalPages(0);
      setSelectedIds(new Set());
      setBatchMode(false);
      setBatchTaskId(null);
      searchedRef.current = false;
    }
  }, [open]);

  // 选择/取消选择
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === results.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(results.map(r => r.id)));
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!confirm(`确定删除选中的 ${count} 条事项吗？此操作不可恢复。`)) return;

    setBatchLoading(true);
    try {
      const token = getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      await Promise.all(
        [...selectedIds].map(id =>
          fetch(`/api/events/${id}`, { method: 'DELETE', credentials: 'include', headers })
        )
      );
      setSelectedIds(new Set());
      setBatchMode(false);
      onRefresh();
      doSearch(keyword, 1);
    } catch {
      alert('批量删除失败，请重试');
    } finally {
      setBatchLoading(false);
    }
  };

  // 批量关联任务
  const handleBatchAssignTask = async () => {
    if (selectedIds.size === 0 || !batchTaskId) return;

    setBatchLoading(true);
    try {
      const token = getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      await Promise.all(
        [...selectedIds].map(id =>
          fetch(`/api/events/${id}`, {
            method: 'PUT',
            credentials: 'include',
            headers,
            body: JSON.stringify({ task_id: batchTaskId }),
          })
        )
      );
      setSelectedIds(new Set());
      setBatchMode(false);
      setBatchTaskId(null);
      onRefresh();
      doSearch(keyword, 1);
    } catch {
      alert('批量关联任务失败，请重试');
    } finally {
      setBatchLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg h-[80vh] flex flex-col p-0 gap-0 overflow-hidden" showCloseButton={false} aria-describedby={undefined}>
        <DialogTitle className="sr-only">搜索事项</DialogTitle>

        {/* 搜索框 + 关闭键同一行 */}
        <div className="px-4 pt-4 pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <Input
                ref={inputRef}
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="搜索事项标题或描述..."
                className="pl-9 h-9"
              />
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="h-9 px-3 text-xs rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors shrink-0"
            >
              关闭
            </button>
          </div>

          {/* 统计 + 多选 + 全选 */}
          {searchedRef.current && (
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <span>共 {total} 条结果</span>
              <div className="flex items-center gap-2">
                {results.length > 0 && (
                  <>
                    <button
                      onClick={() => setBatchMode(!batchMode)}
                      className={`px-2 py-0.5 rounded border transition-colors ${
                        batchMode
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                      }`}
                    >
                      {batchMode ? '取消多选' : '多选'}
                    </button>
                    {batchMode && (
                      <button onClick={selectAll} className="text-primary hover:underline">
                        {selectedIds.size === results.length ? '取消全选' : '全选'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 结果列表 */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
          <div className="px-4 py-2">
            {searching && (
              <div className="py-8 text-center text-muted-foreground text-sm">搜索中...</div>
            )}

            {!searching && keyword.trim() && results.length === 0 && searchedRef.current && (
              <div className="py-8 text-center text-muted-foreground text-sm">未找到匹配的事项</div>
            )}

            {!searching && !keyword.trim() && (
              <div className="py-8 text-center text-muted-foreground text-sm">输入关键词搜索事项</div>
            )}

            {results.map(ev => {
              const catCfg = CATEGORY_CONFIG[ev.category];
              const statusCfg = STATUS_CONFIG[ev.status];
              const priCfg = PRIORITY_CONFIG[ev.priority];

              return (
                <div
                  key={ev.id}
                  className={`flex items-start gap-2.5 py-2.5 border-b border-border/50 last:border-0 cursor-pointer group ${
                    selectedIds.has(ev.id) ? 'bg-primary/5' : 'hover:bg-muted/30'
                  }`}
                  onClick={() => {
                    if (batchMode) {
                      toggleSelect(ev.id);
                    } else {
                      onEditEvent(ev);
                    }
                  }}
                >
                  {/* 多选复选框 */}
                  {batchMode && (
                    <Checkbox
                      checked={selectedIds.has(ev.id)}
                      onCheckedChange={() => toggleSelect(ev.id)}
                      className="mt-1 shrink-0"
                      onClick={e => e.stopPropagation()}
                    />
                  )}

                  {/* 类别侧栏 */}
                  <div className={`w-1 self-stretch rounded-full shrink-0 ${catCfg.sidebar}`} />

                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate">{ev.title}</span>
                      <span className={`text-[10px] px-1 py-0 rounded ${priCfg.bg} ${priCfg.color}`}>
                        {priCfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{formatDate(ev.date)}</span>
                      <span className={`text-[10px] px-1 py-0 rounded ${statusCfg.bg} ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                      {ev.task_title && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1 gap-0.5">
                          <span className="text-[8px]">◆</span>{ev.task_title}
                        </Badge>
                      )}
                    </div>
                    {ev.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{ev.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          </ScrollArea>
        </div>

        {/* 分页 */}
        {totalPages > 1 && !searching && (
          <div className="px-4 py-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>第 {page}/{totalPages} 页（共 {total} 条）</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="h-7 px-2.5 rounded border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                上一页
              </button>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="h-7 px-2.5 rounded border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                下一页
              </button>
            </div>
          </div>
        )}

        {/* 批量操作栏 */}
        {batchMode && selectedIds.size > 0 && (
          <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">已选 {selectedIds.size} 项</span>

            {/* 关联任务 */}
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <select
                value={batchTaskId || ''}
                onChange={e => setBatchTaskId(e.target.value || null)}
                className="h-7 text-xs border border-border rounded px-1.5 bg-background max-w-[140px] truncate"
              >
                <option value="">关联任务...</option>
                {availableTasks
                  .filter(t => t.status !== 'completed')
                  .map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
              </select>
              <button
                onClick={handleBatchAssignTask}
                disabled={!batchTaskId || batchLoading}
                className="h-7 px-2.5 text-xs rounded border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >
                关联
              </button>
            </div>

            {/* 删除 */}
            <button
              onClick={handleBatchDelete}
              disabled={batchLoading}
              className="h-7 px-2.5 text-xs rounded bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              删除
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
