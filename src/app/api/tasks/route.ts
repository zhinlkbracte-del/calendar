import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

function getUserId(request: NextRequest): string | null {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

// GET /api/tasks - 获取当前用户的所有任务
export async function GET(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ error: '未登录' }, { status: 401 });

  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('status', { ascending: true })
      .order('planned_end_date', { ascending: true, nullsFirst: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/tasks - 创建新任务
export async function POST(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ error: '未登录' }, { status: 401 });

  try {
    const body = await request.json();
    const { title, start_date, planned_end_date, actual_end_date, delay_status, latest_progress, urgency_type, status } = body;

    if (!title?.trim()) return NextResponse.json({ error: '任务标题不能为空' }, { status: 400 });

    const validStatuses = ['not_started', 'in_progress', 'completed'];
    const validUrgencies = ['urgent_important', 'urgent_not_important', 'important_not_urgent', 'not_important_not_urgent'];
    const validDelays = ['normal', 'delayed'];

    if (status && !validStatuses.includes(status)) return NextResponse.json({ error: '无效状态' }, { status: 400 });
    if (urgency_type && !validUrgencies.includes(urgency_type)) return NextResponse.json({ error: '无效紧急程度' }, { status: 400 });
    if (delay_status && !validDelays.includes(delay_status)) return NextResponse.json({ error: '无效延期状态' }, { status: 400 });

    const insertData: Record<string, unknown> = {
      id: crypto.randomUUID(),
      title: title.trim(),
      start_date: start_date || null,
      planned_end_date: planned_end_date || null,
      actual_end_date: actual_end_date || null,
      delay_status: delay_status || 'normal',
      latest_progress: latest_progress?.trim() || null,
      urgency_type: urgency_type || 'not_important_not_urgent',
      status: status || 'not_started',
      user_id: userId,
    };

    const client = getSupabaseClient();
    const { data, error } = await client.from('tasks').insert(insertData).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
