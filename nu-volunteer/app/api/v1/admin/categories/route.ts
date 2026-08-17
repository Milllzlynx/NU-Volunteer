import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma, systemLog } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { readJson } from '@/lib/validation';

/**
 * GET  /api/v1/admin/categories — หมวดหมู่ทั้งหมดพร้อมจำนวนกิจกรรมที่ใช้อยู่
 * POST /api/v1/admin/categories — สร้างหมวดหมู่ใหม่
 *
 * id ของหมวดหมู่เป็น slug ที่ผู้ดูแลตั้งเอง ไม่ใช่ cuid — เพราะมันโผล่ใน URL
 * ของหน้าหมวดหมู่ (/activities/category/[id]) และถูกอ้างในโค้ดฝั่งหน้าเว็บ
 * ตั้งแล้วเปลี่ยนไม่ได้ ไม่งั้นลิงก์ที่แชร์ออกไปแล้วจะเสียทั้งหมด
 */

/** slug ใช้ได้เฉพาะ a-z 0-9 และขีดกลาง — ต้องพิมพ์ใน URL ได้โดยไม่ต้องเข้ารหัส */
const SLUG = /^[a-z0-9-]{2,32}$/;
const HEX = /^#[0-9a-fA-F]{6}$/;

export const GET = handler(async () => {
  await requireAdmin();

  const rows = await prisma.category.findMany({
    orderBy: { order: 'asc' },
    include: { _count: { select: { activities: true } } },
  });

  return NextResponse.json({
    ok: true,
    categories: rows.map((c) => ({
      id: c.id,
      label: c.label,
      labelEn: c.labelEn,
      desc: c.desc,
      icon: c.icon,
      color: c.color,
      order: c.order,
      active: c.active,
      activities: c._count.activities,
    })),
  });
});

export const POST = handler(async (req) => {
  const admin = await requireAdmin();
  const body = await readJson<Record<string, unknown>>(req);

  const id = String(body.id ?? '').trim().toLowerCase();
  const label = String(body.label ?? '').trim();
  const color = String(body.color ?? '#A774F7').trim();

  if (!SLUG.test(id)) fail('VALIDATION_ERROR', 'รหัสหมวดหมู่ใช้ได้เฉพาะ a-z 0-9 และขีดกลาง ยาว 2-32 ตัว');
  if (!label) fail('VALIDATION_ERROR', 'กรุณากรอกชื่อหมวดหมู่');
  if (!HEX.test(color)) fail('VALIDATION_ERROR', 'รหัสสีต้องอยู่ในรูปแบบ #RRGGBB');

  const taken = await prisma.category.findUnique({ where: { id }, select: { id: true } });
  if (taken) fail('VALIDATION_ERROR', 'มีหมวดหมู่รหัสนี้อยู่แล้ว');

  // หมวดใหม่ไปต่อท้ายเสมอ ผู้ดูแลค่อยลากขึ้นเองถ้าอยากให้เด่นกว่านี้
  const last = await prisma.category.findFirst({ orderBy: { order: 'desc' }, select: { order: true } });

  const created = await prisma.category.create({
    data: {
      id,
      label,
      labelEn: String(body.labelEn ?? '').trim(),
      desc: String(body.desc ?? '').trim(),
      icon: String(body.icon ?? '').trim(),
      color,
      order: (last?.order ?? -1) + 1,
      active: body.active === undefined ? true : Boolean(body.active),
    },
  });

  await systemLog('success', `เพิ่มหมวดหมู่กิจกรรม: ${created.label} (${created.id})`, {
    actorId: admin.id,
    meta: { categoryId: created.id },
  });

  return NextResponse.json({ ok: true, category: { ...created, activities: 0 } });
});
