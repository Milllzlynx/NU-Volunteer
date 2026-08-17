import { NextResponse } from 'next/server';
import { DATE_TH, dayKeyOf } from '@/lib/activities';
import { requireAdmin } from '@/lib/auth';
import { prisma, systemLog } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { readJson } from '@/lib/validation';

/**
 * PATCH /api/v1/admin/activities/:id/schedule — ย้ายกิจกรรมไปวันอื่นทั้งก้อน
 *
 * มีไว้สำหรับการลากกิจกรรมไปวางในช่องวันอื่นบนหน้าปฏิทิน ซึ่งต้องการแค่ "เลื่อนวัน"
 * ไม่ใช่การแก้ทั้งฟอร์ม — PATCH /organizer/activities/:id ตัวเดิมรับเฉพาะฟอร์มเต็ม
 * (readActivityInput บังคับให้ส่งทุกช่อง) จึงใช้กับการลากวางไม่ได้
 *
 * เลื่อนเป็น "จำนวนวัน" ไม่ใช่การตั้งเวลาใหม่ เวลาเริ่ม-จบและความยาวของกิจกรรมจึงคงเดิม
 * และช่วงเปิด-ปิดรับสมัครเลื่อนตามไปด้วย ไม่งั้นกิจกรรมที่เลื่อนออกไปจะยังปิดรับตามกำหนดเดิม
 *
 * เขตเวลาไทยไม่มี DST ระยะห่างหนึ่งวันจึงเท่ากับ 86,400,000 มิลลิวินาทีเสมอ
 */

const MS_PER_DAY = 86_400_000;
/** กันการลากพลาดไปไกลเกินจนกลายเป็นการย้ายที่ไม่ได้ตั้งใจ */
const MAX_SHIFT_DAYS = 730;
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export const PATCH = handler(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const admin = await requireAdmin();

  const body = await readJson<{ day?: unknown }>(req);
  const day = String(body.day ?? '');
  if (!DAY_KEY.test(day)) fail('VALIDATION_ERROR', 'รูปแบบวันที่ต้องเป็น YYYY-MM-DD');

  const activity = await prisma.activity.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      status: true,
      startAt: true,
      endAt: true,
      regOpenAt: true,
      regCloseAt: true,
    },
  });
  if (!activity) fail('NOT_FOUND');

  if (activity.status === 'cancelled') {
    fail('VALIDATION_ERROR', 'กิจกรรมที่ยกเลิกแล้วเลื่อนวันไม่ได้');
  }

  const fromDay = dayKeyOf(activity.startAt);
  if (fromDay === day) return NextResponse.json({ ok: true, moved: false });

  // นับระยะห่างจากคีย์วัน (เที่ยงคืนตามเวลาไทย) ไม่ใช่จากเวลาจริงของกิจกรรม
  // ไม่งั้นกิจกรรมที่เริ่มดึก ๆ จะปัดวันผิดไปหนึ่งวัน
  const shift = Math.round((Date.parse(day) - Date.parse(fromDay)) / MS_PER_DAY);
  if (!shift) return NextResponse.json({ ok: true, moved: false });
  if (Math.abs(shift) > MAX_SHIFT_DAYS) {
    fail('VALIDATION_ERROR', `เลื่อนได้ครั้งละไม่เกิน ${MAX_SHIFT_DAYS} วัน`);
  }

  const move = (d: Date | null) => (d ? new Date(d.getTime() + shift * MS_PER_DAY) : null);

  const updated = await prisma.activity.update({
    where: { id },
    data: {
      startAt: new Date(activity.startAt.getTime() + shift * MS_PER_DAY),
      endAt: new Date(activity.endAt.getTime() + shift * MS_PER_DAY),
      regOpenAt: move(activity.regOpenAt),
      regCloseAt: move(activity.regCloseAt),
    },
    select: { id: true, startAt: true, endAt: true },
  });

  /*
    คนที่จองที่นั่งไว้แล้วต้องรู้ว่าวันเปลี่ยน — เป็นข้อมูลที่กระทบตารางชีวิตเขาโดยตรง
    ส่งเฉพาะใบที่ยังมีผลอยู่ ไม่ต้องไปกวนคนที่ยกเลิกหรือถูกปฏิเสธไปแล้ว
  */
  const affected = await prisma.registration.findMany({
    where: { activityId: id, status: { in: ['pending', 'approved', 'checked-in'] } },
    select: { userId: true },
  });

  if (affected.length) {
    await prisma.notification.createMany({
      data: affected.map((r) => ({
        userId: r.userId,
        type: 'update',
        title: `เลื่อนวันจัดกิจกรรม: ${activity.title}`,
        body: `วันจัดกิจกรรมเปลี่ยนจาก ${DATE_TH.format(activity.startAt)} เป็น ${DATE_TH.format(updated.startAt)}`,
        link: `/activities/${id}`,
      })),
    });
  }

  await systemLog(
    'warning',
    `เลื่อนวันกิจกรรม ${activity.title}: ${fromDay} → ${day} (แจ้งผู้ลงทะเบียน ${affected.length} คน)`,
    { actorId: admin.id, meta: { activityId: id, fromDay, toDay: day, shift, notified: affected.length } },
  );

  return NextResponse.json({
    ok: true,
    moved: true,
    notified: affected.length,
    activity: { id: updated.id, day: dayKeyOf(updated.startAt), endDay: dayKeyOf(updated.endAt) },
  });
});
