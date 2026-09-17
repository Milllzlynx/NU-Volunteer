import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';
import { prisma, systemLog } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { requireOwnedActivity, restoredStatus } from '@/lib/organizer';

/**
 * POST /api/v1/organizer/activities/:id/restore — กู้คืนกิจกรรมที่ถูกลบ (แบบนิ่ม)
 *
 * คู่กับ DELETE /api/v1/organizer/activities/:id ซึ่งแค่ตั้ง deletedAt ไว้ — ที่นี่ล้างค่านั้นทิ้ง
 * ใบลงทะเบียน ชั่วโมง และใบประกาศไม่เคยถูกแตะตอนลบ จึงไม่มีอะไรต้องคืนนอกจากตัวกิจกรรม
 *
 * สถานะหลังกู้คืนตัดสินที่ restoredStatus — กิจกรรมที่ยังไม่จบกลับมาเป็นฉบับร่างให้ผู้จัดทบทวนก่อน
 * นิสิตที่ถือใบลงทะเบียนอยู่ได้รับแจ้งตอนลบ จึงแจ้งอีกครั้งว่ากิจกรรมกลับมาแล้ว
 */
export const POST = handler(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const user = await requireStaff();
  const activity = await requireOwnedActivity(user, id, { includeDeleted: true });
  if (!activity.deletedAt) fail('VALIDATION_ERROR', 'กิจกรรมนี้ไม่ได้ถูกลบ');

  const status = restoredStatus(activity);
  await prisma.activity.update({ where: { id }, data: { deletedAt: null, status } });

  const registrations = await prisma.registration.findMany({
    where: { activityId: id },
    select: { userId: true },
  });
  const userIds = [...new Set(registrations.map((r) => r.userId))];
  if (userIds.length > 0) {
    await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: 'system',
        title: `กิจกรรมกลับมาในระบบแล้ว: ${activity.title}`,
        body: 'ใบลงทะเบียน ชั่วโมงที่รับรองแล้ว และใบประกาศของคุณยังอยู่ครบตามเดิม',
        link: `/activities/${id}`,
      })),
    });
  }

  await systemLog('info', `กู้คืนกิจกรรม ${activity.title}`, {
    actorId: user.id,
    meta: { activityId: id, from: activity.status, status, affectedStudents: userIds.length },
  });

  return NextResponse.json({ ok: true, status, affectedStudents: userIds.length });
});
