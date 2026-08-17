import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma, systemLog } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { readJson } from '@/lib/validation';

/**
 * GET  /api/v1/admin/faculties — คณะทั้งหมดพร้อมจำนวนนิสิตในแต่ละคณะ
 * POST /api/v1/admin/faculties — เพิ่มคณะทีละรายการ หรือนำเข้าหลายรายการจาก CSV
 *
 * จำนวนนิสิตนับจาก User.faculty ซึ่งเก็บเป็น "ชื่อคณะ" ไม่ใช่ foreign key
 * (ดูสคีมา — ผู้ใช้กรอกคณะตอนสมัคร ก่อนที่ตาราง Faculty จะมีอยู่ด้วยซ้ำ)
 * การเปลี่ยนชื่อคณะจึงต้องตามไปแก้ในตาราง User ด้วย ไม่งั้นนิสิตจะหลุดจากคณะตัวเอง
 * — จัดการไว้ใน PATCH ของ [id]/route.ts
 */

export const GET = handler(async () => {
  await requireAdmin();

  const [rows, grouped] = await Promise.all([
    prisma.faculty.findMany({ orderBy: { order: 'asc' } }),
    prisma.user.groupBy({ by: ['faculty'], _count: { _all: true } }),
  ]);

  const studentsBy = new Map<string, number>();
  for (const g of grouped) {
    if (g.faculty) studentsBy.set(g.faculty, g._count._all);
  }

  return NextResponse.json({
    ok: true,
    faculties: rows.map((f) => ({
      id: f.id,
      name: f.name,
      nameEn: f.nameEn,
      abbr: f.abbr,
      email: f.email,
      phone: f.phone,
      location: f.location,
      active: f.active,
      color: f.color,
      order: f.order,
      students: studentsBy.get(f.name) ?? 0,
    })),
    /* ชื่อคณะที่มีนิสิตอยู่จริงแต่ยังไม่มีในตาราง Faculty — เกิดจากผู้ใช้พิมพ์เอง
       ตอนสมัครก่อนที่จะมีรายการคณะกลาง ผู้ดูแลควรเห็นเพื่อตามไปเพิ่มหรือรวมให้ตรงกัน */
    orphans: [...studentsBy.keys()]
      .filter((name) => !rows.some((f) => f.name === name))
      .map((name) => ({ name, students: studentsBy.get(name) ?? 0 })),
  });
});

export const POST = handler(async (req) => {
  const admin = await requireAdmin();
  const body = await readJson<Record<string, unknown>>(req);

  /* ── นำเข้าหลายรายการจาก CSV ── */
  if (Array.isArray(body.rows)) {
    const incoming = body.rows as Record<string, unknown>[];
    const existing = await prisma.faculty.findMany({ select: { name: true } });
    const known = new Set(existing.map((f) => f.name));

    const last = await prisma.faculty.findFirst({ orderBy: { order: 'desc' }, select: { order: true } });
    let order = (last?.order ?? -1) + 1;

    const fresh = incoming
      .map((r) => ({
        name: String(r.name ?? '').trim(),
        nameEn: String(r.nameEn ?? '').trim(),
        abbr: String(r.abbr ?? '').trim(),
        email: String(r.email ?? '').trim(),
        phone: String(r.phone ?? '').trim(),
        location: String(r.location ?? '').trim(),
      }))
      // ชื่อซ้ำหรือว่างข้ามไปเงียบ ๆ — นำเข้าไฟล์เดิมซ้ำต้องไม่พัง และต้องไม่สร้างของซ้ำ
      .filter((r) => r.name && !known.has(r.name))
      .filter((r, i, arr) => arr.findIndex((x) => x.name === r.name) === i)
      .map((r) => ({ ...r, order: order++ }));

    if (!fresh.length) {
      return NextResponse.json({ ok: true, created: 0, skipped: incoming.length });
    }

    await prisma.faculty.createMany({ data: fresh });
    await systemLog('success', `นำเข้าคณะจากไฟล์ ${fresh.length} รายการ`, {
      actorId: admin.id,
      meta: { created: fresh.length, skipped: incoming.length - fresh.length },
    });

    return NextResponse.json({
      ok: true,
      created: fresh.length,
      skipped: incoming.length - fresh.length,
    });
  }

  /* ── เพิ่มทีละรายการ ── */
  const name = String(body.name ?? '').trim();
  if (!name) fail('VALIDATION_ERROR', 'กรุณากรอกชื่อคณะ');

  const taken = await prisma.faculty.findUnique({ where: { name }, select: { id: true } });
  if (taken) fail('VALIDATION_ERROR', 'มีคณะชื่อนี้อยู่แล้ว');

  const last = await prisma.faculty.findFirst({ orderBy: { order: 'desc' }, select: { order: true } });

  const created = await prisma.faculty.create({
    data: {
      name,
      nameEn: String(body.nameEn ?? '').trim(),
      abbr: String(body.abbr ?? '').trim(),
      email: String(body.email ?? '').trim(),
      phone: String(body.phone ?? '').trim(),
      location: String(body.location ?? '').trim(),
      active: body.active === undefined ? true : Boolean(body.active),
      order: (last?.order ?? -1) + 1,
    },
  });

  await systemLog('success', `เพิ่มคณะ: ${created.name}`, {
    actorId: admin.id,
    meta: { facultyId: created.id },
  });

  return NextResponse.json({ ok: true, faculty: { ...created, students: 0 } });
});
