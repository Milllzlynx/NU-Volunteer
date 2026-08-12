import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { requireUser } from '@/lib/auth';
import {
  currentRefreshHash,
  deviceName,
  hashPassword,
  issueSession,
  requestContext,
  setAuthCookies,
  verifyPassword,
} from '@/lib/tokens';
import { sendMail } from '@/lib/mailer';
import { assertPassword, readJson } from '@/lib/validation';

/* POST /api/v1/auth/password — เปลี่ยนรหัสผ่าน + เพิกถอนเซสชันอื่นทั้งหมด */
export const POST = handler(async (req) => {
  const user = await requireUser();
  const body = await readJson<{ current?: string; next?: string; lang?: string }>(req);

  assertPassword(body.next);
  if (String(body.current) === String(body.next)) fail('SAME_PASSWORD');
  if (!(await verifyPassword(String(body.current ?? ''), user.passwordHash))) {
    fail('INVALID_CREDENTIALS', 'รหัสผ่านปัจจุบันไม่ถูกต้อง');
  }

  const now = new Date();
  await prisma.user.update({
    where: { id: user.id },
    // tokensValidFrom ทำให้ access token เก่าใช้ไม่ได้ทันที
    data: { passwordHash: await hashPassword(String(body.next)), tokensValidFrom: now },
  });

  const hash = await currentRefreshHash();
  await prisma.session.updateMany({
    where: { userId: user.id, revokedAt: null, NOT: { refreshHash: hash } },
    data: { revokedAt: now },
  });

  // ออก token ใหม่ให้อุปกรณ์ปัจจุบัน ไม่งั้นผู้ใช้จะหลุดทันทีที่เปลี่ยนรหัสผ่านสำเร็จ
  const tokens = await issueSession(user, req);
  await setAuthCookies(tokens);

  const { userAgent } = requestContext(req);
  sendMail('password.changed', {
    to: user.email,
    lang: body.lang,
    vars: { time: now.toLocaleString('th-TH'), device: deviceName(userAgent) },
  }).catch(() => {});

  const remaining = await prisma.session.count({ where: { userId: user.id, revokedAt: null } });
  return NextResponse.json({ ok: true, revoked: true, sessionsRemaining: remaining });
});
