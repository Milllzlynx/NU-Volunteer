import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { SEAT_TAKEN, registrationBlock } from '@/lib/activities';
import { prisma } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { readJson } from '@/lib/validation';

/* POST /api/v1/registrations — นิสิตสมัครเข้าร่วมกิจกรรม */
export const POST = handler(async (req) => {
  const user = await requireRole('student');
  const body = await readJson<{ activityId?: string }>(req);
  const activityId = String(body.activityId ?? '');
  if (!activityId) fail('VALIDATION_ERROR');

  const now = new Date();

  const registration = await prisma.$transaction(async (tx) => {
    const activity = await tx.activity.findUnique({ where: { id: activityId } });
    if (!activity) fail('NOT_FOUND');

    // ใช้กติกาชุดเดียวกับที่หน้าจอใช้ตัดสินว่าจะเปิดปุ่มให้กดหรือไม่ (lib/activities.ts)
    const block = registrationBlock(activity, now);
    if (block === 'not-open-yet') fail('REGISTRATION_NOT_OPEN');
    if (block === 'closed') fail('ACTIVITY_CLOSED');

    const existing = await tx.registration.findUnique({
      where: { userId_activityId: { userId: user.id, activityId } },
    });
    // ใบสมัครที่ยกเลิกไปแล้วสมัครใหม่ได้ สถานะอื่นถือว่าสมัครแล้ว
    if (existing && existing.status !== 'cancelled') fail('ALREADY_REGISTERED');

    if (activity.seatsTotal > 0) {
      const taken = await tx.registration.count({
        where: { activityId, status: { in: SEAT_TAKEN } },
      });
      if (taken >= activity.seatsTotal) fail('ACTIVITY_FULL');
    }

    // กิจกรรมที่ไม่ต้องอนุมัติ ให้ผ่านทันทีตั้งแต่กดสมัคร
    const status = activity.requiresApproval ? 'pending' : 'approved';
    const data = {
      status,
      regAt: now,
      approvedAt: status === 'approved' ? now : null,
      rejectedAt: null,
      rejectReason: null,
      cancelRequested: false,
      cancelReason: null,
      cancelStatus: null,
      cancelledAt: null,
    };

    return existing
      ? tx.registration.update({ where: { id: existing.id }, data })
      : tx.registration.create({ data: { userId: user.id, activityId, ...data } });
  });

  return NextResponse.json({
    ok: true,
    registration: { id: registration.id, activityId, status: registration.status },
  });
});
