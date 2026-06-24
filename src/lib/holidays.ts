/**
 * 节假日与24节气工具模块
 * 使用 lunar-javascript 库计算节气和农历节日
 */
import { Solar } from 'lunar-javascript';

export interface DayExtra {
  /** 节气名称，如"立春"、"雨水" */
  jieqi?: string;
  /** 节日名称，如"元旦"、"春节" */
  holiday?: string;
  /** 是否为法定假日（影响日历显示优先级） */
  isPublicHoliday?: boolean;
  /** 季节主题背景渐变（极淡，不影响阅读） */
  seasonalBg?: string;
}

/**
 * 固定日期的公历节日（月-日 => 名称）
 */
const FIXED_HOLIDAYS: Record<string, string> = {
  '1-1': '元旦',
  '2-14': '情人节',
  '3-8': '妇女节',
  '3-12': '植树节',
  '4-1': '愚人节',
  '5-1': '劳动节',
  '5-4': '青年节',
  '6-1': '儿童节',
  '7-1': '建党节',
  '8-1': '建军节',
  '9-10': '教师节',
  '10-1': '国庆节',
  '10-2': '国庆节',
  '10-3': '国庆节',
  '12-24': '平安夜',
  '12-25': '圣诞节',
};

/**
 * 法定公历节日（用于标记特殊样式）
 */
const PUBLIC_HOLIDAYS = new Set(['1-1', '5-1', '10-1', '10-2', '10-3']);

/**
 * 农历节日（月-日 => 名称）
 * lunar-javascript 会返回农历月份和日期
 */
const LUNAR_HOLIDAYS: Record<string, string> = {
  '1-1': '春节',
  '1-15': '元宵节',
  '2-2': '龙抬头',
  '5-5': '端午节',
  '7-7': '七夕节',
  '7-15': '中元节',
  '8-15': '中秋节',
  '9-9': '重阳节',
  '12-30': '除夕',
  '12-8': '腊八节',
  '12-23': '小年',
};

/**
 * 法定农历节日
 */
const PUBLIC_LUNAR_HOLIDAYS = new Set(['1-1', '5-5', '8-15']);

/**
 * 节气中文名映射（lunar-javascript 返回的名称可能需要调整）
 */
const JIEQI_NAMES: Record<string, string> = {
  '小寒': '小寒', '大寒': '大寒', '立春': '立春', '雨水': '雨水',
  '惊蛰': '惊蛰', '春分': '春分', '清明': '清明', '谷雨': '谷雨',
  '立夏': '立夏', '小满': '小满', '芒种': '芒种', '夏至': '夏至',
  '小暑': '小暑', '大暑': '大暑', '立秋': '立秋', '处暑': '处暑',
  '白露': '白露', '秋分': '秋分', '寒露': '寒露', '霜降': '霜降',
  '立冬': '立冬', '小雪': '小雪', '大雪': '大雪', '冬至': '冬至',
};

/**
 * 获取指定日期的额外信息（节气、节日）
 */
export function getDayExtra(year: number, month: number, day: number): DayExtra {
  const result: DayExtra = {};
  // month 传入的是 0-indexed（JS Date），但 Solar.fromYmd 和节日 key 需要 1-indexed
  const m1 = month + 1;

  // 使用 lunar-javascript 获取节气
  try {
    const solar = Solar.fromYmd(year, m1, day);
    const lunar = solar.getLunar();
    
    // 获取当前节气
    const jieqi = lunar.getJieQi();
    if (jieqi && JIEQI_NAMES[jieqi]) {
      result.jieqi = jieqi;
    }

    // 检查农历节日
    const lunarMonth = lunar.getMonth();
    const lunarDay = lunar.getDay();
    const lunarKey = `${lunarMonth}-${lunarDay}`;
    
    if (LUNAR_HOLIDAYS[lunarKey]) {
      result.holiday = LUNAR_HOLIDAYS[lunarKey];
      result.isPublicHoliday = PUBLIC_LUNAR_HOLIDAYS.has(lunarKey);
    }
  } catch {
    // lunar-javascript 计算失败时静默忽略
  }

  // 检查公历节日（优先级：公历节日 > 农历节日 > 节气）
  const solarKey = `${m1}-${day}`;
  if (FIXED_HOLIDAYS[solarKey]) {
    result.holiday = FIXED_HOLIDAYS[solarKey];
    result.isPublicHoliday = PUBLIC_HOLIDAYS.has(solarKey);
  }

  return result;
}

