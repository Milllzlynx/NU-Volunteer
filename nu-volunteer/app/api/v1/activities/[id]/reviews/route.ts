import { NextResponse } from 'next/server';
import { DATE_EN, DATE_TH } from '@/lib/activities';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { readJson } from '@/lib/validation';

/**
 * POST /api/v1/activities/:id/reviews — เขียนหรือแก้รีวิวของตัวเอง
 *
 * สิทธิ์การรีวิวผูกกับการเข้าร่วมจริง ไม่ใช่แค่การเข้าสู่ระบบ:
 * ต้องมีใบลงทะเบียนของกิจกรรมนี้ที่สถานะ completed แล้วเท่านั้น
 * ถ้าเปิดให้ใครก็รีวิวได้ คะแนนเฉลี่ยจะไม่ได้สะท้อนประสบการณ์ของผู้เข้าร่วมอีกต่อไป
 *
 * หนึ่งคนรีวิวได้กิจกรรมละหนึ่งครั้ง (unique activityId+userId) การส่งซ้ำจึงเป็นการแก้ของเดิม
 * ไม่ใช่ error — ผู้ใช้แก้คำผิดหรือเปลี่ยนใจเรื่องดาวได้โดยไม่ต้องลบก่อน
 */

const MAX_COMMENT = 500;

export const POST = handler(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id: activityId } = await ctx.params;
  const user = await requireRole('student');

  const body = await readJson<{ stars?: unknown; comment?: unknown }>(req);

  const stars = Number(body.stars);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    fail('VALIDATION_ERROR', 'ให้คะแนนได้ตั้งแต่ 1 ถึง 5 ดาว');
  }

  const comment = String(body.comment ?? '').trim();
  if (comment.length > MAX_COMMENT) {
    fail('VALIDATION_ERROR', `ความเห็นยาวได้ไม่เกิน ${MAX_COMMENT} ตัวอักษร`);
  }

  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: { id: true },
  });
  if (!activity) fail('NOT_FOUND');

  // ตรวจสิทธิ์จากใบลงทะเบียนจริง ไม่เชื่อค่า canReview ที่ส่งมาจากหน้าเว็บ
  const registration = await prisma.registration.findFirst({
    where: { activityId, userId: user.id, status: 'completed' },
    select: { id: true },
  });
  if (!registration) fail('REVIEW_NOT_ALLOWED');

  const saved = await prisma.review.upsert({
    where: { activityId_userId: { activityId, userId: user.id } },
    create: { activityId, userId: user.id, stars, comment },
    update: { stars, comment },
    include: { user: { select: { name: true } } },
  });

  return NextResponse.json({
    ok: true,
    review: {
      id: saved.id,
      stars: saved.stars,
      comment: saved.comment,
      author: saved.user.name,
      dateTh: DATE_TH.format(saved.createdAt),
      dateEn: DATE_EN.format(saved.createdAt),
    },
  });
});
