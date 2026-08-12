import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { ApiError, handler } from '@/lib/errors';
import { RT_COOKIE, issueSession, setAuthCookies, sha256 } from '@/lib/tokens';
import { publicUser } from '@/lib/auth';

/* POST /api/v1/auth/refresh — ต่ออายุ access token ด้วย refresh cookie (rotation) */
export const POST = handler(async (req) => {
  const jar = await cookies();
  const rt = jar.get(RT_COOKIE)?.value;
  if (!rt) throw new ApiError('UNAUTHORIZED');

  const session = await prisma.session.findUnique({
    where: { refreshHash: sha256(rt) },
    include: { user: true },
  });
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw new ApiError('UNAUTHORIZED');
  }
  if (session.user.tokensValidFrom > session.createdAt) throw new ApiError('UNAUTHORIZED');
  if (!session.user.active) throw new ApiError('ACCOUNT_DISABLED');

  // rotation: เพิกถอนใบเดิมทันทีที่ออกใบใหม่ — refresh token ใช้ซ้ำไม่ได้
  await prisma.session.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });

  const tokens = await issueSession(session.user, req);
  await setAuthCookies(tokens);

  return NextResponse.json({ ok: true, account: publicUser(session.user) });
});
