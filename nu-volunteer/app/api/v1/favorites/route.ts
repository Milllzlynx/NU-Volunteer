import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { readJson } from '@/lib/validation';

/* POST /api/v1/favorites — สลับสถานะรายการโปรดของกิจกรรม */
export const POST = handler(async (req) => {
  const user = await requireRole('student');
  const body = await readJson<{ activityId?: string }>(req);
  const activityId = String(body.activityId ?? '');
  if (!activityId) fail('VALIDATION_ERROR');

  const where = { userId_activityId: { userId: user.id, activityId } };
  const existing = await prisma.favorite.findUnique({ where });

  if (existing) {
    await prisma.favorite.delete({ where });
    return NextResponse.json({ ok: true, favorited: false });
  }

  const activity = await prisma.activity.findUnique({ where: { id: activityId }, select: { id: true } });
  if (!activity) fail('NOT_FOUND');

  await prisma.favorite.create({ data: { userId: user.id, activityId } });
  return NextResponse.json({ ok: true, favorited: true });
});
