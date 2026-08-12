import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { handler } from '@/lib/errors';
import { RT_COOKIE, clearAuthCookies, sha256 } from '@/lib/tokens';

/* POST /api/v1/auth/logout — เพิกถอนเซสชันปัจจุบัน + ล้าง cookie */
export const POST = handler(async () => {
  const jar = await cookies();
  const rt = jar.get(RT_COOKIE)?.value;
  if (rt) {
    await prisma.session.updateMany({
      where: { refreshHash: sha256(rt) },
      data: { revokedAt: new Date() },
    });
  }
  await clearAuthCookies();
  return NextResponse.json({ ok: true });
});
