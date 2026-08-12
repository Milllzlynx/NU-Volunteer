import { fail } from '@/lib/errors';

const DOMAIN = process.env.EMAIL_DOMAIN || 'nu.ac.th';

export const normEmail = (e: unknown) => String(e ?? '').trim().toLowerCase();

// validation ทั้งหมดทำซ้ำที่ฝั่งเซิร์ฟเวอร์ — ไม่เชื่อฝั่ง client
export function assertPassword(pw: unknown) {
  const s = String(pw ?? '');
  if (s.length < 8) fail('WEAK_PASSWORD', 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร');
  if (!/[A-Za-z]/.test(s) || !/[0-9]/.test(s)) fail('WEAK_PASSWORD', 'ต้องมีทั้งตัวอักษรและตัวเลข');
}

export function assertDomain(email: string) {
  const re = new RegExp('@' + DOMAIN.replace(/\./g, '\\.') + '$');
  if (!re.test(email)) fail('EMAIL_DOMAIN');
}

/** อ่าน JSON body แบบไม่โยน error เมื่อ body ว่าง */
export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

/** ความแข็งแรงรหัสผ่าน 0-3 — ใช้ร่วมกันระหว่างตัววัดบนหน้าเว็บและฝั่งเซิร์ฟเวอร์ */
export function passwordScore(pw: string): 0 | 1 | 2 | 3 {
  const s = String(pw || '');
  if (s.length < 8) return 0;
  let score = 1;
  if (s.length >= 12) score++;
  if (/[A-Za-z]/.test(s) && /[0-9]/.test(s) && /[^A-Za-z0-9]/.test(s)) score++;
  return Math.min(score, 3) as 0 | 1 | 2 | 3;
}
