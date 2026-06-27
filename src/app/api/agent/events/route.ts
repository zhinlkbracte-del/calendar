import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient, verifyAgentAuth, hasPermission, unauthorizedResponse, forbiddenResponse } from '../_lib';

// GET /api/agent/events?month=YYYY-MM - List events by month
export async function GET(request: NextRequest) {
  const auth = await verifyAgentAuth(request);
  if (!auth) return unauthorizedResponse();
  if (!hasPermission(auth, 'events', 'read')) return forbiddenResponse('无事项查看权限');

  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');
  
  if (!month || (!/^\d{4}-\d{2}$/.test(month) && month !== 'all')) {
    return NextResponse.json({ error: '月份参数格式错误，请使用 YYYY-MM 格式或 all' }, { status: 400 });
  }

  const supabase = getServiceRoleClient();
  let query = supabase
    .from('events')
    .select('id, title, description, date, category, status, priority, sort_order, duration, task_id, reminder_at, reminder_notified, created_at, updated_at')
    .eq('user_id', auth.userId)
    .order('date', { ascending: true })
    .order('sort_order', { ascending: true });

  if (month !== 'all') {
    query = query.like('date', `${month}-%`);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: '查询失败' }, { status: 500 });

  return NextResponse.json({ data, total: data?.length ?? 0 });
}

// POST /api/agent/events - Create event
export async function POST(request: NextRequest) {
  const auth = await verifyAgentAuth(request);
  if (!auth) return unauthorizedResponse();
  if (!hasPermission(auth, 'events', 'create')) return forbiddenResponse('无事项创建权限');

  try {
    const body = await request.json();
    const { title, date, category, status, priority, description, duration, reminder_at } = body;

    if (!title || !date) {
      return NextResponse.json({ error: '标题和日期为必填项' }, { status: 400 });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: '日期格式应为 YYYY-MM-DD' }, { status: 400 });
    }

    const validCategories = ['work', 'life'];
    const validStatuses = ['not_started', 'in_progress', 'completed'];
    const validPriorities = ['urgent', 'important', 'normal'];

    if (category && !validCategories.includes(category)) {
      return NextResponse.json({ error: '类别应为 work 或 life' }, { status: 400 });
    }
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: '状态应为 not_started、in_progress 或 completed' }, { status: 400 });
    }
    if (priority && !validPriorities.includes(priority)) {
      return NextResponse.json({ error: '优先级应为 urgent、important 或 normal' }, { status: 400 });
    }

    // Validate reminder_at
    let reminderAtValue: string | null = null;
    if (reminder_at) {
      const reminderDate = new Date(reminder_at);
      if (isNaN(reminderDate.getTime())) {
        return NextResponse.json({ error: '提醒时间格式无效，应为ISO 8601格式' }, { status: 400 });
      }
      reminderAtValue = reminderDate.toISOString();
    }

    const supabase = getServiceRoleClient();
    const { data, error } = await supabase
      .from('events')
      .insert({
        title,
        date,
        category: category || 'work',
        status: status || 'not_started',
        priority: priority || 'normal',
        description: description || null,
        duration: duration || null,
        reminder_at: reminderAtValue,
        reminder_notified: false,
        user_id: auth.userId,
      })
      .select('id, title, description, date, category, status, priority, duration, reminder_at, reminder_notified, created_at')
      .single();

    if (error) {
      console.error('Agent create event error:', error);
      return NextResponse.json({ error: '创建失败' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }
}
