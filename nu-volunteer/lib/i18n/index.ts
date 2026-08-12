import dictionary from './app-en.json';

export type Lang = 'th' | 'en';

export const LANG_COOKIE = 'nuv-lang';

/**
 * คีย์ของพจนานุกรมคือ "ข้อความไทยตัวเต็ม" ตามกฎใน DESIGN-SYSTEM.md §3
 * ทำให้อ่านโค้ดออกโดยไม่ต้องเปิดตารางแปล และข้อความไทยยังทำงานได้แม้ยังไม่มีคำแปล
 */
const EN = dictionary as Record<string, string>;

/** แปลข้อความ — คืนข้อความไทยเดิมถ้ายังไม่มีคำแปล */
export function translate(th: string, lang: Lang): string {
  if (lang !== 'en') return th;
  return EN[th] ?? th;
}

/** แปลบางส่วน: ใช้กับข้อความที่มีค่าตัวแปรต่อท้าย เช่น PT('เปลี่ยนสไตล์เป็น') + ' ' + name */
export function translatePrefix(th: string, lang: Lang): string {
  return translate(th, lang);
}

/** ใส่ค่าตัวแปรลงในข้อความ: fill('เหลือ {n} ที่', {n: 3}) */
export function fill(s: string, vars: Record<string, unknown>): string {
  return String(s).replace(/\{(\w+)\}/g, (_, k: string) =>
    vars[k] != null ? String(vars[k]) : '—',
  );
}

export function normalizeLang(v: unknown): Lang {
  return v === 'en' ? 'en' : 'th';
}

/** true ถ้ายังไม่มีคำแปลของข้อความนี้ — ใช้ตรวจความครบถ้วนของพจนานุกรมในเทสต์ */
export function isUntranslated(th: string): boolean {
  return EN[th] === undefined;
}

export const dictionarySize = Object.keys(EN).length;
