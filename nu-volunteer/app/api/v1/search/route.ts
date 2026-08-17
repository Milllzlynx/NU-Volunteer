import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { DATE_EN, DATE_TH } from '@/lib/activities';
import { prisma } from '@/lib/db';
import { fail, handler } from '@/lib/errors';

/**
 * GET /api/v1/search?q=...&scope=all|activities|registrations|users&category=&status=
 *
 * ค้นหาแบบพิมพ์ไปเห็นผลไป — ฝั่งหน้าเว็บหน่วงคีย์แล้วยิงมาที่นี่
 *
 * ขอบเขต users จำกัดเฉพาะเจ้าหน้าที่ (ผู้จัด/แอดมิน) นิสิตค้นหาคนอื่นไม่ได้
 * เพื่อไม่ให้กลายเป็นสมุดรายชื่อนิสิตที่ใครก็เปิดดูได้
 *
 * หมายเหตุเรื่อง SQLite: `contains` แปลงเป็น LIKE ซึ่งไม่สนตัวพิมพ์ใหญ่เล็กของอักษร ASCII
 * อยู่แล้ว และภาษาไทยไม่มีตัวพิมพ์ จึงไม่ต้องใช้ mode:'insensitive' (SQLite ไม่รองรับ)
 */

const MIN_QUERY = 2;
const LIMIT = 20;

type Scope = 'all' | 'activities' | 'registrations' | 'users';
const SCOPES: Scope[] = ['all', 'activities', 'registrations', 'users'];

export const GET = handler(async (req) => {
  const user = await requireUser();
  const params = new URL(req.url).searchParams;

  const q = (params.get('q') ?? '').trim();
  const scopeRaw = (params.get('scope') ?? 'all') as Scope;
  const scope: Scope = SCOPES.includes(scopeRaw) ? scopeRaw : 'all';
  const category = (params.get('category') ?? '').trim();
  const status = (params.get('status') ?? '').trim();

  const isStaff = user.role === 'organizer' || user.role === 'admin';
  if (scope === 'users' && !isStaff) fail('FORBIDDEN');

  // คำค้นสั้นเกินไปคืนผลว่าง ดีกว่าลากทั้งตารางมาแสดง
  if (q.length < MIN_QUERY) {
    return NextResponse.json({ ok: true, q, activities: [], registrations: [], users: [], truncated: false });
  }

  const wants = (s: Scope) => scope === 'all' || scope === s;

  /* ── กิจกรรม ── */
  let activities: unknown[] = [];
  if (wants('activities')) {
    const rows = await prisma.activity.findMany({
      where: {
        status: status ? status : { notIn: ['draft'] },
        ...(category ? { categoryId: category } : {}),
        OR: [
          { title: { contains: q } },
          { description: { contains: q } },
          { orgName: { contains: q } },
          { location: { contains: q } },
        ],
      },
      include: { category: { select: { id: true, label: true, labelEn: true, color: true } } },
      orderBy: { startAt: 'desc' },
      take: LIMIT,
    });
    activities = rows.map((a) => ({
      id: a.id,
      title: a.title,
      orgName: a.orgName,
      location: a.location,
      hours: a.hours,
      status: a.status,
      dateTh: DATE_TH.format(a.startAt),
      dateEn: DATE_EN.format(a.startAt),
      category: a.category,
    }));
  }

  /* ── การลงทะเบียนของตัวเอง (เจ้าหน้าที่เห็นของทุกคน) ── */
  let registrations: unknown[] = [];
  if (wants('registrations')) {
    const rows = await prisma.registration.findMany({
      where: {
        ...(isStaff ? {} : { userId: user.id }),
        ...(status ? { status } : {}),
        activity: {
          ...(category ? { categoryId: category } : {}),
          OR: [{ title: { contains: q } }, { orgName: { contains: q } }, { location: { contains: q } }],
        },
      },
      include: {
        activity: { include: { category: { select: { id: true, label: true, labelEn: true, color: true } } } },
        ...(isStaff ? { user: { select: { name: true, studentId: true } } } : {}),
      },
      orderBy: { regAt: 'desc' },
      take: LIMIT,
    });
    registrations = rows.map((r) => ({
      id: r.id,
      status: r.status,
      hoursAwarded: r.hoursAwarded,
      activityId: r.activityId,
      title: r.activity.title,
      orgName: r.activity.orgName,
      location: r.activity.location,
      dateTh: DATE_TH.format(r.activity.startAt),
      dateEn: DATE_EN.format(r.activity.startAt),
      category: r.activity.category,
      // ชื่อผู้สมัครแสดงเฉพาะฝั่งเจ้าหน้าที่
      who: 'user' in r && r.user ? `${r.user.name} (${r.user.studentId ?? '—'})` : null,
    }));
  }

  /* ── ผู้ใช้ (เจ้าหน้าที่เท่านั้น) ── */
  let users: unknown[] = [];
  if (wants('users') && isStaff) {
    const rows = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { email: { contains: q } },
          { studentId: { contains: q } },
          { faculty: { contains: q } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        studentId: true,
        faculty: true,
        active: true,
        shareContact: true,
      },
      orderBy: { name: 'asc' },
      take: LIMIT,
    });

    // เคารพการตั้งค่าความเป็นส่วนตัว: ผู้ที่ปิด "ให้ผู้จัดเห็นข้อมูลติดต่อ" จะถูกซ่อนอีเมล
    // จากผู้จัดกิจกรรม ส่วนแอดมินยังเห็นได้เพื่อการดูแลระบบและตรวจสอบบัญชี
    users = rows.map(({ shareContact, ...u }) => ({
      ...u,
      email: shareContact || user.role === 'admin' ? u.email : null,
      contactHidden: !shareContact && user.role !== 'admin',
    }));
  }

  return NextResponse.json({
    ok: true,
    q,
    activities,
    registrations,
    users,
    // บอกหน้าเว็บว่าผลถูกตัดที่ LIMIT หรือไม่ จะได้เตือนให้พิมพ์ให้เจาะจงขึ้น
    truncated:
      activities.length === LIMIT || registrations.length === LIMIT || users.length === LIMIT,
  });
});
