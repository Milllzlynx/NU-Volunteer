import { NextResponse } from 'next/server';
import { SEAT_TAKEN } from '@/lib/activities';
import { requireStaff } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { requireOwnedActivity } from '@/lib/organizer';
import { readJson } from '@/lib/validation';

/**
 * POST /api/v1/organizer/registrations/bulk — อนุมัติหรือปฏิเสธหลายใบพร้อมกัน
 *
 * body: { registrationIds: string[], action: 'approve' | 'reject', reason?: string }
 *
 * ที่นั่งถูกตรวจทีละใบขณะไล่อนุมัติ ไม่ใช่ตรวจครั้งเดียวตอนเริ่ม
 * ถ้ากดอนุมัติ 20 ใบในกิจกรรมที่เหลือ 5 ที่นั่ง จะได้ 5 ใบแรกและอีก 15 ใบถูกข้าม
 * ไม่ใช่ล้มทั้งชุดหรืออนุมัติเกินที่นั่ง — แล้วรายงานกลับไปว่าสำเร็จกี่ใบ ข้ามกี่ใบ
 *
 * ใบที่พิจารณาไปแล้วจะถูกข้ามเงียบ ๆ เพราะการเลือกทั้งหน้าย่อมติดใบเหล่านั้นมาด้วยเป็นปกติ
 */

const ACTIONS = ['approve', 'reject'] as const;
type Action = (typeof ACTIONS)[number];

const MAX_BATCH = 200;

export const POST = handler(async (req) => {
  const user = await requireStaff();
  const body = await readJson<{ registrationIds?: unknown; action?: unknown; reason?: unknown }>(req);

  const action = String(body.action ?? '') as Action;
  if (!ACTIONS.includes(action)) fail('VALIDATION_ERROR', 'คำสั่งไม่ถูกต้อง');

  const ids = Array.isArray(body.registrationIds)
    ? body.registrationIds.map((v) => String(v)).filter(Boolean)
    : [];
  if (ids.length === 0) fail('VALIDATION_ERROR', 'ยังไม่ได้เลือกรายการ');
  if (ids.length > MAX_BATCH) fail('VALIDATION_ERROR', `เลือกได้ครั้งละไม่เกิน ${MAX_BATCH} รายการ`);

  const reason = String(body.reason ?? '').trim();
  if (action === 'reject' && !reason) fail('VALIDATION_ERROR', 'กรุณาระบุเหตุผลที่ไม่อนุมัติ');

  const rows = await prisma.registration.findMany({
    where: { id: { in: ids } },
    select: { id: true, status: true, activityId: true, userId: true },
  });

  // ตรวจสิทธิ์ครั้งเดียวต่อกิจกรรม ไม่ใช่ต่อใบ — ชุดหนึ่งมักมาจากกิจกรรมเดียวกัน
  const activityIds = [...new Set(rows.map((r) => r.activityId))];
  const activities = new Map<string, { id: string; title: string; seatsTotal: number }>();
  for (const activityId of activityIds) {
    const a = await requireOwnedActivity(user, activityId);
    activities.set(activityId, { id: a.id, title: a.title, seatsTotal: a.seatsTotal });
  }

  let done = 0;
  let skipped = 0;
  const now = new Date();

  for (const r of rows) {
    if (r.status !== 'pending') {
      skipped += 1;
      continue;
    }

    const activity = activities.get(r.activityId)!;

    if (action === 'approve' && activity.seatsTotal > 0) {
      const taken = await prisma.registration.count({
        where: { activityId: r.activityId, status: { in: SEAT_TAKEN }, id: { not: r.id } },
      });
      if (taken >= activity.seatsTotal) {
        skipped += 1;
        continue;
      }
    }

    await prisma.registration.update({
      where: { id: r.id },
      data:
        action === 'approve'
          ? { status: 'approved', approvedAt: now }
          : { status: 'rejected', rejectedAt: now, rejectReason: reason },
    });

    await prisma.notification.create({
      data: {
        userId: r.userId,
        type: 'approval',
        title:
          action === 'approve'
            ? `อนุมัติการลงทะเบียนแล้ว: ${activity.title}`
            : `ไม่อนุมัติการลงทะเบียน: ${activity.title}`,
        body:
          action === 'approve'
            ? 'ผู้จัดกิจกรรมอนุมัติการลงทะเบียนของคุณแล้ว อย่าลืมเช็กอินในวันงาน'
            : reason,
        link: `/activities/${activity.id}`,
      },
    });

    done += 1;
  }

  // ใบที่หาไม่เจอเลย (ถูกลบไปแล้ว หรือส่ง id มั่ว) นับเป็นข้ามด้วย
  skipped += ids.length - rows.length;

  return NextResponse.json({ ok: true, done, skipped });
});
