import { NextResponse } from 'next/server';
import { authLog, prisma } from '@/lib/db';
import { handler } from '@/lib/errors';
import { captchaGate } from '@/lib/captcha';
import { checkLimit, forgotLimiter, recordFailure } from '@/lib/rateLimit';
import { randomToken, requestContext, sha256 } from '@/lib/tokens';
import { sendMail } from '@/lib/mailer';
import { normEmail, readJson } from '@/lib/validation';

const RESET_TTL = Number(process.env.RESET_TTL_MINUTES || 30) * 60_000;

/* POST /api/v1/auth/forgot — ตอบเหมือนกันทุกกรณี ไม่เปิดเผยว่าอีเมลมีบัญชีหรือไม่ */
export const POST = handler(async (req) => {
  const body = await readJson<{
    email?: string;
    lang?: string;
    baseLink?: string;
    captchaToken?: string;
  }>(req);

  const email = normEmail(body.email);
  const { ip, userAgent } = requestContext(req);

  await checkLimit(forgotLimiter, ip, email);
  await captchaGate(ip, body.captchaToken);
  // ทุกคำขอ forgot นับเข้าโควตา — ไม่เช่นนั้นจะใช้ยิงอีเมลรบกวนผู้อื่นได้ไม่จำกัด
  recordFailure(forgotLimiter, ip, email);

  const user = await prisma.user.findUnique({ where: { email } });
  await authLog('forgot', { email, ip, userAgent });

  if (user) {
    const token = randomToken();
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() }, // ยกเลิกลิงก์เก่าทั้งหมด
    });
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + RESET_TTL),
      },
    });

    const base =
      body.baseLink || `${process.env.APP_BASE_URL || 'http://localhost:3000'}/reset`;
    await sendMail('password.reset-requested', {
      to: email,
      lang: body.lang,
      vars: { email, link: `${base}?token=${token}`, ttl: Math.round(RESET_TTL / 60000) },
    }).catch((e) => console.error('[mail]', (e as Error).message));
  }

  // ไม่คืน token ให้ client เด็ดขาด
  return NextResponse.json({ ok: true, sent: true });
});
