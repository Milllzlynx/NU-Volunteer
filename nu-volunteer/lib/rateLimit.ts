import { authLog } from '@/lib/db';
import { ApiError } from '@/lib/errors';

/**
 * Rate limit แบบ in-memory (นับเฉพาะครั้งที่ล้มเหลว เหมือน skipSuccessfulRequests ของเดิม)
 *
 * ข้อจำกัด: นับแยกต่อ process — ถ้า deploy หลาย instance ต้องย้ายไปใช้ store กลาง
 * (Redis / Upstash) โดยเปลี่ยนเฉพาะ hit()/reset() ในไฟล์นี้
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// กันหน่วยความจำโตไม่สิ้นสุดในระบบที่รันยาว
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}

export type Limiter = {
  name: string;
  limit: number;
  windowMs: number;
};

export const loginLimiter: Limiter = {
  name: 'login',
  limit: Number(process.env.LOGIN_RATE_MAX || 5),
  windowMs: 60_000,
};
export const registerLimiter: Limiter = {
  name: 'register',
  limit: Number(process.env.LOGIN_RATE_MAX || 5),
  windowMs: 60_000,
};
export const forgotLimiter: Limiter = { name: 'forgot', limit: 3, windowMs: 15 * 60_000 };

const keyOf = (l: Limiter, ip: string, email: string) =>
  `${l.name}|${ip}|${String(email || '').toLowerCase()}`;

/** เรียกก่อนทำงาน — โยน RATE_LIMITED ถ้าเกินโควตาที่ล้มเหลวไปแล้ว */
export async function checkLimit(limiter: Limiter, ip: string, email: string) {
  const now = Date.now();
  sweep(now);
  const key = keyOf(limiter, ip, email);
  const b = buckets.get(key);
  if (b && b.resetAt > now && b.count >= limiter.limit) {
    await authLog('ratelimit.block', { email, ip, detail: limiter.name });
    throw new ApiError('RATE_LIMITED');
  }
}

/** เรียกเมื่อคำขอล้มเหลว — เพิ่มตัวนับของหน้าต่างเวลาปัจจุบัน */
export function recordFailure(limiter: Limiter, ip: string, email: string) {
  const now = Date.now();
  const key = keyOf(limiter, ip, email);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + limiter.windowMs });
  } else {
    b.count += 1;
  }
}

/** เรียกเมื่อสำเร็จ — ล้างตัวนับ (ผู้ใช้ที่พิมพ์ผิด 1-2 ครั้งแล้วเข้าได้จะไม่โดนบล็อก) */
export function resetLimit(limiter: Limiter, ip: string, email: string) {
  buckets.delete(keyOf(limiter, ip, email));
}
