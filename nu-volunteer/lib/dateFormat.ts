/**
 * รูปแบบวันเวลาที่ใช้ร่วมกันทั้งแอป
 *
 * ทุกตัวจัดรูปแบบผ่าน Intl พร้อมตรึง timeZone เป็น Asia/Bangkok ด้วยเหตุผลเดียวกับ
 * lib/activities.ts — ถ้าไม่ตรึง ผลฝั่งเซิร์ฟเวอร์ (มัก UTC ตอน deploy) จะไม่ตรงกับฝั่งเบราว์เซอร์
 * แล้วเกิด hydration mismatch หรือแสดงเวลาเพี้ยนไป 7 ชั่วโมง
 *
 * ไม่ใช้ date-fns เพราะ Intl ให้ผลที่ต้องการอยู่แล้ว: th-TH คืนปี พ.ศ. ให้เอง (2569)
 * ส่วน format() ของ date-fns ยึดเขตเวลาของเครื่องที่รัน และไม่แปลง พ.ศ. ให้
 *
 * ทุกฟังก์ชันรับ isEn เพราะแอปมีสวิตช์ไทย/อังกฤษที่ใช้งานจริง — ดู lib/i18n/app-en.json
 */

const TZ = 'Asia/Bangkok';

/** ตัวจัดรูปแบบสร้างครั้งเดียวแล้วใช้ซ้ำ — การสร้าง Intl ใหม่ทุกครั้งช้ากว่ามากเมื่อเรนเดอร์เป็นร้อยแถว */
const F = {
  dateTh: new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ }),
  dateEn: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ }),
  weekdayTh: new Intl.DateTimeFormat('th-TH', { weekday: 'long', timeZone: TZ }),
  weekdayEn: new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: TZ }),
  time: new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ }),
  timeSec: new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: TZ,
  }),
};

/**
 * รูปแบบตัวเลขล้วน วัน/เดือน/ปี
 *
 * ใช้ en-GB เพราะให้ dd/mm/yyyy ตามที่ต้องการ และคืนปีคริสต์ศักราชตรงกับค่าที่เก็บจริง
 * ไม่ใช้ th-TH ตรงนี้ เพราะ th-TH จะแปลงเป็น พ.ศ. ให้ (14/09/2569) ซึ่งอ่านคู่กับ
 * ช่องกรอกที่ค่าข้างในเป็น ค.ศ. แล้วสับสน — ปี พ.ศ. เก็บไว้ใช้ตอนแสดงผลอย่างเดียว
 */
const NUMERIC = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: TZ,
});

const toDate = (d: Date | string | number): Date => (d instanceof Date ? d : new Date(d));

/** "14/09/2026" — รูปแบบวัน/เดือน/ปีสำหรับกำกับช่องกรอกวันที่ */
export function formatDateNumeric(date: Date | string | number): string {
  return NUMERIC.format(toDate(date));
}

/** "14/09/2026 08:00" — เหมือนบนแต่มีเวลาแบบ 24 ชั่วโมงต่อท้าย */
export function formatDateTimeNumeric(date: Date | string | number): string {
  const d = toDate(date);
  return `${NUMERIC.format(d)} ${F.time.format(d)}`;
}

/** "14 ส.ค. 2569" · "14 Aug 2026" */
export function formatDate(date: Date | string | number, isEn = false): string {
  const d = toDate(date);
  return (isEn ? F.dateEn : F.dateTh).format(d);
}

/** "20:16" — ไม่มีวินาที ใช้กับช่วงเวลาของกิจกรรม */
export function formatTime(date: Date | string | number): string {
  return F.time.format(toDate(date));
}

/** "20:16:03" — มีวินาที ใช้กับบันทึกเหตุการณ์ที่ต้องละเอียด */
export function formatTimeWithSeconds(date: Date | string | number): string {
  return F.timeSec.format(toDate(date));
}

/**
 * "วันศุกร์ที่ 14 ส.ค. 2569" · "Friday 14 Aug 2026"
 *
 * th-TH คืนชื่อวันมาพร้อมคำว่า "วัน" อยู่แล้ว ("วันศุกร์") จึงต่อ "ที่" ตรง ๆ
 * ถ้าเติม "วัน" เองอีกจะกลายเป็น "วันวันศุกร์ที่"
 */
