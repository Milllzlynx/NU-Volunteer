import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma, systemLog } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { readJson } from '@/lib/validation';

/**
 * PATCH  /api/v1/admin/contact/:id — สลับสถานะอ่านแล้ว/ยังไม่อ่าน
 * DELETE /api/v1/admin/contact/:id — ลบถาวร
 */
export const PATCH = handler(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  await requireAdmin();

  const body = await readJson<{ read?: boolean }>(req);
  const current = await prisma.contactMessage.findUnique({ where: { id }, select: { id: true } });
  if (!current) fail('NOT_FOUND');

  const updated = await prisma.contactMessage.update({
    where: { id },
    data: { read: body.read !== false },
    select: { id: true, read: true },
  });

  // ไม่เขียน SystemLog สำหรับการเปิดอ่าน — เกิดทุกครั้งที่คลิกข้อความ จะกลบบันทึกอื่นจนหาอะไรไม่เจอ
  return NextResponse.json({ ok: true, message: updated });
});

export const DELETE = handler(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const admin = await requireAdmin();

  const target = await prisma.contactMessage.findUnique({
    where: { id },
    select: { id: true, fromName: true, subject: true },
  });
  if (!target) fail('NOT_FOUND');

  await prisma.contactMessage.delete({ where: { id } });
  await systemLog('warning', `ลบข้อความถึงผู้ดูแล: ${target.subject || target.fromName}`, {
    actorId: admin.id,
    meta: { contactId: id, fromName: target.fromName },
  });

  return NextResponse.json({ ok: true });
});
