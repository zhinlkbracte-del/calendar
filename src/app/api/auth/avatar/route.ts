import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';
import { uploadAvatar, getAvatarUrl } from '@/lib/storage-client';

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

    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) {
      return NextResponse.json({ error: '请选择图片' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: '只能上传图片文件' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: '图片不能超过5MB' }, { status: 400 });
    }

    // Upload to Supabase Storage
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const storagePath = `${payload.userId}/${Date.now()}.png`;

    await uploadAvatar(storagePath, fileBuffer, file.type || 'image/png');

    // Update user avatar_key in database
    const client = getSupabaseClient();
    const { error: updateError } = await client
      .from('users')
      .update({ avatar_key: storagePath, updated_at: new Date().toISOString() })
      .eq('id', payload.userId);

    if (updateError) throw new Error(updateError.message);

    // Generate public URL for immediate display
    const avatarUrl = getAvatarUrl(storagePath);

    return NextResponse.json({
      data: { avatar_url: avatarUrl },
    });
  } catch (err) {
    console.error('上传头像失败:', err);
    const message = err instanceof Error ? err.message : '上传头像失败';
    return NextResponse.json({ error: '上传头像失败', detail: message }, { status: 500 });
  }
}
