import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

function getUserId(request: NextRequest): string | null {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

// GET /api/tasks/[id] - 获取单个任务详情
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ error: '未登录' }, { status: 401 });

  try {
    const { id } = await params;
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('tasks')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) return NextResponse.json({ error: '任务不存在' }, { status: 404 });
    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/tasks/[id] - 更新任务
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ error: '未登录' }, { status: 401 });

  try {
    const { id } = await params;
    const client = getSupabaseClient();

    // Verify ownership
    const { data: existing } = await client
      .from('tasks')
      .select('id, status')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!existing) return NextResponse.json({ error: '任务不存在' }, { status: 404 });

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.start_date !== undefined) updateData.start_date = body.start_date || null;
    if (body.planned_end_date !== undefined) updateData.planned_end_date = body.planned_end_date || null;
    if (body.actual_end_date !== undefined) updateData.actual_end_date = body.actual_end_date || null;
    if (body.delay_status !== undefined) updateData.delay_status = body.delay_status;
    if (body.latest_progress !== undefined) updateData.latest_progress = body.latest_progress?.trim() || null;
    if (body.urgency_type !== undefined) updateData.urgency_type = body.urgency_type;
    if (body.status !== undefined) {
      updateData.status = body.status;
      // When completing a task, auto-fill actual_end_date if not set
      if (body.status === 'completed' && existing.status !== 'completed' && !body.actual_end_date) {
        updateData.actual_end_date = new Date().toISOString().split('T')[0];
      }
    }

    const { data, error } = await client
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/tasks/[id] - 删除任务
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ error: '未登录' }, { status: 401 });

  try {
    const { id } = await params;
    const client = getSupabaseClient();

    // Unlink all events from this task first
    await client
      .from('events')
      .update({ task_id: null })
      .eq('task_id', id)
      .eq('user_id', userId);

    const { error } = await client
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
