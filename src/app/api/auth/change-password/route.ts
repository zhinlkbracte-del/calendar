import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyToken, getTokenFromRequest, verifyPassword, hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 });
    }

    const body = await request.json();
    const { oldPassword, newPassword } = body;

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: '请填写原密码和新密码' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: '新密码至少6位' }, { status: 400 });
    }

    const client = getSupabaseClient();

    const { data: user, error: fetchError } = await client
      .from('users')
      .select('id, password_hash')
      .eq('id', payload.userId)
      .maybeSingle();

    if (fetchError) throw new Error(fetchError.message);
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const valid = await verifyPassword(oldPassword, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: '原密码错误' }, { status: 401 });
    }

    const newHash = await hashPassword(newPassword);

    const { error: updateError } = await client
      .from('users')
      .update({ password_hash: newHash, updated_at: new Date().toISOString() })
      .eq('id', payload.userId);

    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    console.error('修改密码失败:', err);
    return NextResponse.json({ error: '修改密码失败' }, { status: 500 });
  }
}
