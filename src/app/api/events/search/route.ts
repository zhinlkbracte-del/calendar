import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const keyword = searchParams.get('q')?.trim();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));

  if (!keyword) {
    return NextResponse.json({ data: [], total: 0, page: 1, pageSize, totalPages: 0 });
  }

  const token = getTokenFromRequest(request);
  if (!token) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  const payload = verifyToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const client = getSupabaseClient();
    const likePattern = `%${keyword}%`;
    const userId = payload.userId;

    // 先获取总数
    const { count: totalCount, error: countError } = await client
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .or(`title.ilike.${likePattern},description.ilike.${likePattern}`);

    if (countError) throw new Error(`搜索失败: ${countError.message}`);
    const total = totalCount || 0;
    const totalPages = Math.ceil(total / pageSize);

    // 分页查询
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await client
      .from('events')
      .select('id, title, description, date, category, status, priority, sort_order, task_id, user_id, created_at, updated_at')
      .eq('user_id', userId)
      .or(`title.ilike.${likePattern},description.ilike.${likePattern}`)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw new Error(`搜索失败: ${error.message}`);

    // Fetch task titles
    const eventsWithTask = (data || []).filter((e: { task_id: string | null }) => e.task_id);
    const taskIds = [...new Set(eventsWithTask.map((e: { task_id: string }) => e.task_id))];
    let taskTitleMap: Record<string, string> = {};
    if (taskIds.length > 0) {
      const { data: tasks } = await client
        .from('tasks')
        .select('id, title')
        .in('id', taskIds);
      if (tasks) {
        taskTitleMap = Object.fromEntries(tasks.map((t: { id: string; title: string }) => [t.id, t.title]));
      }
    }

    // 计算匹配度：标题完全匹配>标题包含>描述包含
    const lowerKw = keyword.toLowerCase();
    const scored = (data || []).map((e: Record<string, unknown>) => {
      let score = 0;
      const title = (e.title as string).toLowerCase();
      const desc = (e.description as string || '').toLowerCase();
      if (title === lowerKw) score = 100;
      else if (title.startsWith(lowerKw)) score = 80;
      else if (title.includes(lowerKw)) score = 60;
      if (desc.includes(lowerKw)) score += 20;
      return { ...e, _score: score, task_title: e.task_id ? (taskTitleMap[e.task_id as string] || null) : null };
    });

    // 按匹配度降序，再按时间降序
    scored.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      const scoreDiff = (b._score as number) - (a._score as number);
      if (scoreDiff !== 0) return scoreDiff;
      return (b.date as string).localeCompare(a.date as string);
    });

    // 移除内部 _score 字段
    const results = scored.map(({ _score, ...rest }: Record<string, unknown> & { _score: number }) => rest);

    return NextResponse.json({ data: results, total, page, pageSize, totalPages });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
