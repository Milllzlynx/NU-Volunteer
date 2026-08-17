import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma, systemLog } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { readJson } from '@/lib/validation';

/**
 * PATCH  /api/v1/admin/categories/:id — แก้ไขหมวดหมู่ หรือสลับลำดับกับหมวดข้างเคียง
 * DELETE /api/v1/admin/categories/:id — ลบหมวดหมู่ที่ยังไม่มีกิจกรรมใช้อยู่
 *
 * ลบหมวดที่มีกิจกรรมผูกอยู่ไม่ได้ เพราะ Activity.categoryId เป็น required
 * ฐานข้อมูลจะปฏิเสธเองอยู่แล้ว แต่ตอบเป็นข้อความที่อ่านรู้เรื่องดีกว่าปล่อยให้เป็น 500
 * ทางที่ถูกคือปิดการใช้งาน (active=false) ซึ่งซ่อนหมวดจากฟอร์มสร้างกิจกรรมโดยไม่แตะของเก่า
 */

const HEX = /^#[0-9a-fA-F]{6}$/;

export const PATCH = handler(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const admin = await requireAdmin();
  const body = await readJson<Record<string, unknown>>(req);

  const current = await prisma.category.findUnique({ where: { id } });
  if (!current) fail('NOT_FOUND');

  /* ── สลับลำดับกับหมวดที่อยู่ติดกัน ── */
  if (body.move === 'up' || body.move === 'down') {
    const neighbour = await prisma.category.findFirst({
      where: body.move === 'up' ? { order: { lt: current.order } } : { order: { gt: current.order } },
      orderBy: { order: body.move === 'up' ? 'desc' : 'asc' },
    });
    // สุดขอบแล้ว — ไม่ใช่ข้อผิดพลาด แค่ไม่มีอะไรให้สลับ
    if (!neighbour) return NextResponse.json({ ok: true, moved: false });

    await prisma.$transaction([
      prisma.category.update({ where: { id: current.id }, data: { order: neighbour.order } }),
      prisma.category.update({ where: { id: neighbour.id }, data: { order: current.order } }),
    ]);
    return NextResponse.json({ ok: true, moved: true });
  }

  /* ── แก้ไขเนื้อหา ── */
  const data: Record<string, unknown> = {};
  const changes: string[] = [];

  if (body.label !== undefined) {
    const label = String(body.label).trim();
    if (!label) fail('VALIDATION_ERROR', 'กรุณากรอกชื่อหมวดหมู่');
    if (label !== current.label) {
      data.label = label;
      changes.push(`ชื่อ → ${label}`);
    }
  }
  if (body.labelEn !== undefined) data.labelEn = String(body.labelEn).trim();
  if (body.desc !== undefined) data.desc = String(body.desc).trim();
  if (body.icon !== undefined) data.icon = String(body.icon).trim();

  if (body.color !== undefined) {
    const color = String(body.color).trim();
    if (!HEX.test(color)) fail('VALIDATION_ERROR', 'รหัสสีต้องอยู่ในรูปแบบ #RRGGBB');
    if (color !== current.color) {
      data.color = color;
      changes.push(`สี → ${color}`);
    }
  }
  if (body.active !== undefined) {
    const active = Boolean(body.active);
    if (active !== current.active) {
      data.active = active;
      changes.push(active ? 'เปิดใช้งาน' : 'ปิดใช้งาน');
    }
  }

  if (!Object.keys(data).length) fail('VALIDATION_ERROR', 'ไม่มีอะไรเปลี่ยนแปลง');

  const updated = await prisma.category.update({
    where: { id },
    data,
    include: { _count: { select: { activities: true } } },
  });

  if (changes.length) {
    await systemLog('info', `แก้ไขหมวดหมู่ ${current.label}: ${changes.join(' · ')}`, {
      actorId: admin.id,
      meta: { categoryId: id, changes },
    });
  }

  return NextResponse.json({
    ok: true,
    category: { ...updated, activities: updated._count.activities },
  });
});

export const DELETE = handler(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const admin = await requireAdmin();

  const target = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { activities: true } } },
  });
  if (!target) fail('NOT_FOUND');

  if (target._count.activities > 0) {
    fail(
      'VALIDATION_ERROR',
      `หมวดนี้มีกิจกรรมอยู่ ${target._count.activities} รายการ ย้ายกิจกรรมออกก่อน หรือปิดการใช้งานแทนการลบ`,
    );
  }

  await prisma.category.delete({ where: { id } });
  await systemLog('warning', `ลบหมวดหมู่กิจกรรม: ${target.label} (${target.id})`, {
    actorId: admin.id,
    meta: { categoryId: id },
  });

  return NextResponse.json({ ok: true });
});
