import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';

function getUserId(request: NextRequest): string | null {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

// 反向映射：中文 → 英文
const categoryReverseMap: Record<string, string> = { '工作': 'work', '生活': 'life', 'work': 'work', 'life': 'life' };
const statusReverseMap: Record<string, string> = { '未开始': 'not_started', '进行中': 'in_progress', '已完成': 'completed', 'not_started': 'not_started', 'in_progress': 'in_progress', 'completed': 'completed' };
const priorityReverseMap: Record<string, string> = { '紧急': 'urgent', '重要': 'important', '普通': 'normal', 'urgent': 'urgent', 'important': 'important', 'normal': 'normal' };

/**
 * 将 Excel 日期值转为 YYYY-MM-DD 字符串
 * 不使用 cellDates，避免时区偏移问题
 */
function parseExcelDate(dateVal: unknown): string | null {
  if (typeof dateVal === 'number') {
    // Excel 数字日期序列号，用 UTC 避免时区偏移
    // Excel epoch: Dec 30, 1899（含1900闰年bug补偿）
    const epochMs = Date.UTC(1899, 11, 30);
    const jsMs = epochMs + Math.round(dateVal * 86400000);
    const d = new Date(jsMs);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  if (dateVal !== undefined && dateVal !== null) {
    const date = String(dateVal).trim();
    if (!date) return null;

    // YYYY/MM/DD 或 YYYY/M/D
    if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(date)) {
      const [y, m, d] = date.split('/');
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    // YYYY-MM-DD 或 YYYY-M-D
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(date)) {
      const [y, m, d] = date.split('-');
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return null;
  }

  return null;
}

export async function POST(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: '请上传Excel文件' }, { status: 400 });
    }

    const buf = await file.arrayBuffer();
    // 动态导入xlsx，避免生产环境打包问题
    const XLSX = await import('xlsx');
    // 不使用 cellDates，日期单元格保持为数字序列号，由 parseExcelDate 统一处理
    const wb = XLSX.read(buf, { type: 'array' });
    const wsName = wb.SheetNames[0];
    if (!wsName) {
      return NextResponse.json({ error: 'Excel文件为空' }, { status: 400 });
    }
    const ws = wb.Sheets[wsName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Excel中没有数据行' }, { status: 400 });
    }

    const client = getSupabaseClient();

    // 查询该用户的任务，建立标题→ID映射
    const { data: tasksData } = await client
      .from('tasks')
      .select('id, title')
      .eq('user_id', userId);
    const taskTitleToId: Record<string, string> = {};
    if (tasksData) {
      for (const t of tasksData as { id: string; title: string }[]) {
        taskTitleToId[t.title] = t.id;
      }
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const dateVal = row['日期'];
      const title = String(row['标题'] || '').trim();

      // 日期解析
      const dateStr = parseExcelDate(dateVal);
      if (!dateStr) {
        skipped++;
        const hint = dateVal !== undefined && dateVal !== null ? `（实际值：${dateVal}）` : '';
        errors.push(`第${i + 2}行：日期格式错误${hint}，应为YYYY/MM/DD或YYYY-MM-DD`);
        continue;
      }

      if (!title) {
        skipped++;
        errors.push(`第${i + 2}行：缺少标题`);
        continue;
      }

      const categoryRaw = String(row['类别'] || 'work').trim();
      const category = categoryReverseMap[categoryRaw] || 'work';
      if (!categoryReverseMap[categoryRaw]) {
        skipped++;
        errors.push(`第${i + 2}行：类别无效，应为"工作"或"生活"`);
        continue;
      }

      const statusRaw = String(row['状态'] || '未开始').trim();
      const status = statusReverseMap[statusRaw] || 'not_started';

      const priorityRaw = String(row['优先级'] || '普通').trim();
      const priority = priorityReverseMap[priorityRaw] || 'normal';

      const description = String(row['描述'] || '').trim();

      // 关联任务：通过任务名称匹配
      const taskName = String(row['关联任务'] || '').trim();
      const task_id = taskName ? (taskTitleToId[taskName] || null) : null;

      const { error } = await client
        .from('events')
        .insert({
          title,
          description: description || null,
          date: dateStr,
          category,
          status,
          priority,
          task_id,
          user_id: userId,
        });

      if (error) {
        skipped++;
        errors.push(`第${i + 2}行：${error.message}`);
      } else {
        imported++;
      }
    }

    return NextResponse.json({
      imported,
      skipped,
      errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
