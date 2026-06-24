import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';
import type { EventItem } from '../route';

function getUserId(request: NextRequest): string | null {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, date, category, status, priority, sort_order, task_id, duration } = body;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (date !== undefined) updateData.date = date;
    if (category !== undefined) {
      if (!['work', 'life'].includes(category)) {
        return NextResponse.json({ error: '类别无效' }, { status: 400 });
      }
      updateData.category = category;
    }
    if (status !== undefined) {
      if (!['not_started', 'in_progress', 'completed'].includes(status)) {
        return NextResponse.json({ error: '状态值无效' }, { status: 400 });
      }
      updateData.status = status;
    }
    if (priority !== undefined) {
      if (!['urgent', 'important', 'normal'].includes(priority)) {
        return NextResponse.json({ error: '优先级值无效' }, { status: 400 });
      }
      updateData.priority = priority;
    }
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    if (task_id !== undefined) updateData.task_id = task_id || null;
    if (duration !== undefined) {
      if (duration !== null && duration !== '') {
        const dur = parseFloat(duration);
        if (isNaN(dur) || dur < 0) {
          return NextResponse.json({ error: '消耗时长无效' }, { status: 400 });
        }
      }
      updateData.duration = duration || null;
    }
    updateData.updated_at = new Date().toISOString();

    if (Object.keys(updateData).length <= 1) {
      return NextResponse.json({ error: '没有需要更新的字段' }, { status: 400 });
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('events')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select('id, title, description, date, category, status, priority, sort_order, task_id, duration, user_id, created_at, updated_at')
      .maybeSingle();

    if (error) throw new Error(`更新失败: ${error.message}`);
    if (!data) return NextResponse.json({ error: '事项不存在' }, { status: 404 });

    return NextResponse.json({ data: data as EventItem });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const client = getSupabaseClient();
    const { error } = await client
      .from('events')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw new Error(`删除失败: ${error.message}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
