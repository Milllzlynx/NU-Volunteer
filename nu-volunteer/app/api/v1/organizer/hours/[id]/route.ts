import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { requireOwnedActivity } from '@/lib/organizer';
import { readJson } from '@/lib/validation';

/**
 * PATCH /api/v1/organizer/hours/:registrationId — รับรองชั่วโมงจิตอาสา
 *
 * รับรองได้เฉพาะใบที่เข้าร่วมจนถึงขั้นเช็กเอาต์แล้ว (checked-out หรือ completed)
 * ใบที่ยังไม่เช็กเอาต์แปลว่ายังไม่มีหลักฐานว่ามาจริง จึงยังไม่ควรมีชั่วโมงติดตัว
 *
 * ผู้จัดปรับจำนวนชั่วโมงได้ ไม่ผูกกับ hoursComputed ตายตัว เพราะบางคนมาสายหรือกลับก่อน
 * แต่เพดานคือชั่วโมงของกิจกรรม กันการแจกเกินที่ประกาศไว้ตอนเปิดรับสมัคร
 */

const ACTIONS = ['approve', 'reject'] as const;
type Action = (typeof ACTIONS)[number];

export const PATCH = handler(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const user = await requireStaff();

  const body = await readJson<{ action?: unknown; hours?: unknown; note?: unknown }>(req);
  const action = String(body.action ?? '') as Action;
  if (!ACTIONS.includes(action)) fail('VALIDATION_ERROR', 'คำสั่งไม่ถูกต้อง');

  const registration = await prisma.registration.findUnique({
    where: { id },
    select: { id: true, status: true, activityId: true, userId: true, hoursComputed: true },
  });
  if (!registration) fail('NOT_FOUND');

  const activity = await requireOwnedActivity(user, registration.activityId);

  if (!['checked-out', 'completed'].includes(registration.status)) {
    fail('VALIDATION_ERROR', 'รับรองชั่วโมงได้เฉพาะผู้ที่เช็กเอาต์แล้ว');
  }

  if (action === 'reject') {
    const note = String(body.note ?? '').trim();
    if (!note) fail('VALIDATION_ERROR', 'กรุณาระบุเหตุผลที่ไม่รับรอง');

    const updated = await prisma.registration.update({
      where: { id },
      data: { hoursAwarded: 0, hoursApprovedAt: new Date() },
      select: { id: true, hoursAwarded: true, status: true },
    });

    await prisma.notification.create({
      data: {
        userId: registration.userId,
        type: 'approval',
        title: `ไม่รับรองชั่วโมง: ${activity.title}`,
        body: note,
        link: '/student/hours',
      },
    });

    return NextResponse.json({ ok: true, registration: updated });
  }

  // ไม่ส่ง hours มา = รับรองตามชั่วโมงที่กิจกรรมประกาศไว้
  const raw = body.hours == null || body.hours === '' ? activity.hours : Number(body.hours);
  if (!Number.isFinite(raw) || raw < 0) fail('VALIDATION_ERROR', 'จำนวนชั่วโมงไม่ถูกต้อง');
  if (raw > activity.hours) {
    fail('VALIDATION_ERROR', `รับรองได้ไม่เกิน ${activity.hours} ชม. ตามที่กิจกรรมกำหนด`);
  }

  const updated = await prisma.registration.update({
    where: { id },
    data: {
      hoursAwarded: raw,
      hoursApprovedAt: new Date(),
      status: 'completed',
    },
    select: { id: true, hoursAwarded: true, status: true },
  });

  await prisma.notification.create({
    data: {
      userId: registration.userId,
      type: 'certificate',
      title: `รับรองชั่วโมงแล้ว: ${activity.title}`,
      body: `คุณได้รับ ${raw} ชั่วโมงจิตอาสาจากกิจกรรมนี้`,
      link: '/student/hours',
    },
  });

  return NextResponse.json({ ok: true, registration: updated });
});
