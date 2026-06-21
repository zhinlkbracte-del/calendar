import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hashPassword, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, password, nickname } = body;

    if (!phone || !password || !nickname) {
      return NextResponse.json({ error: '请填写完整信息' }, { status: 400 });
    }

    // Validate phone format (Chinese mobile: 11 digits starting with 1)
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return NextResponse.json({ error: '手机号格式不正确' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: '密码至少6位' }, { status: 400 });
    }

    if (nickname.length > 20) {
      return NextResponse.json({ error: '昵称不超过20个字' }, { status: 400 });
    }

    if (nickname.trim().length === 0) {
      return NextResponse.json({ error: '昵称不能为空' }, { status: 400 });
    }

    const client = getSupabaseClient();

    // Check if phone already registered
    const { data: existing, error: checkError } = await client
      .from('users')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();

    if (checkError) throw new Error(checkError.message);
    if (existing) {
      return NextResponse.json({ error: '该手机号已注册' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const { data: user, error: insertError } = await client
      .from('users')
      .insert({ phone, password_hash: passwordHash, nickname: nickname.trim() })
      .select('id, phone, nickname, avatar_key, created_at')
      .single();

    if (insertError) throw new Error(insertError.message);

    const token = generateToken(user.id);

    const response = NextResponse.json({
      data: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatar_url: null,
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
    console.error('注册失败:', err);
    return NextResponse.json({ error: '注册失败，请稍后重试' }, { status: 500 });
  }
}
