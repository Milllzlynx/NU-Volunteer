import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma, systemLog } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { readJson } from '@/lib/validation';

/**
 * PATCH  /api/v1/admin/faculties/:id — แก้ไขข้อมูลคณะ
 * DELETE /api/v1/admin/faculties/:id — ลบคณะที่ยังไม่มีนิสิตสังกัด
 *
 * User.faculty เก็บเป็น "ชื่อคณะ" ไม่ใช่ foreign key การเปลี่ยนชื่อจึงต้องตามไปแก้
 * ในตาราง User ด้วยภายในทรานแซกชันเดียวกัน ไม่งั้นนิสิตทั้งคณะจะกลายเป็นชื่อคณะที่ไม่มีอยู่
 * และหลุดจากตัวกรอง "กรองตามคณะ" ในหน้าจัดการผู้ใช้ทันที
 */

export const PATCH = handler(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const admin = await requireAdmin();
  const body = await readJson<Record<string, unknown>>(req);

  const current = await prisma.faculty.findUnique({ where: { id } });
  if (!current) fail('NOT_FOUND');

  /* ── สลับลำดับกับคณะที่อยู่ติดกัน ── */
  if (body.move === 'up' || body.move === 'down') {
    const neighbour = await prisma.faculty.findFirst({
      where: body.move === 'up' ? { order: { lt: current.order } } : { order: { gt: current.order } },
      orderBy: { order: body.move === 'up' ? 'desc' : 'asc' },
    });
    if (!neighbour) return NextResponse.json({ ok: true, moved: false });

    await prisma.$transaction([
      prisma.faculty.update({ where: { id: current.id }, data: { order: neighbour.order } }),
      prisma.faculty.update({ where: { id: neighbour.id }, data: { order: current.order } }),
    ]);
    return NextResponse.json({ ok: true, moved: true });
  }

  const data: Record<string, unknown> = {};
  const changes: string[] = [];
  let renamedFrom: string | null = null;

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) fail('VALIDATION_ERROR', 'กรุณากรอกชื่อคณะ');
    if (name !== current.name) {
      const clash = await prisma.faculty.findUnique({ where: { name }, select: { id: true } });
      if (clash) fail('VALIDATION_ERROR', 'มีคณะชื่อนี้อยู่แล้ว');
      data.name = name;
      renamedFrom = current.name;
      changes.push(`ชื่อ ${current.name} → ${name}`);
    }
  }

  for (const key of ['nameEn', 'abbr', 'email', 'phone', 'location'] as const) {
    if (body[key] !== undefined) data[key] = String(body[key]).trim();
  }

  if (body.active !== undefined) {
    const active = Boolean(body.active);
    if (active !== current.active) {
      data.active = active;
      changes.push(active ? 'เปิดใช้งาน' : 'ปิดใช้งาน');
    }
  }

  if (!Object.keys(data).length) fail('VALIDATION_ERROR', 'ไม่มีอะไรเปลี่ยนแปลง');

  // เปลี่ยนชื่อคณะกับย้ายนิสิตต้องสำเร็จหรือล้มเหลวไปด้วยกัน
  const { updated, movedUsers } = await prisma.$transaction(async (tx) => {
    const faculty = await tx.faculty.update({ where: { id }, data });
    if (!renamedFrom) return { updated: faculty, movedUsers: 0 };

    const moved = await tx.user.updateMany({
      where: { faculty: renamedFrom },
      data: { faculty: faculty.name },
    });
    return { updated: faculty, movedUsers: moved.count };
  });

  if (changes.length) {
    const tail = movedUsers ? ` (ย้ายนิสิต ${movedUsers} คน)` : '';
    await systemLog('info', `แก้ไขคณะ ${current.name}: ${changes.join(' · ')}${tail}`, {
      actorId: admin.id,
      meta: { facultyId: id, changes, movedUsers },
    });
  }

  const students = await prisma.user.count({ where: { faculty: updated.name } });
  return NextResponse.json({ ok: true, faculty: { ...updated, students } });
});

export const DELETE = handler(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const admin = await requireAdmin();

  const target = await prisma.faculty.findUnique({ where: { id } });
  if (!target) fail('NOT_FOUND');

  const students = await prisma.user.count({ where: { faculty: target.name } });
  if (students > 0) {
    fail(
      'VALIDATION_ERROR',
      `คณะนี้มีนิสิตสังกัดอยู่ ${students} คน ย้ายนิสิตออกก่อน หรือปิดการใช้งานแทนการลบ`,
    );
  }

  await prisma.faculty.delete({ where: { id } });
  await systemLog('warning', `ลบคณะ: ${target.name}`, {
    actorId: admin.id,
    meta: { facultyId: id },
  });

  return NextResponse.json({ ok: true });
});
