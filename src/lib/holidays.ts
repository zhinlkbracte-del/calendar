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
  '7-7': '七夕',
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

  // 使用 lunar-javascript 获取节气
  try {
    const solar = Solar.fromYmd(year, month, day);
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
  const solarKey = `${month}-${day}`;
  if (FIXED_HOLIDAYS[solarKey]) {
    result.holiday = FIXED_HOLIDAYS[solarKey];
    result.isPublicHoliday = PUBLIC_HOLIDAYS.has(solarKey);
  }

  return result;
}

/**
 * 批量获取一个月中所有日期的额外信息
 */
export function getMonthExtras(year: number, month: number): Record<string, DayExtra> {
  const result: Record<string, DayExtra> = {};
  const daysInMonth = new Date(year, month, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const extra = getDayExtra(year, month, day);
    if (extra.jieqi || extra.holiday) {
      const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      result[key] = extra;
    }
  }
  
  return result;
}
