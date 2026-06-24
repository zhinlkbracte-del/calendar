import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';

function getUserId(request: NextRequest): string | null {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

// 类别映射
const categoryMap: Record<string, string> = { work: '工作', life: '生活' };

// 状态映射
const statusMap: Record<string, string> = { not_started: '未开始', in_progress: '进行中', completed: '已完成' };

// 优先级映射
const priorityMap: Record<string, string> = { urgent: '紧急', important: '重要', normal: '普通' };

export async function GET(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('events')
      .select('id, title, description, date, category, status, priority, sort_order, task_id, user_id, created_at, updated_at')
      .eq('user_id', userId)
      .order('date', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw new Error(`查询失败: ${error.message}`);

    // 查询任务标题映射
    const taskIds = [...new Set((data as Record<string, unknown>[]).filter(e => e.task_id).map(e => e.task_id as string))];
    let taskTitleMap: Record<string, string> = {};
    if (taskIds.length > 0) {
      const { data: tasks } = await client
        .from('tasks')
        .select('id, title')
        .in('id', taskIds);
      if (tasks) {
        taskTitleMap = Object.fromEntries((tasks as { id: string; title: string }[]).map(t => [t.id, t.title]));
      }
    }

    const rows = (data as Record<string, unknown>[]).map(e => ({
      '日期': (e.date as string).replace(/-/g, '/'),
      '标题': e.title,
      '描述': e.description || '',
      '类别': categoryMap[e.category as string] || e.category,
      '状态': statusMap[e.status as string] || e.status,
      '优先级': priorityMap[e.priority as string] || e.priority,
      '关联任务': e.task_id ? (taskTitleMap[e.task_id as string] || '') : '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // 设置列宽
    ws['!cols'] = [
      { wch: 12 },  // 日期
      { wch: 30 },  // 标题
      { wch: 40 },  // 描述
      { wch: 8 },   // 类别
      { wch: 10 },  // 状态
      { wch: 8 },   // 优先级
      { wch: 20 },  // 关联任务
    ];

    XLSX.utils.book_append_sheet(wb, ws, '事项');

    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;

    // 文件名包含导出的年月，使用ASCII文件名避免编码问题
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const asciiName = `events_${ym}.xlsx`;
    const utf8Name = encodeURIComponent(`事项_${ym}.xlsx`);

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`,
        'Content-Length': String(buf.byteLength),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
