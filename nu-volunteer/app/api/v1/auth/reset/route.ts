import { NextResponse } from 'next/server';
import { authLog, prisma } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { deviceName, hashPassword, requestContext, sha256 } from '@/lib/tokens';
import { sendMail } from '@/lib/mailer';
import { assertPassword, readJson } from '@/lib/validation';

/* POST /api/v1/auth/reset */
export const POST = handler(async (req) => {
  const body = await readJson<{ token?: string; password?: string; lang?: string }>(req);
  assertPassword(body.password);

  const rec = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: sha256(body.token || '') },
    include: { user: true },
  });
  if (!rec) fail('TOKEN_INVALID');
  if (rec.usedAt) fail('TOKEN_USED');
  if (rec.expiresAt < new Date()) fail('TOKEN_EXPIRED');

  const now = new Date();
  await prisma.$transaction([
    prisma.user.update({
      where: { id: rec.userId },
      data: { passwordHash: await hashPassword(String(body.password)), tokensValidFrom: now },
    }),
    prisma.passwordResetToken.update({ where: { id: rec.id }, data: { usedAt: now } }),
    // ตั้งรหัสใหม่แล้วต้องเตะทุกอุปกรณ์ออก รวมถึงอุปกรณ์ของผู้บุกรุกที่อาจล็อกอินค้างอยู่
    prisma.session.updateMany({
      where: { userId: rec.userId, revokedAt: null },
      data: { revokedAt: now },
    }),
  ]);

  const { ip, userAgent } = requestContext(req);
  await authLog('reset', { email: rec.user.email, ip, userAgent });

  sendMail('password.changed', {
    to: rec.user.email,
    lang: body.lang,
    vars: { time: now.toLocaleString('th-TH'), device: deviceName(userAgent) },
  }).catch(() => {});

  return NextResponse.json({ ok: true, email: rec.user.email });
});
