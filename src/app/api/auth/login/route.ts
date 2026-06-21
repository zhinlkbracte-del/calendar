import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyPassword, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, password } = body;

    if (!phone || !password) {
      return NextResponse.json({ error: '请填写手机号和密码' }, { status: 400 });
    }

    const client = getSupabaseClient();

    const { data: user, error } = await client
      .from('users')
      .select('id, phone, nickname, avatar_key, password_hash, created_at')
      .eq('phone', phone)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!user) {
      return NextResponse.json({ error: '手机号未注册' }, { status: 404 });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: '密码错误' }, { status: 401 });
    }

    const token = generateToken(user.id);

    // Get avatar URL if avatar_key exists
    let avatarUrl: string | null = null;
    if (user.avatar_key) {
      try {
        const { getPresignedUrl } = await import('@/lib/storage-client');
        avatarUrl = await getPresignedUrl(user.avatar_key, 3600);
      } catch { /* ignore */ }
    }

    const response = NextResponse.json({
      data: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatar_url: avatarUrl,
      },
      token, // Also return token in body for localStorage fallback
    });

    // Set HTTP-only cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('登录失败:', err);
    return NextResponse.json({ error: '登录失败，请稍后重试' }, { status: 500 });
  }
}
