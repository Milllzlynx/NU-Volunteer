import { NextResponse } from 'next/server';
import { authLog, prisma } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { captchaGate } from '@/lib/captcha';
import { checkLimit, loginLimiter, recordFailure, resetLimit } from '@/lib/rateLimit';
import { issueSession, requestContext, setAuthCookies, verifyPassword } from '@/lib/tokens';
import { publicUser } from '@/lib/auth';
import { normEmail, readJson } from '@/lib/validation';

/* POST /api/v1/auth/login */
export const POST = handler(async (req) => {
  const body = await readJson<{ email?: string; password?: string; captchaToken?: string }>(req);
  const email = normEmail(body.email);
  const password = String(body.password ?? '');
  const { ip, userAgent } = requestContext(req);

  await checkLimit(loginLimiter, ip, email);
  await captchaGate(ip, body.captchaToken);

  if (!email || !password) {
    recordFailure(loginLimiter, ip, email);
    fail('INVALID_CREDENTIALS');
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // ข้อความเดียวกันทั้งกรณีไม่มีบัญชีและรหัสผิด เพื่อไม่ให้ใช้ฟอร์มสแกนหาอีเมลที่มีบัญชี
  const ok = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!ok || !user) {
    recordFailure(loginLimiter, ip, email);
    await authLog('login.failed', { email, ip, userAgent });
    fail('INVALID_CREDENTIALS');
  }
  if (!user.active) fail('ACCOUNT_DISABLED');

  const tokens = await issueSession(user, req);
  await setAuthCookies(tokens);
  resetLimit(loginLimiter, ip, email);
  await authLog('login.success', { email, ip, userAgent });

  return NextResponse.json({ ok: true, account: publicUser(user) });
});
