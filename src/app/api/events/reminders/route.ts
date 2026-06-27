import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';
import { getServiceRoleClient } from '@/app/api/agent/_lib';

function getUserId(request: NextRequest): string | null {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

/**
 * Push reminders to agent webhooks (deliver-only mode, no LLM, no token cost)
 */
async function pushToWebhooks(userId: string, reminders: { id: string; title: string; date: string; category: string; priority: string; reminder_at: string }[]) {
  if (reminders.length === 0) return;

  try {
    const supabase = getServiceRoleClient();
    const { data: agents } = await supabase
      .from('agent_configs')
      .select('webhook_url, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .not('webhook_url', 'is', null);

    if (!agents || agents.length === 0) return;

    const payload = {
      type: 'reminder' as const,
      reminders: reminders.map(r => ({
        event_id: r.id,
        title: r.title,
        date: r.date,
        category: r.category,
        priority: r.priority,
        reminder_at: r.reminder_at,
      })),
      count: reminders.length,
    };

    // Push to all active agent webhooks concurrently
    await Promise.allSettled(
      agents
        .filter((a): a is { webhook_url: string; is_active: boolean } => typeof a.webhook_url === 'string' && a.webhook_url.length > 0)
        .map(async (agent) => {
          try {
            await fetch(agent.webhook_url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
              signal: AbortSignal.timeout(5000), // 5s timeout
            });
          } catch {
            // Webhook delivery failed, silently ignore - frontend will still notify
          }
        })
    );
  } catch {
    // Webhook push failed, silently ignore - frontend will still notify
  }
}

/**
 * GET /api/events/reminders - 获取当前用户未通知的到期提醒
 * 同时触发 Webhook 推送（如有配置）
 */
export async function GET(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const client = getSupabaseClient();
    const now = new Date().toISOString();

    const { data, error } = await client
      .from('events')
      .select('id, title, date, category, status, priority, reminder_at, reminder_notified')
      .eq('user_id', userId)
      .not('reminder_at', 'is', null)
      .lte('reminder_at', now)
      .eq('reminder_notified', false);

    if (error) throw new Error(`查询提醒失败: ${error.message}`);

    const reminders = data || [];

    // Push to agent webhooks in background (don't block the response)
    if (reminders.length > 0) {
      // Fire-and-forget: push webhooks without awaiting
      pushToWebhooks(userId, reminders.map(r => ({
        id: r.id,
        title: r.title,
        date: r.date,
        category: r.category,
        priority: r.priority,
        reminder_at: r.reminder_at || '',
      }))).catch(() => {});
    }

    return NextResponse.json({ data: reminders });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/events/reminders - 批量标记提醒为已通知
 * Body: { event_ids: string[] }
 */
export async function POST(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const { event_ids } = await request.json();
    if (!Array.isArray(event_ids) || event_ids.length === 0) {
      return NextResponse.json({ error: '缺少event_ids参数' }, { status: 400 });
    }

    const client = getSupabaseClient();
    const { error } = await client
      .from('events')
      .update({ reminder_notified: true, updated_at: new Date().toISOString() })
      .in('id', event_ids)
      .eq('user_id', userId);

    if (error) throw new Error(`标记提醒失败: ${error.message}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
