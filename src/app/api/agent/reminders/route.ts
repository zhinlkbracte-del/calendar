import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient, verifyAgentAuth, hasPermission, unauthorizedResponse, forbiddenResponse } from '../_lib';

// GET /api/agent/reminders - 获取到期未通知的提醒
export async function GET(request: NextRequest) {
  const auth = await verifyAgentAuth(request);
  if (!auth) return unauthorizedResponse();
  if (!hasPermission(auth, 'events', 'read')) return forbiddenResponse('无事项查看权限');

  try {
    const supabase = getServiceRoleClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('events')
      .select('id, title, date, category, status, priority, reminder_at, reminder_notified')
      .eq('user_id', auth.userId)
      .not('reminder_at', 'is', null)
      .lte('reminder_at', now)
      .eq('reminder_notified', false);

    if (error) {
      console.error('Agent get reminders error:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [], total: data?.length ?? 0 });
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }
}

// POST /api/agent/reminders - 批量关闭提醒 (agent确认后调用)
// Body: { event_ids: string[] } 或 { event_id: string }
export async function POST(request: NextRequest) {
  const auth = await verifyAgentAuth(request);
  if (!auth) return unauthorizedResponse();
  if (!hasPermission(auth, 'events', 'update')) return forbiddenResponse('无事项编辑权限');

  try {
    const body = await request.json();
    const eventIds: string[] = body.event_ids || (body.event_id ? [body.event_id] : []);

    if (eventIds.length === 0) {
      return NextResponse.json({ error: '缺少event_ids或event_id参数' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();

    // Verify all events belong to this user
    const { data: events } = await supabase
      .from('events')
      .select('id')
      .in('id', eventIds)
      .eq('user_id', auth.userId);

    if (!events || events.length === 0) {
      return NextResponse.json({ error: '事项不存在或无权操作' }, { status: 404 });
    }

    const validIds = events.map(e => e.id);
    const { error } = await supabase
      .from('events')
      .update({ reminder_notified: true, updated_at: new Date().toISOString() })
      .in('id', validIds);

    if (error) {
      console.error('Agent dismiss reminders error:', error);
      return NextResponse.json({ error: '关闭提醒失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, dismissed: validIds.length });
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }
}
