import { NextResponse } from 'next/server';
import { getActivityDetail } from '@/lib/activityDetail';
import { getCurrentUser } from '@/lib/auth';
import { fail, handler } from '@/lib/errors';

/**
 * GET /api/v1/activities/:id — รายละเอียดกิจกรรมหนึ่งรายการ
 *
 * เปิดให้ผู้เยี่ยมชมเรียกได้ เพราะหน้ารายละเอียดเป็นหน้าสาธารณะอยู่แล้ว
 * ผู้ที่เข้าสู่ระบบจะได้สถานะของตัวเอง (myRegistration, favorited) ติดมาด้วย
 *
 * หน้าเว็บใน Next เรนเดอร์ฝั่งเซิร์ฟเวอร์และเรียก getActivityDetail() ตรง ๆ อยู่แล้ว
 * ปลายทางนี้มีไว้ให้ไคลเอนต์ภายนอกใช้ — โดยเฉพาะ SPA ที่เรียก /api/v1 ผ่าน proxy
 */
export const GET = handler(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const user = await getCurrentUser();

  const activity = await getActivityDetail(id, user?.id ?? null, user?.role ?? null);
  if (!activity) fail('NOT_FOUND');

  return NextResponse.json({ ok: true, activity });
});
