import { NextResponse } from 'next/server';
import { DATE_EN, DATE_TH } from '@/lib/activities';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handler } from '@/lib/errors';
import type { Prisma } from '@/lib/generated/prisma/client';

/**
 * GET /api/v1/admin/users?q=&role=&state=&faculty=&page=
 *
 * รายชื่อผู้ใช้ทั้งระบบสำหรับหน้าจัดการผู้ใช้ของแอดมิน
 *
 * ต่างจาก /api/v1/search?scope=users ตรงที่หน้านี้ต้องการ "ทั้งตาราง" แบบแบ่งหน้า
 * ไม่ใช่ผลลัพธ์ยอดนิยมไม่กี่รายการ และคืนฟิลด์สำหรับการดูแลระบบ (สถานะบัญชี คำขอลบ)
 * ที่ปลายทางค้นหาไม่ควรส่งให้ผู้จัดกิจกรรมเห็น
 *
 * หมายเหตุเรื่อง SQLite: `contains` แปลงเป็น LIKE ซึ่งไม่สนตัวพิมพ์ใหญ่เล็กของอักษร ASCII
 * อยู่แล้ว และภาษาไทยไม่มีตัวพิมพ์ จึงไม่ต้องใช้ mode:'insensitive' (SQLite ไม่รองรับ)
 */

const PAGE_SIZE = 30;

const ROLES = ['student', 'organizer', 'admin'] as const;
/** สถานะที่กรองได้ — 'deletion' คือผู้ที่ยื่นคำขอลบบัญชีไว้และยังไม่มีใครพิจารณา */
const STATES = ['active', 'suspended', 'deletion'] as const;

export const GET = handler(async (req) => {
  await requireAdmin();
  const params = new URL(req.url).searchParams;

  const q = (params.get('q') ?? '').trim();
  const role = (params.get('role') ?? '').trim();
  const state = (params.get('state') ?? '').trim();
  const faculty = (params.get('faculty') ?? '').trim();
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);

  const where: Prisma.UserWhereInput = {};

  if (q) {
    where.OR = [
      { name: { contains: q } },
      { email: { contains: q } },
      { studentId: { contains: q } },
    ];
  }
  if ((ROLES as readonly string[]).includes(role)) where.role = role;
  if (faculty) where.faculty = faculty;

  if ((STATES as readonly string[]).includes(state)) {
    if (state === 'active') where.active = true;
    if (state === 'suspended') where.active = false;
    if (state === 'deletion') where.deletionRequestedAt = { not: null };
  }

  const [total, rows, counts, faculties] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      // เรียงใหม่สุดก่อน — บัญชีที่เพิ่งสมัครคือบัญชีที่มักต้องจัดการก่อน
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        studentId: true,
        faculty: true,
        avatarUrl: true,
        active: true,
        deletionRequestedAt: true,
        deletionReason: true,
        createdAt: true,
        _count: { select: { registrations: true, organized: true } },
      },
    }),
    // ตัวเลขบนแท็บ — นับจากทั้งระบบเสมอ ไม่ผูกกับตัวกรองที่เปิดอยู่
    // ไม่งั้นกดกรอง "ระงับ" แล้วตัวเลขแท็บอื่นจะกลายเป็นศูนย์ทั้งแถบ
    Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'student' } }),
      prisma.user.count({ where: { role: 'organizer' } }),
      prisma.user.count({ where: { role: 'admin' } }),
      prisma.user.count({ where: { active: false } }),
      prisma.user.count({ where: { deletionRequestedAt: { not: null } } }),
    ]),
    prisma.faculty.findMany({ orderBy: { order: 'asc' }, select: { name: true } }),
  ]);

  const [all, students, organizers, admins, suspended, deletion] = counts;

  return NextResponse.json({
    ok: true,
    users: rows.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      studentId: u.studentId,
      faculty: u.faculty,
      avatarUrl: u.avatarUrl,
      active: u.active,
      deletionRequested: u.deletionRequestedAt != null,
      deletionReason: u.deletionReason,
      registrations: u._count.registrations,
      organized: u._count.organized,
      joinedTh: DATE_TH.format(u.createdAt),
      joinedEn: DATE_EN.format(u.createdAt),
    })),
    counts: { all, students, organizers, admins, suspended, deletion },
    faculties: faculties.map((f) => f.name),
    page,
    pageSize: PAGE_SIZE,
    total,
    hasMore: page * PAGE_SIZE < total,
  });
});
