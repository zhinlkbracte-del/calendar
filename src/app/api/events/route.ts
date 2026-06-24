import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';

export interface EventItem {
  id: string;
  title: string;
  description: string | null;
  date: string;
  category: 'work' | 'life';
  status: 'not_started' | 'in_progress' | 'completed';
  priority: 'urgent' | 'important' | 'normal';
  sort_order: string | null;
  task_id: string | null;
  task_title?: string;
  duration: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string | null;
}

function getUserId(request: NextRequest): string | null {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const yearMonth = searchParams.get('month');

  if (!yearMonth || (!/^\d{4}-\d{2}$/.test(yearMonth) && yearMonth !== 'all')) {
    return NextResponse.json({ error: '月份参数格式错误，请使用 YYYY-MM 格式或 all' }, { status: 400 });
  }

  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const client = getSupabaseClient();

    let query = client
      .from('events')
      .select('id, title, description, date, category, status, priority, sort_order, task_id, duration, user_id, created_at, updated_at')
      .eq('user_id', userId);

    if (yearMonth !== 'all') {
      const startDate = `${yearMonth}-01`;
      const [year, month] = yearMonth.split('-').map(Number);
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
      query = query.gte('date', startDate).lt('date', endDate);
    }

    const { data, error } = await query
      .order('date', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw new Error(`查询失败: ${error.message}`);

    // Fetch task titles for events with task_id
    const eventsWithTask = (data as EventItem[]).filter(e => e.task_id);
    const taskIds = [...new Set(eventsWithTask.map(e => e.task_id!))];
    let taskTitleMap: Record<string, string> = {};
    if (taskIds.length > 0) {
      const { data: tasks } = await client
        .from('tasks')
        .select('id, title')
        .in('id', taskIds);
      if (tasks) {
        taskTitleMap = Object.fromEntries(tasks.map(t => [t.id, t.title]));
      }
    }
    const enrichedData = (data as EventItem[]).map(e => ({
      ...e,
      task_title: e.task_id ? (taskTitleMap[e.task_id] || null) : null,
    }));

    return NextResponse.json({ data: enrichedData });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, description, date, category, status, priority, sort_order, task_id, duration } = body;

    if (!title || !date || !category) {
      return NextResponse.json({ error: '缺少必填字段：标题、日期、类别' }, { status: 400 });
    }

    if (!['work', 'life'].includes(category)) {
      return NextResponse.json({ error: '类别无效，必须为"work"或"life"' }, { status: 400 });
    }

    if (status && !['not_started', 'in_progress', 'completed'].includes(status)) {
      return NextResponse.json({ error: '状态值无效' }, { status: 400 });
    }

    if (priority && !['urgent', 'important', 'normal'].includes(priority)) {
      return NextResponse.json({ error: '优先级值无效' }, { status: 400 });
    }

    if (duration !== undefined && duration !== null && duration !== '') {
      const dur = parseFloat(duration);
      if (isNaN(dur) || dur < 0) {
        return NextResponse.json({ error: '消耗时长无效，请输入非负数字' }, { status: 400 });
      }
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('events')
      .insert({
        title,
        description: description || null,
        date,
        category,
        status: status || 'not_started',
        priority: priority || 'normal',
        sort_order: sort_order || null,
        task_id: task_id || null,
        duration: duration || null,
        user_id: userId,
      })
      .select('id, title, description, date, category, status, priority, sort_order, task_id, duration, user_id, created_at, updated_at')
      .maybeSingle();

    if (error) throw new Error(`创建失败: ${error.message}`);

    return NextResponse.json({ data: data as EventItem }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
