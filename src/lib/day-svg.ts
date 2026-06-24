/**
 * 24节气图片映射
 * 使用 public/24SolarTerms/ 目录下的 PNG 图片作为日历格子装饰
 */

// 24节气 -> 图片路径映射（编号对应目录中的文件序号）
const JIEQI_IMAGES: Record<string, string> = {
  '立春': '/24SolarTerms/01_立春.png',
  '雨水': '/24SolarTerms/02_雨水.png',
  '惊蛰': '/24SolarTerms/03_惊蛰.png',
  '春分': '/24SolarTerms/04_春分.png',
  '清明': '/24SolarTerms/05_清明.png',
  '谷雨': '/24SolarTerms/06_谷雨.png',
  '立夏': '/24SolarTerms/07_立夏.png',
  '小满': '/24SolarTerms/08_小满.png',
  '芒种': '/24SolarTerms/09_芒种.png',
  '夏至': '/24SolarTerms/10_夏至.png',
  '小暑': '/24SolarTerms/11_小暑.png',
  '大暑': '/24SolarTerms/12_大暑.png',
  '立秋': '/24SolarTerms/13_立秋.png',
  '处暑': '/24SolarTerms/14_处暑.png',
  '白露': '/24SolarTerms/15_白露.png',
  '秋分': '/24SolarTerms/16_秋分.png',
  '寒露': '/24SolarTerms/17_寒露.png',
  '霜降': '/24SolarTerms/18_霜降.png',
  '立冬': '/24SolarTerms/19_立冬.png',
  '小雪': '/24SolarTerms/20_小雪.png',
  '大雪': '/24SolarTerms/21_大雪.png',
  '冬至': '/24SolarTerms/22_冬至.png',
  '小寒': '/24SolarTerms/23_小寒.png',
  '大寒': '/24SolarTerms/24_大寒.png',
};

// 节日 -> 图片路径映射
const HOLIDAY_IMAGES: Record<string, string> = {
  '元旦': '/holidays/元旦.png',
  '春节': '/holidays/春节.png',
  '元宵节': '/holidays/元宵节.png',
  '龙抬头': '/holidays/龙抬头.png',
  '清明节': '/holidays/清明节.png',
  '妇女节': '/holidays/妇女节.png',
  '植树节': '/holidays/植树节.png',
  '青年节': '/holidays/青年节.png',
  '劳动节': '/holidays/劳动节.png',
  '儿童节': '/holidays/儿童节.png',
  '端午节': '/holidays/端午节.png',
  '建党节': '/holidays/建党节.png',
  '建军节': '/holidays/建军节.png',
  '七夕节': '/holidays/七夕节.png',
  '教师节': '/holidays/教师节.png',
  '中秋节': '/holidays/中秋节.png',
  '国庆节': '/holidays/国庆节.png',
  '重阳节': '/holidays/重阳节.png',
  '腊八节': '/holidays/腊八节.png',
  '小年': '/holidays/小年.png',
  '除夕': '/holidays/除夕.png',
};

/**
 * 获取节气或节日对应的图片路径
 */
export function getDayImage(jieqi?: string, holiday?: string): string | undefined {
  if (jieqi && JIEQI_IMAGES[jieqi]) return JIEQI_IMAGES[jieqi];
  if (holiday && HOLIDAY_IMAGES[holiday]) return HOLIDAY_IMAGES[holiday];
  return undefined;
}
