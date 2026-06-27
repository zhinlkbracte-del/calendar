import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient, generateApiKey } from '../_lib';
import { verifyToken } from '@/lib/auth';

// GET /api/agent/config - Get agent config for current user
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value || request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '未登录' }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: '登录已过期' }, { status: 401 });

    const supabase = getServiceRoleClient();
    const { data, error } = await supabase
      .from('agent_configs')
      .select('id, name, api_key, permissions, is_active, webhook_url, created_at, updated_at')
      .eq('user_id', payload.userId)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: '获取配置失败' }, { status: 500 });

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// POST /api/agent/config - Create new agent config
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value || request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '未登录' }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: '登录已过期' }, { status: 401 });

    const body = await request.json();
    const name = body.name || 'My Agent';
    const webhookUrl = body.webhook_url || null;
    
    // Limit: max 5 agents per user
    const supabase = getServiceRoleClient();
    const { count } = await supabase
      .from('agent_configs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', payload.userId);
    
    if ((count ?? 0) >= 5) {
      return NextResponse.json({ error: '每个用户最多创建5个 Agent' }, { status: 400 });
    }

    const apiKey = generateApiKey();
    const defaultPermissions = {
      events: { read: true, create: true, update: true, delete: true },
      tasks: { read: true, create: true, update: true, delete: true },
    };

    const { data, error } = await supabase
      .from('agent_configs')
      .insert({
        user_id: payload.userId,
        name,
        api_key: apiKey,
        permissions: body.permissions || defaultPermissions,
        webhook_url: webhookUrl,
        is_active: true,
      })
      .select('id, name, api_key, permissions, is_active, webhook_url, created_at')
      .single();

    if (error) {
      console.error('Create agent config error:', error);
      return NextResponse.json({ error: '创建失败' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// PUT /api/agent/config - Update agent config (permissions, name, active status)
export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value || request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '未登录' }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: '登录已过期' }, { status: 401 });

    const body = await request.json();
    const { id, name, permissions, is_active, webhook_url } = body;
    
    if (!id) return NextResponse.json({ error: '缺少 Agent ID' }, { status: 400 });

    const supabase = getServiceRoleClient();
    
    // Verify ownership
    const { data: existing } = await supabase
      .from('agent_configs')
      .select('id, user_id')
      .eq('id', id)
      .single();
    
    if (!existing || existing.user_id !== payload.userId) {
      return NextResponse.json({ error: 'Agent 不存在或无权操作' }, { status: 403 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (permissions !== undefined) updates.permissions = permissions;
    if (is_active !== undefined) updates.is_active = is_active;
    if (webhook_url !== undefined) updates.webhook_url = webhook_url;

    const { data, error } = await supabase
      .from('agent_configs')
      .update(updates)
      .eq('id', id)
      .select('id, name, api_key, permissions, is_active, webhook_url, updated_at')
      .single();

    if (error) {
      console.error('Update agent config error:', error);
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// DELETE /api/agent/config - Delete agent config
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value || request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '未登录' }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: '登录已过期' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: '缺少 Agent ID' }, { status: 400 });

    const supabase = getServiceRoleClient();
    
    // Verify ownership
    const { data: existing } = await supabase
      .from('agent_configs')
      .select('id, user_id')
      .eq('id', id)
      .single();
    
    if (!existing || existing.user_id !== payload.userId) {
      return NextResponse.json({ error: 'Agent 不存在或无权操作' }, { status: 403 });
    }

    const { error } = await supabase
      .from('agent_configs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete agent config error:', error);
      return NextResponse.json({ error: '删除失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
