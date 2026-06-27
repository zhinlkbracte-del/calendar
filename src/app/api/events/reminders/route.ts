import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';

function getUserId(request: NextRequest): string | null {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

/**
 * GET /api/events/reminders - 获取当前用户未通知的到期提醒
 */
export async function GET(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const client = getSupabaseClient();
    const now = new Date().toISOString();

    const { data, error } = await client
      .from('events')
      .select('id, title, date, category, status, priority, reminder_at, reminder_notified')
      .eq('user_id', userId)
      .not('reminder_at', 'is', null)
      .lte('reminder_at', now)
      .eq('reminder_notified', false);

    if (error) throw new Error(`查询提醒失败: ${error.message}`);

    return NextResponse.json({ data: data || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/events/reminders - 批量标记提醒为已通知
 * Body: { event_ids: string[] }
 */
export async function POST(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const { event_ids } = await request.json();
    if (!Array.isArray(event_ids) || event_ids.length === 0) {
      return NextResponse.json({ error: '缺少event_ids参数' }, { status: 400 });
    }

    const client = getSupabaseClient();
    const { error } = await client
      .from('events')
      .update({ reminder_notified: true, updated_at: new Date().toISOString() })
      .in('id', event_ids)
      .eq('user_id', userId);

    if (error) throw new Error(`标记提醒失败: ${error.message}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
