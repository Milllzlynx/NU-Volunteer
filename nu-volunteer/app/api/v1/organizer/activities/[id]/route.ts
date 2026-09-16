import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';
import { prisma, systemLog } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { ACTIVITY_STATUSES, readActivityInput, requireOwnedActivity, type ActivityStatus } from '@/lib/organizer';
import { readJson } from '@/lib/validation';

/**
 * PATCH /api/v1/organizer/activities/:id
 *
 * รับสองรูปแบบ: ส่ง { status } มาอย่างเดียวคือการเปลี่ยนสถานะเร็ว ๆ จากหน้ารายการ
 * (เผยแพร่ / ปิดรับ / ยกเลิก) ส่วนการส่งฟอร์มเต็มคือการแก้ไขรายละเอียด
 * แยกด้วยจำนวนคีย์แทนการทำสองปลายทาง เพราะเป็นการแก้ทรัพยากรเดียวกัน
 */
export const PATCH = handler(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const user = await requireStaff();
  await requireOwnedActivity(user, id);

  const body = await readJson<Record<string, unknown>>(req);
  const statusOnly = Object.keys(body).length === 1 && 'status' in body;

  if (statusOnly) {
    const status = String(body.status ?? '') as ActivityStatus;
    if (!ACTIVITY_STATUSES.includes(status)) fail('VALIDATION_ERROR', 'สถานะกิจกรรมไม่ถูกต้อง');

    const activity = await prisma.activity.update({
      where: { id },
      data: { status },
      select: { id: true, status: true },
    });
    return NextResponse.json({ ok: true, activity });
  }

  const input = await readActivityInput(body);
  const activity = await prisma.activity.update({
    where: { id },
    data: input,
    select: { id: true, title: true, status: true },
  });

  return NextResponse.json({ ok: true, activity });
});

/**
 * GET /api/v1/organizer/activities/:id/impact อยู่ที่ไฟล์ข้าง ๆ — ดูผลกระทบก่อนลบ
 *
 * DELETE /api/v1/organizer/activities/:id — ลบกิจกรรม (แบบนิ่ม)
 *
 * ลบได้ทุกสถานะและลบได้แม้มีผู้ลงทะเบียนแล้ว แต่ไม่ได้ลบแถวจริง — ตั้ง deletedAt แทน
 *
 * เหตุผลที่ไม่ลบจริง: ทุกความสัมพันธ์ที่ชี้มาที่ Activity เป็น onDelete: Cascade การลบจริง
 * จะพาใบลงทะเบียน ชั่วโมงที่รับรองแล้ว และใบประกาศของนิสิตหายไปพร้อมกัน ชั่วโมงไม่มีที่อื่น
 * เก็บสำรองไว้เลย (หน้าชั่วโมงของนิสิตอ่านจาก Registration ตรง ๆ) ส่วนใบประกาศที่หายไป
 * จะทำให้หน้าตรวจสอบสาธารณะขึ้นว่า "ไม่พบ" กับคนที่ถือใบกระดาษอยู่จริง
 *
 * หลังลบ กิจกรรมจะหายจากทุกหน้าที่ใช้เลือกดูกิจกรรม แต่ประวัติของนิสิต — ชั่วโมง ใบประกาศ
 * รายการที่เคยสมัคร — ยังอ้างถึงกิจกรรมนี้ได้ตามปกติ เพราะเส้นทางเหล่านั้นเข้าถึงผ่าน
 * ใบลงทะเบียน ไม่ได้ค้นจากตารางกิจกรรม
 */
export const DELETE = handler(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const user = await requireStaff();
  const activity = await requireOwnedActivity(user, id);

  const registrations = await prisma.registration.findMany({
    where: { activityId: id },
    select: { userId: true },
  });

  const deletedAt = new Date();
  await prisma.activity.update({ where: { id }, data: { deletedAt } });

  // แจ้งทุกคนที่ถือใบลงทะเบียนไว้ — ไม่งั้นนิสิตจะรู้ตัวก็ต่อเมื่อหากิจกรรมไม่เจอ
  // นับคนไม่ซ้ำ เผื่อในอนาคตมีใบลงทะเบียนมากกว่าหนึ่งใบต่อคนต่อกิจกรรม
  const userIds = [...new Set(registrations.map((r) => r.userId))];
  if (userIds.length > 0) {
    await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: 'system',
        title: `กิจกรรมถูกยกเลิกและนำออกจากระบบ: ${activity.title}`,
        body: 'ชั่วโมงที่รับรองแล้วและใบประกาศที่ออกไปแล้วของคุณยังอยู่ครบตามเดิม',
        link: '/student/registrations',
      })),
    });
  }

  await systemLog('warning', `ลบกิจกรรม ${activity.title}`, {
    actorId: user.id,
    meta: { activityId: id, status: activity.status, affectedStudents: userIds.length },
  });

  return NextResponse.json({ ok: true, affectedStudents: userIds.length });
});
