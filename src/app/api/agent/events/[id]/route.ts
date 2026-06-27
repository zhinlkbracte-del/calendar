import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient, verifyAgentAuth, hasPermission, unauthorizedResponse, forbiddenResponse } from '../../_lib';

// PUT /api/agent/events/[id] - Update event
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAgentAuth(request);
  if (!auth) return unauthorizedResponse();
  if (!hasPermission(auth, 'events', 'update')) return forbiddenResponse('无事项编辑权限');

  const { id } = await params;
  
  try {
    const body = await request.json();
    const supabase = getServiceRoleClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from('events')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (!existing || existing.user_id !== auth.userId) {
      return NextResponse.json({ error: '事项不存在或无权操作' }, { status: 404 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const allowedFields = ['title', 'description', 'date', 'category', 'status', 'priority', 'duration', 'task_id', 'sort_order'];
    for (const field of allowedFields) {
      if (body[field] !== undefined) updates[field] = body[field];
    }
    // Handle reminder_at
    if (body.reminder_at !== undefined) {
      if (body.reminder_at === null || body.reminder_at === '') {
        updates.reminder_at = null;
        updates.reminder_notified = false;
      } else {
        const reminderDate = new Date(body.reminder_at);
        if (isNaN(reminderDate.getTime())) {
          return NextResponse.json({ error: '提醒时间格式无效，应为ISO 8601格式' }, { status: 400 });
        }
        updates.reminder_at = reminderDate.toISOString();
        if (reminderDate > new Date()) {
          updates.reminder_notified = false;
        }
      }
    }
    // Handle reminder_notified (for agent dismissing reminders)
    if (body.reminder_notified !== undefined) {
      updates.reminder_notified = body.reminder_notified;
    }

    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', id)
      .select('id, title, description, date, category, status, priority, duration, reminder_at, reminder_notified, updated_at')
      .single();

    if (error) {
      console.error('Agent update event error:', error);
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }
}

// DELETE /api/agent/events/[id] - Delete event
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAgentAuth(request);
  if (!auth) return unauthorizedResponse();
  if (!hasPermission(auth, 'events', 'delete')) return forbiddenResponse('无事项删除权限');

  const { id } = await params;
  const supabase = getServiceRoleClient();

  // Verify ownership
  const { data: existing } = await supabase
    .from('events')
    .select('id, user_id')
    .eq('id', id)
    .single();

  if (!existing || existing.user_id !== auth.userId) {
    return NextResponse.json({ error: '事项不存在或无权操作' }, { status: 404 });
  }

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Agent delete event error:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
