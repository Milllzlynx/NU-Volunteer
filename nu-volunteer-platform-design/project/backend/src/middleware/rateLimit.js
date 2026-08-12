import rateLimit from 'express-rate-limit';
import { authLog } from '../lib/db.js';

const max = Number(process.env.LOGIN_RATE_MAX || 5);

function make(name, limit, windowMs) {
  return rateLimit({
    windowMs, limit, standardHeaders: true, legacyHeaders: false,
    // นับเฉพาะคำขอที่ล้มเหลว — ผู้ใช้ที่พิมพ์ผิด 1-2 ครั้งแล้วเข้าได้จะไม่โดนบล็อก
    skipSuccessfulRequests: true,
    keyGenerator: (req) => req.ip + '|' + String(req.body?.email || '').toLowerCase(),
    handler: async (req, res) => {
      await authLog('ratelimit.block', { email: req.body?.email || '', ip: req.ip, detail: name });
      res.status(429).json({ ok: false, code: 'RATE_LIMITED', message: 'พยายามมากเกินไป กรุณารอสักครู่แล้วลองใหม่' });
    },
  });
}

export const loginLimiter = make('login', max, 60_000);           // 5 ครั้ง/นาที
export const registerLimiter = make('register', max, 60_000);
export const forgotLimiter = make('forgot', 3, 15 * 60_000);      // 3 ครั้ง/15 นาที
