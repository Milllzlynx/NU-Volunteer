import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { requireOwnedActivity } from '@/lib/organizer';
import { readJson } from '@/lib/validation';

/**
 * PATCH /api/v1/organizer/cancellations/:id — พิจารณาคำขอยกเลิกของนิสิต
 *
 * นิสิตส่งคำขอผ่าน /registrations/:id/cancel ซึ่งตั้ง cancelStatus เป็น pending ไว้
 * ปลายทางนี้คือฝั่งที่ปิดวงจรนั้น
 *
 * อนุมัติ = ใบลงทะเบียนกลายเป็น cancelled ที่นั่งคืนสู่ระบบทันที
 * เพราะ cancelled ไม่อยู่ใน SEAT_TAKEN การนับที่นั่งและความจุรอบจึงลดลงเอง ไม่ต้องแก้ตัวเลขที่ไหน
 *
 * ไม่อนุมัติ = ใบยังอยู่ในสถานะเดิม นิสิตยื่นใหม่ได้ (ฝั่งนิสิตบล็อกเฉพาะคำขอที่ยัง pending)
 */

const ACTIONS = ['approve', 'reject'] as const;
type Action = (typeof ACTIONS)[number];

export const PATCH = handler(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const user = await requireStaff();

  const body = await readJson<{ action?: unknown; note?: unknown }>(req);
  const action = String(body.action ?? '') as Action;
  if (!ACTIONS.includes(action)) fail('VALIDATION_ERROR', 'คำสั่งไม่ถูกต้อง');

  const registration = await prisma.registration.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      activityId: true,
      status: true,
      cancelRequested: true,
      cancelStatus: true,
    },
  });
  if (!registration) fail('NOT_FOUND');

  const activity = await requireOwnedActivity(user, registration.activityId);

  if (!registration.cancelRequested || registration.cancelStatus !== 'pending') {
    fail('VALIDATION_ERROR', 'คำขอนี้ถูกพิจารณาไปแล้ว หรือไม่มีคำขอยกเลิกค้างอยู่');
  }

  const note = String(body.note ?? '').trim();

  if (action === 'reject') {
    if (!note) fail('VALIDATION_ERROR', 'กรุณาระบุเหตุผลที่ไม่อนุมัติให้ยกเลิก');

    const updated = await prisma.registration.update({
      where: { id },
      data: { cancelStatus: 'rejected' },
      select: { id: true, status: true, cancelStatus: true },
    });

    await prisma.notification.create({
      data: {
        userId: registration.userId,
        type: 'approval',
        title: `ไม่อนุมัติคำขอยกเลิก: ${activity.title}`,
        body: note,
        link: '/student/registrations',
      },
    });

    return NextResponse.json({ ok: true, registration: updated });
  }

  const updated = await prisma.registration.update({
    where: { id },
    data: {
      cancelStatus: 'approved',
      cancelledAt: new Date(),
      status: 'cancelled',
    },
    select: { id: true, status: true, cancelStatus: true },
  });

  await prisma.notification.create({
    data: {
      userId: registration.userId,
      type: 'approval',
      title: `อนุมัติการยกเลิกแล้ว: ${activity.title}`,
      body: note || 'ผู้จัดกิจกรรมอนุมัติคำขอยกเลิกของคุณแล้ว ที่นั่งถูกคืนให้ผู้อื่นเรียบร้อย',
      link: '/student/registrations',
    },
  });

  return NextResponse.json({ ok: true, registration: updated });
});
