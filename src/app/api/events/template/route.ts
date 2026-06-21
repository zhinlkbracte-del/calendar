import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET() {
  const wb = XLSX.utils.book_new();

  // 模板数据：日期使用 YYYY/MM/DD 格式（Excel 双击编辑后会自动转为此格式）
  const templateData = [
    { '日期': '2025/01/15', '标题': '项目评审会议', '描述': '与团队进行项目进度评审', '类别': '工作', '状态': '未开始', '优先级': '重要', '关联任务': 'Q1项目' },
    { '日期': '2025/01/16', '标题': '健身', '描述': '晚上7点有氧训练', '类别': '生活', '状态': '未开始', '优先级': '普通', '关联任务': '' },
    { '日期': '2025/01/17', '标题': '提交周报', '描述': '', '类别': '工作', '状态': '已完成', '优先级': '紧急', '关联任务': 'Q1项目' },
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);

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

  // 添加说明页
  const instructions = [
    { '字段': '日期', '说明': '格式：YYYY/MM/DD，例如 2025/01/15', '必填': '是', '可选值': '' },
    { '字段': '标题', '说明': '事项标题，最长255字', '必填': '是', '可选值': '' },
    { '字段': '描述', '说明': '事项描述，可为空', '必填': '否', '可选值': '' },
    { '字段': '类别', '说明': '事项类别', '必填': '是', '可选值': '工作 / 生活' },
    { '字段': '状态', '说明': '事项状态', '必填': '否（默认未开始）', '可选值': '未开始 / 进行中 / 已完成' },
    { '字段': '优先级', '说明': '事项优先级', '必填': '否（默认普通）', '可选值': '紧急 / 重要 / 普通' },
    { '字段': '关联任务', '说明': '关联的任务名称，需与任务面板中的任务标题一致', '必填': '否', '可选值': '填写任务标题即可' },
  ];

  const ws2 = XLSX.utils.json_to_sheet(instructions);
  ws2['!cols'] = [
    { wch: 10 },  // 字段
    { wch: 35 },  // 说明
    { wch: 20 },  // 必填
    { wch: 30 },  // 可选值
  ];

  XLSX.utils.book_append_sheet(wb, ws2, '填写说明');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="events_template.xlsx"',
    },
  });
}
