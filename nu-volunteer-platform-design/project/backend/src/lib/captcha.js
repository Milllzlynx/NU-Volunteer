import { prisma } from './db.js';
import { ApiError } from './errors.js';

const THRESHOLD = Number(process.env.CAPTCHA_THRESHOLD || 3);

// บังคับ CAPTCHA เฉพาะเมื่อมีสัญญาณผิดปกติ (ล้มเหลวซ้ำจาก IP เดียวใน 15 นาที)
export async function captchaGate(req, _res, next) {
  try {
    if ((process.env.CAPTCHA_PROVIDER || 'off') === 'off') return next();
    const since = new Date(Date.now() - 15 * 60_000);
    const fails = await prisma.authLog.count({
      where: { ip: req.ip, event: { in: ['login.failed', 'ratelimit.block'] }, createdAt: { gte: since } },
    });
    if (fails < THRESHOLD) return next();
    const token = req.body?.captchaToken;
    if (!token) throw new ApiError('CAPTCHA_REQUIRED');
    const ok = await verifyCaptcha(token, req.ip);
    if (!ok) throw new ApiError('CAPTCHA_REQUIRED');
    next();
  } catch (e) { next(e); }
}

async function verifyCaptcha(token, ip) {
  const url = process.env.CAPTCHA_PROVIDER === 'recaptcha'
    ? 'https://www.google.com/recaptcha/api/siteverify'
    : 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
  const body = new URLSearchParams({ secret: process.env.CAPTCHA_SECRET || '', response: token, remoteip: ip });
  const r = await fetch(url, { method: 'POST', body });
  const j = await r.json().catch(() => ({}));
  return !!j.success;
}
