import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient, verifyAgentAuth, hasPermission, unauthorizedResponse, forbiddenResponse } from '../_lib';

// GET /api/agent/tasks - List tasks
export async function GET(request: NextRequest) {
  const auth = await verifyAgentAuth(request);
  if (!auth) return unauthorizedResponse();
  if (!hasPermission(auth, 'tasks', 'read')) return forbiddenResponse('无任务查看权限');

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, start_date, planned_end_date, actual_end_date, delay_status, latest_progress, urgency_type, status, created_at, updated_at')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: '查询失败' }, { status: 500 });

  return NextResponse.json({ data, total: data?.length ?? 0 });
}

// POST /api/agent/tasks - Create task
export async function POST(request: NextRequest) {
  const auth = await verifyAgentAuth(request);
  if (!auth) return unauthorizedResponse();
  if (!hasPermission(auth, 'tasks', 'create')) return forbiddenResponse('无任务创建权限');

  try {
    const body = await request.json();
    const { title, start_date, planned_end_date, urgency_type, status, latest_progress } = body;

    if (!title) {
      return NextResponse.json({ error: '任务标题为必填项' }, { status: 400 });
    }

    const validStatuses = ['not_started', 'in_progress', 'completed'];
    const validUrgencyTypes = ['not_important_not_urgent', 'important_not_urgent', 'urgent_not_important', 'important_and_urgent'];

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: '状态应为 not_started、in_progress 或 completed' }, { status: 400 });
    }
    if (urgency_type && !validUrgencyTypes.includes(urgency_type)) {
      return NextResponse.json({ error: '紧急度类型无效' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title,
        start_date: start_date || null,
        planned_end_date: planned_end_date || null,
        urgency_type: urgency_type || 'not_important_not_urgent',
        status: status || 'not_started',
        latest_progress: latest_progress || null,
        user_id: auth.userId,
      })
      .select('id, title, status, created_at')
      .single();

    if (error) {
      console.error('Agent create task error:', error);
      return NextResponse.json({ error: '创建失败' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }
}
