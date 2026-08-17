import { NextResponse } from 'next/server';
import { SEAT_TAKEN } from '@/lib/activities';
import { requireStaff } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { requireOwnedActivity } from '@/lib/organizer';
import { readJson } from '@/lib/validation';

/**
 * PATCH /api/v1/organizer/registrations/:id — อนุมัติหรือปฏิเสธใบลงทะเบียน
 *
 * อนุมัติได้เฉพาะใบที่ยังรออนุมัติ กันการกดซ้ำจากสองแท็บแล้วนับที่นั่งเกิน
 * และตรวจที่นั่งอีกครั้งตอนอนุมัติ เพราะระหว่างที่ใบนี้รออยู่ อาจมีคนอื่นถูกอนุมัติไปจนเต็มแล้ว
 */

const ACTIONS = ['approve', 'reject'] as const;
type Action = (typeof ACTIONS)[number];

export const PATCH = handler(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const user = await requireStaff();

  const body = await readJson<{ action?: unknown; reason?: unknown }>(req);
  const action = String(body.action ?? '') as Action;
  if (!ACTIONS.includes(action)) fail('VALIDATION_ERROR', 'คำสั่งไม่ถูกต้อง');

  const registration = await prisma.registration.findUnique({
    where: { id },
    select: { id: true, status: true, activityId: true, userId: true },
  });
  if (!registration) fail('NOT_FOUND');

  // ตรวจว่ากิจกรรมนี้เป็นของผู้จัดคนนี้จริง ก่อนแตะใบลงทะเบียนของนิสิต
  const activity = await requireOwnedActivity(user, registration.activityId);

  if (registration.status !== 'pending') {
    fail('VALIDATION_ERROR', 'ใบลงทะเบียนนี้ผ่านการพิจารณาไปแล้ว');
  }

  if (action === 'reject') {
    const reason = String(body.reason ?? '').trim();
    const updated = await prisma.registration.update({
      where: { id },
      data: { status: 'rejected', rejectedAt: new Date(), rejectReason: reason || null },
      select: { id: true, status: true },
    });

    await prisma.notification.create({
      data: {
        userId: registration.userId,
        type: 'approval',
        title: `ไม่อนุมัติการลงทะเบียน: ${activity.title}`,
        body: reason || 'ผู้จัดกิจกรรมไม่อนุมัติการลงทะเบียนของคุณ',
        link: `/activities/${activity.id}`,
      },
    });

    return NextResponse.json({ ok: true, registration: updated });
  }

  // นับเฉพาะใบที่กินที่นั่งจริง และไม่นับใบที่กำลังพิจารณาอยู่ใบนี้
  if (activity.seatsTotal > 0) {
    const taken = await prisma.registration.count({
      where: {
        activityId: activity.id,
        status: { in: SEAT_TAKEN },
        id: { not: id },
      },
    });
    if (taken >= activity.seatsTotal) fail('ACTIVITY_FULL');
  }

  const updated = await prisma.registration.update({
    where: { id },
    data: { status: 'approved', approvedAt: new Date() },
    select: { id: true, status: true },
  });

  await prisma.notification.create({
    data: {
      userId: registration.userId,
      type: 'approval',
      title: `อนุมัติการลงทะเบียนแล้ว: ${activity.title}`,
      body: 'ผู้จัดกิจกรรมอนุมัติการลงทะเบียนของคุณแล้ว อย่าลืมเช็กอินในวันงาน',
      link: `/activities/${activity.id}`,
    },
  });

  return NextResponse.json({ ok: true, registration: updated });
});
