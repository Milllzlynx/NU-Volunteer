import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma, systemLog } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { readImageSrc } from '@/lib/imageSrc';
import { ROLE_NAV } from '@/lib/design';
import { readJson } from '@/lib/validation';

/**
 * GET  /api/v1/admin/banners — แบนเนอร์บนหน้าหลักของนิสิต
 * POST /api/v1/admin/banners — เพิ่มแบนเนอร์ใหม่
 *
 * ต่างจากข่าวประชาสัมพันธ์ตรงที่แบนเนอร์แสดงผลจริงอยู่แล้ววันนี้ — หน้าหลักของนิสิต
 * (components/student/StudentHome.tsx) หมุนแสดงทุกใบที่ visible=true เรียงตาม order
 * แก้ที่นี่แล้วนิสิตเห็นทันทีในการโหลดหน้าครั้งถัดไป
 */

export const BANNER_TYPES = ['general', 'reminder', 'update'];

/** ctaTarget เก็บเป็นคีย์หน้าใน ROLE_NAV ไม่ใช่ URL — ปลายทางจึงจำกัดอยู่ในเว็บนี้เสมอ */
export function navKeys(): string[] {
  const keys = new Set<string>();
  for (const items of Object.values(ROLE_NAV)) for (const item of items) keys.add(item.key);
  return [...keys];
}

export const GET = handler(async () => {
  await requireAdmin();

  const rows = await prisma.banner.findMany({ orderBy: { order: 'asc' } });

  return NextResponse.json({
    ok: true,
    banners: rows.map((b) => ({
      id: b.id,
      title: b.title,
      desc: b.desc,
      image: b.image,
      ctaLabel: b.ctaLabel,
      ctaTarget: b.ctaTarget,
      type: b.type,
      visible: b.visible,
      order: b.order,
    })),
    /** คีย์หน้าที่ใช้เป็นปลายทางปุ่มได้ — ส่งไปให้หน้าจอทำเป็นรายการให้เลือก */
    targets: navKeys(),
  });
});

export const POST = handler(async (req) => {
  const admin = await requireAdmin();
  const body = await readJson<Record<string, unknown>>(req);

  const title = String(body.title ?? '').trim();
  if (!title) fail('VALIDATION_ERROR', 'กรุณากรอกหัวข้อแบนเนอร์');

  const ctaTarget = String(body.ctaTarget ?? '').trim();
  if (ctaTarget && !navKeys().includes(ctaTarget)) {
    fail('VALIDATION_ERROR', 'ปลายทางของปุ่มไม่ถูกต้อง');
  }

  const last = await prisma.banner.findFirst({ orderBy: { order: 'desc' }, select: { order: true } });

  const created = await prisma.banner.create({
    data: {
      title,
      desc: String(body.desc ?? '').trim(),
      image: readImageSrc(body.image, 'ภาพแบนเนอร์'),
      ctaLabel: String(body.ctaLabel ?? '').trim(),
      ctaTarget,
      type: BANNER_TYPES.includes(String(body.type)) ? String(body.type) : 'general',
      visible: body.visible === undefined ? true : Boolean(body.visible),
      order: (last?.order ?? -1) + 1,
    },
  });

  await systemLog('success', `เพิ่มแบนเนอร์หน้าหลัก: ${created.title}`, {
    actorId: admin.id,
    meta: { bannerId: created.id },
  });

  return NextResponse.json({ ok: true, banner: created });
});
