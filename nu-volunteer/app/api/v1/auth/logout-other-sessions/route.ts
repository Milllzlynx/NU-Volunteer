import { NextResponse } from 'next/server';
import { authLog, prisma } from '@/lib/db';
import { handler } from '@/lib/errors';
import { requireUser } from '@/lib/auth';
import { currentRefreshHash, requestContext } from '@/lib/tokens';

/* POST /api/v1/auth/logout-other-sessions */
export const POST = handler(async (req) => {
  const user = await requireUser();
  const hash = await currentRefreshHash();
  const r = await prisma.session.updateMany({
    where: { userId: user.id, revokedAt: null, NOT: { refreshHash: hash } },
    data: { revokedAt: new Date() },
  });

  const { ip, userAgent } = requestContext(req);
  await authLog('logout.others', { email: user.email, ip, userAgent, detail: String(r.count) });

  return NextResponse.json({ ok: true, revoked: r.count });
});
