import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient, verifyAgentAuth, hasPermission, unauthorizedResponse, forbiddenResponse } from '../../_lib';

// PUT /api/agent/tasks/[id] - Update task
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAgentAuth(request);
  if (!auth) return unauthorizedResponse();
  if (!hasPermission(auth, 'tasks', 'update')) return forbiddenResponse('无任务编辑权限');

  const { id } = await params;

  try {
    const body = await request.json();
    const supabase = getServiceRoleClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from('tasks')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (!existing || existing.user_id !== auth.userId) {
      return NextResponse.json({ error: '任务不存在或无权操作' }, { status: 404 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const allowedFields = ['title', 'start_date', 'planned_end_date', 'actual_end_date', 'delay_status', 'latest_progress', 'urgency_type', 'status'];
    for (const field of allowedFields) {
      if (body[field] !== undefined) updates[field] = body[field];
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select('id, title, status, updated_at')
      .single();

    if (error) {
      console.error('Agent update task error:', error);
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }
}

// DELETE /api/agent/tasks/[id] - Delete task
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAgentAuth(request);
  if (!auth) return unauthorizedResponse();
  if (!hasPermission(auth, 'tasks', 'delete')) return forbiddenResponse('无任务删除权限');

  const { id } = await params;
  const supabase = getServiceRoleClient();

  // Verify ownership
  const { data: existing } = await supabase
    .from('tasks')
    .select('id, user_id')
    .eq('id', id)
    .single();

  if (!existing || existing.user_id !== auth.userId) {
    return NextResponse.json({ error: '任务不存在或无权操作' }, { status: 404 });
  }

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Agent delete task error:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
