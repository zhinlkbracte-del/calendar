declare module 'lunar-javascript' {
  export class Solar {
    static fromDate(date: Date): Solar;
    static fromYmd(year: number, month: number, day: number): Solar;
    getLunar(): Lunar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
  }
  export class Lunar {
    getJieQi(): string;
    getFestivals(): string[];
    getYearInChinese(): string;
    getMonthInChinese(): string;
    getDayInChinese(): string;
    getMonth(): number;
    getDay(): number;
  }
}
