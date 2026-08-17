import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma, systemLog } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { readImageSrc } from '@/lib/imageSrc';
import { readJson } from '@/lib/validation';
import { BANNER_TYPES, navKeys } from '../route';

/**
 * PATCH  /api/v1/admin/banners/:id — แก้ไข ซ่อน/แสดง หรือสลับลำดับกับใบข้างเคียง
 * DELETE /api/v1/admin/banners/:id — ลบถาวร
 *
 * แบนเนอร์ที่ยังไม่อยากให้เห็นควรใช้ "ซ่อน" (visible=false) มากกว่าลบ เพราะมักเป็นของ
 * ตามฤดูกาลที่จะเอากลับมาใช้อีก และลำดับของใบอื่นจะได้ไม่ขยับตามไปด้วย
 */
export const PATCH = handler(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const admin = await requireAdmin();
  const body = await readJson<Record<string, unknown>>(req);

  const current = await prisma.banner.findUnique({ where: { id } });
  if (!current) fail('NOT_FOUND');

  if (body.move === 'up' || body.move === 'down') {
    const neighbour = await prisma.banner.findFirst({
      where: body.move === 'up' ? { order: { lt: current.order } } : { order: { gt: current.order } },
      orderBy: { order: body.move === 'up' ? 'desc' : 'asc' },
    });
    if (!neighbour) return NextResponse.json({ ok: true, moved: false });

    await prisma.$transaction([
      prisma.banner.update({ where: { id: current.id }, data: { order: neighbour.order } }),
      prisma.banner.update({ where: { id: neighbour.id }, data: { order: current.order } }),
    ]);
    return NextResponse.json({ ok: true, moved: true });
  }

  const data: Record<string, unknown> = {};
  const changes: string[] = [];

  if (body.title !== undefined) {
    const title = String(body.title).trim();
    if (!title) fail('VALIDATION_ERROR', 'กรุณากรอกหัวข้อแบนเนอร์');
    data.title = title;
  }
  if (body.desc !== undefined) data.desc = String(body.desc).trim();
  if (body.image !== undefined) data.image = readImageSrc(body.image, 'ภาพแบนเนอร์');
  if (body.ctaLabel !== undefined) data.ctaLabel = String(body.ctaLabel).trim();

  if (body.ctaTarget !== undefined) {
    const target = String(body.ctaTarget).trim();
    if (target && !navKeys().includes(target)) fail('VALIDATION_ERROR', 'ปลายทางของปุ่มไม่ถูกต้อง');
    data.ctaTarget = target;
  }

  if (body.type !== undefined) {
    const type = String(body.type);
    if (!BANNER_TYPES.includes(type)) fail('VALIDATION_ERROR', 'ชนิดแบนเนอร์ไม่ถูกต้อง');
    data.type = type;
  }

  if (body.visible !== undefined) {
    const visible = Boolean(body.visible);
    if (visible !== current.visible) {
      data.visible = visible;
      changes.push(visible ? 'แสดงบนหน้าหลัก' : 'ซ่อนจากหน้าหลัก');
    }
  }

  if (!Object.keys(data).length) fail('VALIDATION_ERROR', 'ไม่มีอะไรเปลี่ยนแปลง');

  const updated = await prisma.banner.update({ where: { id }, data });

  await systemLog('info', `แก้ไขแบนเนอร์ ${current.title}${changes.length ? `: ${changes.join(' · ')}` : ''}`, {
    actorId: admin.id,
    meta: { bannerId: id, changes },
  });

  return NextResponse.json({ ok: true, banner: updated });
});

export const DELETE = handler(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const admin = await requireAdmin();

  const target = await prisma.banner.findUnique({ where: { id }, select: { id: true, title: true } });
  if (!target) fail('NOT_FOUND');

  await prisma.banner.delete({ where: { id } });
  await systemLog('warning', `ลบแบนเนอร์หน้าหลัก: ${target.title}`, {
    actorId: admin.id,
    meta: { bannerId: id },
  });

  return NextResponse.json({ ok: true });
});
