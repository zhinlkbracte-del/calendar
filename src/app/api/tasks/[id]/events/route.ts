import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, getSupabaseServiceRoleKey, getSupabaseCredentials } from '@/storage/database/supabase-client';
import { createClient } from '@supabase/supabase-js';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

function getUserId(request: NextRequest): string | null {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

/** Get a Supabase client that bypasses RLS using service_role key */
function getServiceClient() {
  const { url } = getSupabaseCredentials();
  const serviceRoleKey = getSupabaseServiceRoleKey();
  if (!serviceRoleKey) {
    return getServiceClient();
  }
  return createClient(url, serviceRoleKey, {
    db: { timeout: 60000 },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// GET /api/tasks/[id]/events - 获取任务关联的所有事项
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ error: '未登录' }, { status: 401 });

  try {
    const { id } = await params;
    const client = getServiceClient();

    // Verify task ownership
    const { data: task } = await client
      .from('tasks')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!task) return NextResponse.json({ error: '任务不存在' }, { status: 404 });

    const { data, error } = await client
      .from('events')
      .select('*')
      .eq('task_id', id)
      .eq('user_id', userId)
      .order('date', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
