import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { handler } from '@/lib/errors';
import { requireUser } from '@/lib/auth';
import { currentRefreshHash } from '@/lib/tokens';

/* GET /api/v1/auth/sessions — รายการอุปกรณ์ที่ล็อกอินอยู่ */
export const GET = handler(async () => {
  const user = await requireUser();
  const list = await prisma.session.findMany({
    where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastSeenAt: 'desc' },
  });
  const hash = await currentRefreshHash();

  return NextResponse.json({
    ok: true,
    sessions: list.map((s) => ({
      id: s.id,
      device: s.device,
      ip: s.ip,
      lastSeenAt: s.lastSeenAt,
      current: s.refreshHash === hash,
    })),
  });
});
