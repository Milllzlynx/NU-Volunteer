import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { readJson } from '@/lib/validation';

import { CANCEL_LEAD_DAYS } from '@/lib/activities';

/* POST /api/v1/registrations/[id]/cancel — นิสิตขอยกเลิกการเข้าร่วม */
export const POST = handler(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireRole('student');
  const { id } = await ctx.params;
  const body = await readJson<{ reason?: string }>(req);
  const reason = String(body.reason ?? '').trim();
  if (!reason) fail('VALIDATION_ERROR', 'กรุณาระบุเหตุผลในการยกเลิก');

  const registration = await prisma.registration.findUnique({
    where: { id },
    include: { activity: { select: { startAt: true } } },
  });
  // ไม่บอกว่าใบสมัครของคนอื่นมีอยู่จริง — ตอบเหมือนไม่พบ
  if (!registration || registration.userId !== user.id) fail('NOT_FOUND');
  if (registration.cancelRequested && registration.cancelStatus === 'pending') fail('CANCEL_REQUESTED');
  if (['completed', 'cancelled', 'no-show'].includes(registration.status)) fail('CANCEL_NOT_ALLOWED');

  const deadline = new Date(
    registration.activity.startAt.getTime() - CANCEL_LEAD_DAYS * 24 * 3600_000,
  );
  if (new Date() > deadline) fail('CANCEL_TOO_LATE');

  const updated = await prisma.registration.update({
    where: { id },
    data: { cancelRequested: true, cancelReason: reason, cancelStatus: 'pending' },
  });

  return NextResponse.json({
    ok: true,
    registration: { id: updated.id, status: updated.status, cancelStatus: updated.cancelStatus },
  });
});