// 节气对应的季节主题色（CSS gradient 背景，非常淡）
const JIEQI_THEMES: Record<string, string> = {
  // 春 - 嫩绿/青
  '立春': 'linear-gradient(135deg, rgba(167,210,167,0.12) 0%, rgba(200,230,200,0.06) 100%)',
  '雨水': 'linear-gradient(135deg, rgba(170,210,220,0.12) 0%, rgba(180,220,230,0.06) 100%)',
  '惊蛰': 'linear-gradient(135deg, rgba(180,210,160,0.12) 0%, rgba(200,225,180,0.06) 100%)',
  '春分': 'linear-gradient(135deg, rgba(160,210,150,0.12) 0%, rgba(190,230,180,0.06) 100%)',
  '清明': 'linear-gradient(135deg, rgba(150,200,170,0.14) 0%, rgba(180,220,190,0.08) 100%)',
  '谷雨': 'linear-gradient(135deg, rgba(165,205,175,0.12) 0%, rgba(185,220,195,0.06) 100%)',
  // 夏 - 暖色
  '立夏': 'linear-gradient(135deg, rgba(220,200,150,0.10) 0%, rgba(230,210,170,0.05) 100%)',
  '小满': 'linear-gradient(135deg, rgba(210,195,140,0.10) 0%, rgba(225,210,160,0.05) 100%)',
  '芒种': 'linear-gradient(135deg, rgba(200,190,130,0.10) 0%, rgba(215,205,150,0.05) 100%)',
  '夏至': 'linear-gradient(135deg, rgba(230,210,160,0.12) 0%, rgba(240,220,180,0.06) 100%)',
  '小暑': 'linear-gradient(135deg, rgba(235,200,160,0.10) 0%, rgba(240,215,180,0.05) 100%)',
  '大暑': 'linear-gradient(135deg, rgba(240,190,150,0.10) 0%, rgba(245,210,170,0.05) 100%)',
  // 秋 - 琥珀/金
  '立秋': 'linear-gradient(135deg, rgba(210,180,130,0.12) 0%, rgba(225,200,150,0.06) 100%)',
  '处暑': 'linear-gradient(135deg, rgba(200,185,140,0.10) 0%, rgba(215,200,160,0.05) 100%)',
  '白露': 'linear-gradient(135deg, rgba(190,200,210,0.12) 0%, rgba(210,220,230,0.06) 100%)',
  '秋分': 'linear-gradient(135deg, rgba(200,190,140,0.12) 0%, rgba(215,205,160,0.06) 100%)',
  '寒露': 'linear-gradient(135deg, rgba(180,190,200,0.12) 0%, rgba(200,210,220,0.06) 100%)',
  '霜降': 'linear-gradient(135deg, rgba(190,200,210,0.14) 0%, rgba(205,215,225,0.08) 100%)',
  // 冬 - 冷色
  '立冬': 'linear-gradient(135deg, rgba(190,200,210,0.12) 0%, rgba(205,215,220,0.06) 100%)',
  '小雪': 'linear-gradient(135deg, rgba(210,215,220,0.14) 0%, rgba(220,225,230,0.08) 100%)',
  '大雪': 'linear-gradient(135deg, rgba(200,210,220,0.14) 0%, rgba(215,220,230,0.08) 100%)',
  '冬至': 'linear-gradient(135deg, rgba(210,205,200,0.12) 0%, rgba(220,215,210,0.06) 100%)',
  '小寒': 'linear-gradient(135deg, rgba(200,210,220,0.12) 0%, rgba(210,220,230,0.06) 100%)',
  '大寒': 'linear-gradient(135deg, rgba(195,205,215,0.12) 0%, rgba(210,215,225,0.06) 100%)',
};

