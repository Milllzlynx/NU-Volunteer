import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma, systemLog } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { readJson } from '@/lib/validation';

/**
 * PATCH /api/v1/admin/activities — เปลี่ยนสถานะกิจกรรมหลายรายการพร้อมกัน
 *
 * รายการกิจกรรมโหลดมากับหน้า (server component) ไม่ต้องมี GET ที่นี่
 * ส่วนการแก้กิจกรรมทีละรายการใช้ /api/v1/organizer/activities/:id ซึ่งรับแอดมินอยู่แล้ว
 * (ownedActivityFilter คืน {} ให้แอดมิน) จึงไม่สร้างปลายทางซ้ำซ้อนขึ้นมาอีกชุด
 *
 * ที่ต้องมีเฉพาะของแอดมินคือ "ทำทีเดียวหลายรายการ" ซึ่งฝั่งผู้จัดไม่มี
 */

const STATUSES = ['draft', 'open', 'closed', 'cancelled'];
const MAX_BULK = 100;

export const PATCH = handler(async (req) => {
  const admin = await requireAdmin();
  const body = await readJson<{ ids?: unknown; status?: unknown }>(req);

  const ids = Array.isArray(body.ids) ? body.ids.map(String).filter(Boolean) : [];
  const status = String(body.status ?? '');

  if (!ids.length) fail('VALIDATION_ERROR', 'ยังไม่ได้เลือกกิจกรรม');
  if (ids.length > MAX_BULK) fail('VALIDATION_ERROR', `เลือกได้ครั้งละไม่เกิน ${MAX_BULK} รายการ`);
  if (!STATUSES.includes(status)) fail('VALIDATION_ERROR', 'สถานะไม่ถูกต้อง');

  // อ่านชื่อไว้ก่อนแก้ เพื่อให้บันทึกระบบอ่านรู้เรื่องว่าแตะอะไรไปบ้าง
  const targets = await prisma.activity.findMany({
    where: { id: { in: ids } },
    select: { id: true, title: true, status: true },
  });
  if (!targets.length) fail('NOT_FOUND');

  const changing = targets.filter((a) => a.status !== status);
  if (!changing.length) {
    return NextResponse.json({ ok: true, updated: 0, status });
  }

  const res = await prisma.activity.updateMany({
    where: { id: { in: changing.map((a) => a.id) } },
    data: { status },
  });

  await systemLog('warning', `เปลี่ยนสถานะกิจกรรม ${res.count} รายการเป็น "${status}"`, {
    actorId: admin.id,
    meta: { status, activities: changing.map((a) => ({ id: a.id, title: a.title, from: a.status })) },
  });

  return NextResponse.json({ ok: true, updated: res.count, status });
});
