import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { requireOwnedActivity } from '@/lib/organizer';
import { readJson } from '@/lib/validation';

/**
 * PATCH /api/v1/organizer/evidence/:id — ตรวจหลักฐานการเข้าร่วม
 *
 * แยกจากการรับรองชั่วโมง เพราะเป็นคนละคำถาม: หลักฐานใช้ได้ไหม กับ ให้กี่ชั่วโมง
 * ผู้จัดบางคนตรวจหลักฐานก่อนแล้วค่อยรับรองชั่วโมงเป็นชุดทีหลัง
 */

const STATUSES = ['approved', 'rejected'] as const;
type Status = (typeof STATUSES)[number];

export const PATCH = handler(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const user = await requireStaff();

  const body = await readJson<{ status?: unknown; note?: unknown }>(req);
  const status = String(body.status ?? '') as Status;
  if (!STATUSES.includes(status)) fail('VALIDATION_ERROR', 'สถานะหลักฐานไม่ถูกต้อง');

  const evidence = await prisma.evidence.findUnique({
    where: { id },
    select: { id: true, registration: { select: { activityId: true } } },
  });
  if (!evidence) fail('NOT_FOUND');

  await requireOwnedActivity(user, evidence.registration.activityId);

  const note = String(body.note ?? '').trim();
  if (status === 'rejected' && !note) fail('VALIDATION_ERROR', 'กรุณาระบุเหตุผลที่ไม่ผ่าน');

  const updated = await prisma.evidence.update({
    where: { id },
    data: {
      status,
      reviewedById: user.id,
      reviewedAt: new Date(),
      reviewNote: note || null,
    },
    select: { id: true, status: true, reviewNote: true },
  });

  return NextResponse.json({ ok: true, evidence: updated });
});