// 节假日主题色
const HOLIDAY_THEMES: Record<string, string> = {
  '元旦': 'linear-gradient(135deg, rgba(200,200,210,0.12) 0%, rgba(215,215,225,0.06) 100%)',
  '春节': 'linear-gradient(135deg, rgba(220,170,150,0.10) 0%, rgba(235,200,170,0.05) 100%)',
  '元宵节': 'linear-gradient(135deg, rgba(230,200,160,0.10) 0%, rgba(240,220,180,0.05) 100%)',
  '情人节': 'linear-gradient(135deg, rgba(220,180,190,0.10) 0%, rgba(230,200,210,0.05) 100%)',
  '妇女节': 'linear-gradient(135deg, rgba(210,180,200,0.10) 0%, rgba(225,200,215,0.05) 100%)',
  '植树节': 'linear-gradient(135deg, rgba(160,200,160,0.10) 0%, rgba(180,220,180,0.05) 100%)',
  '愚人节': 'linear-gradient(135deg, rgba(210,200,180,0.10) 0%, rgba(225,215,195,0.05) 100%)',
  '劳动节': 'linear-gradient(135deg, rgba(200,180,160,0.10) 0%, rgba(215,200,175,0.05) 100%)',
  '青年节': 'linear-gradient(135deg, rgba(180,200,220,0.10) 0%, rgba(200,215,235,0.05) 100%)',
  '儿童节': 'linear-gradient(135deg, rgba(200,210,230,0.10) 0%, rgba(215,225,240,0.05) 100%)',
  '端午节': 'linear-gradient(135deg, rgba(160,190,170,0.12) 0%, rgba(180,210,190,0.06) 100%)',
  '建党节': 'linear-gradient(135deg, rgba(200,170,170,0.10) 0%, rgba(220,190,190,0.05) 100%)',
  '建军节': 'linear-gradient(135deg, rgba(200,170,170,0.10) 0%, rgba(220,190,190,0.05) 100%)',
  '七夕节': 'linear-gradient(135deg, rgba(190,170,210,0.10) 0%, rgba(210,190,230,0.05) 100%)',
  '教师节': 'linear-gradient(135deg, rgba(180,200,170,0.10) 0%, rgba(200,220,190,0.05) 100%)',
  '中秋节': 'linear-gradient(135deg, rgba(220,200,160,0.12) 0%, rgba(235,215,180,0.06) 100%)',
  '国庆节': 'linear-gradient(135deg, rgba(220,160,150,0.10) 0%, rgba(235,190,170,0.05) 100%)',
  '重阳节': 'linear-gradient(135deg, rgba(210,180,130,0.10) 0%, rgba(225,200,150,0.05) 100%)',
  '腊八节': 'linear-gradient(135deg, rgba(200,170,140,0.10) 0%, rgba(220,190,160,0.05) 100%)',
  '小年': 'linear-gradient(135deg, rgba(210,180,150,0.10) 0%, rgba(225,200,170,0.05) 100%)',
  '除夕': 'linear-gradient(135deg, rgba(220,170,150,0.12) 0%, rgba(235,190,170,0.06) 100%)',
  '中元节': 'linear-gradient(135deg, rgba(190,190,200,0.10) 0%, rgba(210,210,220,0.05) 100%)',
  '龙抬头': 'linear-gradient(135deg, rgba(180,190,220,0.10) 0%, rgba(200,210,230,0.05) 100%)',
  '清明节': 'linear-gradient(135deg, rgba(160,200,170,0.14) 0%, rgba(180,220,190,0.08) 100%)',
  '平安夜': 'linear-gradient(135deg, rgba(210,200,180,0.10) 0%, rgba(225,215,195,0.05) 100%)',
  '圣诞节': 'linear-gradient(135deg, rgba(200,170,170,0.10) 0%, rgba(220,190,190,0.05) 100%)',
  '万圣节': 'linear-gradient(135deg, rgba(220,180,120,0.10) 0%, rgba(235,200,140,0.05) 100%)',
};

/**
 * 获取节气/节假日对应的背景主题色
 */
export function getDayTheme(jieqi?: string, holiday?: string): string | undefined {
  if (holiday && HOLIDAY_THEMES[holiday]) return HOLIDAY_THEMES[holiday];
  if (jieqi && JIEQI_THEMES[jieqi]) return JIEQI_THEMES[jieqi];
  return undefined;
}

/**
 * 批量获取一个月中所有日期的额外信息
 * @param year 年份
 * @param month 月份（0-indexed，与 JS Date.getMonth() 一致）
 */
export function getMonthExtras(year: number, month: number): Record<string, DayExtra> {
  const result: Record<string, DayExtra> = {};
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const extra = getDayExtra(year, month, day);
    if (extra.jieqi || extra.holiday) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      result[key] = extra;
    }
  }
  
  return result;
}
