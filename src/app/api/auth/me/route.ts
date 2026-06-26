import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: '登录已过期，请重新登录' }, { status: 401 });
    }

    const client = getSupabaseClient();

    const { data: user, error } = await client
      .from('users')
      .select('id, phone, nickname, avatar_key, created_at')
      .eq('id', payload.userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // Get avatar URL if avatar_key exists
    let avatarUrl: string | null = null;
    if (user.avatar_key) {
      try {
        const { getAvatarUrl } = await import('@/lib/storage-client');
        avatarUrl = getAvatarUrl(user.avatar_key);
      } catch { /* ignore */ }
    }

    return NextResponse.json({
      data: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatar_url: avatarUrl,
      },
    });
  } catch (err) {
    console.error('获取用户信息失败:', err);
    return NextResponse.json({ error: '获取用户信息失败' }, { status: 500 });
  }
}
