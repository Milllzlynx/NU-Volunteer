import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { readJson } from '@/lib/validation';

/**
 * PATCH /api/v1/notifications — ทำเครื่องหมายอ่านแล้ว/ยังไม่อ่าน
 *
 * body: { id, read }        เปลี่ยนใบเดียว
 *       { all: true, read } เปลี่ยนทั้งหมดของตัวเอง
 */
export const PATCH = handler(async (req) => {
  const user = await requireUser();
  const body = await readJson<{ id?: unknown; all?: unknown; read?: unknown }>(req);
  const read = body.read !== false; // ไม่ส่งมาถือว่า "อ่านแล้ว"

  if (body.all === true) {
    const { count } = await prisma.notification.updateMany({
      where: { userId: user.id, read: !read },
      data: { read },
    });
    return NextResponse.json({ ok: true, updated: count });
  }

  const id = String(body.id ?? '');
  if (!id) fail('VALIDATION_ERROR');

  // จำกัดด้วย userId ในเงื่อนไข — กันแก้ใบของคนอื่นด้วยการเดา id
  const { count } = await prisma.notification.updateMany({
    where: { id, userId: user.id },
    data: { read },
  });
  if (!count) fail('NOT_FOUND');

  return NextResponse.json({ ok: true, updated: count });
});

/**
 * DELETE /api/v1/notifications?id=...      ลบใบเดียว
 * DELETE /api/v1/notifications?scope=read  ลบทุกใบที่อ่านแล้ว
 */
export const DELETE = handler(async (req) => {
  const user = await requireUser();
  const params = new URL(req.url).searchParams;

  if (params.get('scope') === 'read') {
    const { count } = await prisma.notification.deleteMany({ where: { userId: user.id, read: true } });
    return NextResponse.json({ ok: true, deleted: count });
  }

  const id = params.get('id') ?? '';
  if (!id) fail('VALIDATION_ERROR');

  const { count } = await prisma.notification.deleteMany({ where: { id, userId: user.id } });
  if (!count) fail('NOT_FOUND');

  return NextResponse.json({ ok: true, deleted: count });
});
