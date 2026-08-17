import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';
import { prisma } from '@/lib/db';
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
 * DELETE /api/v1/organizer/activities/:id — ลบกิจกรรมที่ยังเป็นฉบับร่าง
 *
 * ลบได้เฉพาะ draft ที่ไม่มีใครลงทะเบียน กิจกรรมที่เผยแพร่ไปแล้วให้เปลี่ยนสถานะเป็น cancelled แทน
 * เพราะการลบจริงจะพาใบลงทะเบียน ใบประกาศ และชั่วโมงของนิสิตหายไปด้วย (onDelete: Cascade)
 */
export const DELETE = handler(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const user = await requireStaff();
  const activity = await requireOwnedActivity(user, id);

  if (activity.status !== 'draft') {
    fail('FORBIDDEN', 'ลบได้เฉพาะกิจกรรมที่ยังเป็นฉบับร่าง — กิจกรรมที่เผยแพร่แล้วให้ยกเลิกแทน');
  }

  const registrations = await prisma.registration.count({ where: { activityId: id } });
  if (registrations > 0) {
    fail('FORBIDDEN', 'มีผู้ลงทะเบียนแล้ว ลบไม่ได้ — ให้ยกเลิกกิจกรรมแทน');
  }

  await prisma.activity.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
