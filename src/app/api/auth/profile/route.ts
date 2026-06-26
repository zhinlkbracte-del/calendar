import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';

export async function PUT(request: NextRequest) {
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
    const { nickname, avatar_url } = body;

    if (nickname !== undefined) {
      if (nickname.trim().length === 0) {
        return NextResponse.json({ error: '昵称不能为空' }, { status: 400 });
      }
      if (nickname.length > 20) {
        return NextResponse.json({ error: '昵称不超过20个字' }, { status: 400 });
      }
    }

    const client = getSupabaseClient();
    const updateData: Record<string, string> = {};
    if (nickname !== undefined) updateData.nickname = nickname.trim();
    // avatar_url in body is the avatar_key stored in DB
    if (avatar_url !== undefined) updateData.avatar_key = avatar_url;
    updateData.updated_at = new Date().toISOString();

    if (Object.keys(updateData).length <= 1 && nickname === undefined && avatar_url === undefined) {
      return NextResponse.json({ error: '没有需要更新的字段' }, { status: 400 });
    }

    const { data, error } = await client
      .from('users')
      .update(updateData)
      .eq('id', payload.userId)
      .select('id, phone, nickname, avatar_key, created_at')
      .single();

    if (error) throw new Error(error.message);

    // Get avatar URL if avatar_key exists
    let avatarResultUrl: string | null = null;
    if (data.avatar_key) {
      try {
        const { getAvatarUrl } = await import('@/lib/storage-client');
        avatarResultUrl = getAvatarUrl(data.avatar_key);
      } catch { /* ignore */ }
    }

    return NextResponse.json({
      data: {
        id: data.id,
        phone: data.phone,
        nickname: data.nickname,
        avatar_url: avatarResultUrl,
      },
    });
  } catch (err) {
    console.error('更新资料失败:', err);
    return NextResponse.json({ error: '更新资料失败' }, { status: 500 });
  }
}
