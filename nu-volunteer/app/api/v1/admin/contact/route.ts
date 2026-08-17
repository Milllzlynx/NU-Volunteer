import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma, systemLog } from '@/lib/db';
import { handler } from '@/lib/errors';
import { readJson } from '@/lib/validation';

/** เพดานจำนวนข้อความที่ส่งลงหน้าเดียว — ตัวกรองทำงานฝั่งไคลเอนต์ จึงต้องมีขอบเขต */
const CONTACT_CAP = 300;

/** GET /api/v1/admin/contact — กล่องข้อความถึงผู้ดูแล เรียงใหม่ไปเก่า */
export const GET = handler(async () => {
  await requireAdmin();

  const rows = await prisma.contactMessage.findMany({
    orderBy: { createdAt: 'desc' },
    take: CONTACT_CAP,
  });

  return NextResponse.json({
    ok: true,
    cap: CONTACT_CAP,
    messages: rows.map((m) => ({
      id: m.id,
      fromName: m.fromName,
      email: m.email,
      subject: m.subject,
      text: m.text,
      read: m.read,
      atMs: m.createdAt.getTime(),
    })),
  });
});

/**
 * PATCH /api/v1/admin/contact — ทำเครื่องหมายอ่านแล้วทั้งกล่อง
 *
 * แยกจากเส้น :id เพราะเป็นการกระทำกับทั้งกล่อง ไม่ใช่กับข้อความใดข้อความหนึ่ง
 */
export const PATCH = handler(async (req) => {
  const admin = await requireAdmin();
  const body = await readJson<{ read?: boolean }>(req);
  const read = body.read !== false;

  const r = await prisma.contactMessage.updateMany({
    where: { read: !read },
    data: { read },
  });

  if (r.count > 0) {
    await systemLog('info', `ทำเครื่องหมาย${read ? 'อ่านแล้ว' : 'ยังไม่อ่าน'}ทั้งกล่องข้อความ`, {
      actorId: admin.id,
      meta: { count: r.count },
    });
  }

  return NextResponse.json({ ok: true, updated: r.count });
});
