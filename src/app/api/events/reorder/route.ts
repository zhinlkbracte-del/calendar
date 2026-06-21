import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';

function getUserId(request: NextRequest): string | null {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

export async function POST(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { orders } = body as { orders: { id: string; sort_order: string }[] };

    if (!Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json({ error: '排序数据无效' }, { status: 400 });
    }

    const client = getSupabaseClient();

    // Update sort_order for each event (only own events)
    const results = await Promise.all(
      orders.map(async ({ id, sort_order }) => {
        const { error } = await client
          .from('events')
          .update({ sort_order, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', userId);

        if (error) throw new Error(`排序更新失败 (${id}): ${error.message}`);
        return id;
      })
    );

    return NextResponse.json({ success: true, updated: results.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
