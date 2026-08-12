import { prisma } from '@/lib/db';
import { ApiError } from '@/lib/errors';

const THRESHOLD = Number(process.env.CAPTCHA_THRESHOLD || 3);

// บังคับ CAPTCHA เฉพาะเมื่อมีสัญญาณผิดปกติ (ล้มเหลวซ้ำจาก IP เดียวใน 15 นาที)
export async function captchaGate(ip: string, token?: string) {
  if ((process.env.CAPTCHA_PROVIDER || 'off') === 'off') return;
  const since = new Date(Date.now() - 15 * 60_000);
  const fails = await prisma.authLog.count({
    where: {
      ip,
      event: { in: ['login.failed', 'ratelimit.block'] },
      createdAt: { gte: since },
    },
  });
  if (fails < THRESHOLD) return;
  if (!token) throw new ApiError('CAPTCHA_REQUIRED');
  const ok = await verifyCaptcha(token, ip);
  if (!ok) throw new ApiError('CAPTCHA_REQUIRED');
}

async function verifyCaptcha(token: string, ip: string) {
  const url =
    process.env.CAPTCHA_PROVIDER === 'recaptcha'
      ? 'https://www.google.com/recaptcha/api/siteverify'
      : 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
  const body = new URLSearchParams({
    secret: process.env.CAPTCHA_SECRET || '',
    response: token,
    remoteip: ip,
  });
  const r = await fetch(url, { method: 'POST', body });
  const j = (await r.json().catch(() => ({}))) as { success?: boolean };
  return !!j.success;
}
