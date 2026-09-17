import type { Metadata } from 'next';
import { AdminOrganizers, type OrganizerCountRow } from '@/components/admin/AdminOrganizers';
import { NOT_DELETED } from '@/lib/activities';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const metadata: Metadata = { title: 'ผู้จัดกิจกรรม · NU Volunteer' };

/**
 * จำนวนกิจกรรมของบัญชีผู้จัดและแอดมินแต่ละคน แยกตามสถานะ
 *
 * "ผู้จัด" ในหน้านี้คือบัญชีเจ้าของกิจกรรม (Activity.organizerId) ไม่ใช่ชื่อหน่วยงาน (orgName)
 * organizerId มาจากบัญชีที่ล็อกอินตอนสร้างเสมอ จึงนับได้ตรง ส่วน orgName เป็นข้อความอิสระ
 * ที่พิมพ์ไม่เหมือนกันได้ — แสดงไว้ประกอบว่าบัญชีนั้นเคยจัดในนามหน่วยงานไหนบ้าง
 *
 * รวมบัญชีที่ยังไม่มีกิจกรรมและบัญชีที่ถูกระงับด้วย แอดมินจะได้เห็นว่าใครยังไม่เคยสร้าง
 * และกิจกรรมของบัญชีที่ระงับไปแล้วยังนับอยู่ที่ใคร
 */
export default async function AdminOrganizersPage() {
  await requireAdmin();

  const [staff, counts, orgNames] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ['organizer', 'admin'] } },
      select: { id: true, name: true, email: true, role: true, active: true },
    }),
    prisma.activity.groupBy({
      by: ['organizerId', 'status'],
      where: NOT_DELETED,
      _count: { _all: true },
    }),
    prisma.activity.findMany({
      where: NOT_DELETED,
      distinct: ['organizerId', 'orgName'],
      select: { organizerId: true, orgName: true },
    }),
  ]);

  const rows: OrganizerCountRow[] = staff.map((u) => {
    const byStatus: Record<string, number> = {};
    for (const c of counts) if (c.organizerId === u.id) byStatus[c.status] = c._count._all;
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      active: u.active,
      total: Object.values(byStatus).reduce((s, n) => s + n, 0),
      byStatus,
      orgNames: orgNames
        .filter((o) => o.organizerId === u.id && o.orgName.trim())
        .map((o) => o.orgName.trim())
        .filter((name, i, all) => all.indexOf(name) === i)
        .sort((a, b) => a.localeCompare(b, 'th')),
    };
  });

  rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'th'));

  return <AdminOrganizers rows={rows} />;
}
