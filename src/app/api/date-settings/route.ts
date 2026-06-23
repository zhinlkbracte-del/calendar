import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

// GET /api/date-settings?month=YYYY-MM — 获取指定月份的日期设置
export async function GET(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (!token) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: '无效token' }, { status: 401 });
  }
  const userId = payload.userId;

  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: '无效月份参数' }, { status: 400 });
  }

  const startDate = `${month}-01`;
  const endDate = `${month}-31`;

  const client = getSupabaseClient();
  const { data, error } = await client
    .from('date_settings')
    .select('id, date, day_type')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) {
    console.error('[date-settings GET] query failed:', error);
    return NextResponse.json(
      { error: '查询失败', detail: error.message, code: error.code },
      { status: 500 }
    );
  }

  // 返回为 { "YYYY-MM-DD": "workday"|"restday" } 映射
  const settings: Record<string, string> = {};
  for (const row of data) {
    settings[row.date] = row.day_type;
  }

  return NextResponse.json({ data: settings });
}

// POST /api/date-settings — 设置某日的类型（先查再更新或插入，兼容无唯一索引的环境）
export async function POST(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (!token) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: '无效token' }, { status: 401 });
  }
  const userId = payload.userId;

  const body = await request.json();
  const { date, day_type } = body;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: '无效日期' }, { status: 400 });
  }
  if (!['workday', 'restday'].includes(day_type)) {
    return NextResponse.json({ error: '无效日类型，必须为 workday 或 restday' }, { status: 400 });
  }

  const client = getSupabaseClient();

  try {
    // 先查是否已存在该日期的设置
    const { data: existing, error: queryError } = await client
      .from('date_settings')
      .select('id')
      .eq('date', date)
      .eq('user_id', userId)
      .maybeSingle();

    if (queryError) {
      console.error('[date-settings POST] query existing failed:', queryError);
      return NextResponse.json(
        { error: '查询失败', detail: queryError.message },
        { status: 500 }
      );
    }

    let result;

    if (existing) {
      // 已存在 → update
      const { data, error } = await client
        .from('date_settings')
        .update({ day_type, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select('id, date, day_type')
        .maybeSingle();
      if (error) throw error;
      result = data;
    } else {
      // 不存在 → insert
      const { data, error } = await client
        .from('date_settings')
        .insert({ date, day_type, user_id: userId, updated_at: new Date().toISOString() })
        .select('id, date, day_type')
        .maybeSingle();
      if (error) throw error;
      result = data;
    }

    return NextResponse.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    console.error('[date-settings POST] save failed:', message);
    return NextResponse.json(
      { error: '保存失败', detail: message },
      { status: 500 }
    );
  }
}

// DELETE /api/date-settings?date=YYYY-MM-DD — 删除某日设置（恢复默认）
export async function DELETE(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (!token) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: '无效token' }, { status: 401 });
  }
  const userId = payload.userId;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: '无效日期' }, { status: 400 });
  }

  const client = getSupabaseClient();
  const { error } = await client
    .from('date_settings')
    .delete()
    .eq('date', date)
    .eq('user_id', userId);

  if (error) {
    console.error('[date-settings DELETE] failed:', error);
    return NextResponse.json({ error: '删除失败', detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
