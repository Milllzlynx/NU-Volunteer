/**
 * คณิตศาสตร์ปฏิทินที่ใช้ร่วมกันระหว่างปฏิทินของนิสิตและของผู้จัดกิจกรรม
 *
 * ทุกฟังก์ชันรับ/คืนคีย์ YYYY-MM-DD และคำนวณผ่าน Date.UTC เท่านั้น
 * จึงไม่มีทางเลื่อนวันเพราะเขตเวลาของเครื่องผู้ใช้
 *
 * ป้ายเดือน/วันประกอบเองแทนการใช้ Intl เพื่อให้ผลฝั่งเซิร์ฟเวอร์กับฝั่งไคลเอนต์ตรงกันเสมอ
 * (ไทยใช้ พ.ศ. ซึ่ง Intl บางรุ่นให้ผลต่างกัน แล้วจะเกิด hydration mismatch)
 */

const parseKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return { y, m: m - 1, d };
};

const toKey = (dt: Date) => dt.toISOString().slice(0, 10);

export function addDays(key: string, n: number): string {
  const { y, m, d } = parseKey(key);
  return toKey(new Date(Date.UTC(y, m, d + n)));
}

export function addMonths(key: string, n: number): string {
  const { y, m } = parseKey(key);
  return toKey(new Date(Date.UTC(y, m + n, 1)));
}

export function firstOfMonth(key: string): string {
  const { y, m } = parseKey(key);
  return toKey(new Date(Date.UTC(y, m, 1)));
}

/** 0 = อาทิตย์ */
export function weekday(key: string): number {
  const { y, m, d } = parseKey(key);
  return new Date(Date.UTC(y, m, d)).getUTCDay();
}

export const startOfWeek = (key: string) => addDays(key, -weekday(key));
export const sameMonth = (a: string, b: string) => a.slice(0, 7) === b.slice(0, 7);
export const dayNum = (key: string) => Number(key.slice(8, 10));

export const MONTHS_TH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
export const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const DOW_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
export const DOW_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function monthLabel(key: string, isEn: boolean): string {
  const { y, m } = parseKey(key);
  return isEn ? `${MONTHS_EN[m]} ${y}` : `${MONTHS_TH[m]} ${y + 543}`;
}

export function fullDayLabel(key: string, isEn: boolean): string {
  const { y, m, d } = parseKey(key);
  const dow = isEn ? DOW_EN[weekday(key)] : DOW_TH[weekday(key)];
  return isEn ? `${dow} ${d} ${MONTHS_EN[m]} ${y}` : `${dow}. ${d} ${MONTHS_TH[m]} ${y + 543}`;
}