export function formatDateWithDay(date: Date | string | number, isEn = false): string {
  const d = toDate(date);
  if (isEn) return `${F.weekdayEn.format(d)} ${F.dateEn.format(d)}`;
  return `${F.weekdayTh.format(d)}ที่ ${F.dateTh.format(d)}`;
}

/** "20:16:03 วันศุกร์ที่ 14 ส.ค. 2569" · "20:16:03 Friday 14 Aug 2026" */
export function formatDateTime(date: Date | string | number, isEn = false): string {
  const d = toDate(date);
  return `${formatTimeWithSeconds(d)} ${formatDateWithDay(d, isEn)}`;
}

const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

/**
 * "2 ชั่วโมงที่แล้ว" · "2 hours ago"
 *
 * เกิน 7 วันแล้วคืนวันที่จริง เพราะ "45 วันที่แล้ว" อ่านยากกว่าวันที่
 * รับ now เข้ามาได้เพื่อให้ผลคงที่ — ฝั่งเซิร์ฟเวอร์กับฝั่งเบราว์เซอร์เรียกคนละเวลา
 * ถ้าปล่อยให้อ่านนาฬิกาเองทั้งคู่ ข้อความจะไม่ตรงกันตอน hydrate
 */
export function formatRelative(
  date: Date | string | number,
  isEn = false,
  now: Date | number = Date.now(),
): string {
  const then = toDate(date).getTime();
  const ref = now instanceof Date ? now.getTime() : now;
  const diff = ref - then;

  // เวลาในอนาคต (เช่น กิจกรรมที่ยังไม่ถึง) ไม่ใช่หน้าที่ของฟังก์ชันนี้ คืนวันที่ไปเลย
  if (diff < 0) return formatDate(date, isEn);

  if (diff < MIN) return isEn ? 'just now' : 'เมื่อสักครู่';

  if (diff < HOUR) {
    const n = Math.floor(diff / MIN);
    return isEn ? `${n} minute${n === 1 ? '' : 's'} ago` : `${n} นาทีที่แล้ว`;
  }

  if (diff < DAY) {
    const n = Math.floor(diff / HOUR);
    return isEn ? `${n} hour${n === 1 ? '' : 's'} ago` : `${n} ชั่วโมงที่แล้ว`;
  }

  if (diff < 7 * DAY) {
    const n = Math.floor(diff / DAY);
    return isEn ? `${n} day${n === 1 ? '' : 's'} ago` : `${n} วันที่แล้ว`;
  }

  return formatDate(date, isEn);
}

/* ───────────────── รูปแบบ วัน/เดือน/ปี สำหรับช่องกรอก ───────────────── */

/** จำนวนวันของเดือนนั้นจริง ๆ — วันที่ 0 ของเดือนถัดไปคือวันสุดท้ายของเดือนนี้ (คิดปีอธิกสุรทินให้เอง) */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * แปลง "14/09/2026" เป็นส่วนประกอบ — คืน null เมื่อไม่ใช่วันที่ที่มีอยู่จริง
 *
 * ตรวจจำนวนวันของเดือนเองแทนที่จะโยนให้ new Date() เพราะ Date จะม้วน 31/02 ไปเป็น 3 มี.ค.
 * เงียบ ๆ ผู้ใช้ที่พิมพ์ผิดจะได้วันที่ที่ไม่ได้ตั้งใจโดยไม่มีอะไรเตือน
 */
export function parseDmy(text: string): { y: number; m: number; d: number } | null {
  const hit = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!hit) return null;
  const d = Number(hit[1]);
  const m = Number(hit[2]);
  const y = Number(hit[3]);
  if (m < 1 || m > 12) return null;
  if (y < 2000 || y > 2200) return null;
  if (d < 1 || d > daysInMonth(y, m)) return null;
  return { y, m, d };
}

/** "2026-09-14" (หรือมีเวลาต่อท้าย) → "14/09/2026" */
export function isoToDmy(iso: string): string {
  const hit = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return hit ? `${hit[3]}/${hit[2]}/${hit[1]}` : '';
}

/** ใส่ทับให้เองระหว่างพิมพ์ โดยยึดจากตัวเลขล้วน — กด backspace แล้วยังถอยได้ตามปกติ */
export function maskDmy(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  let out = digits.slice(0, 2);
  if (digits.length > 2) out += `/${digits.slice(2, 4)}`;
  if (digits.length > 4) out += `/${digits.slice(4, 8)}`;
  return out;
}
