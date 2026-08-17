import type { Metadata } from 'next';
import { AdminHome, type LogRow } from '@/components/admin/AdminHome';
import { DATE_EN, DATE_TH, timeOf } from '@/lib/activities';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const metadata: Metadata = { title: 'หน้าหลักผู้ดูแลระบบ · NU Volunteer' };

/**
 * แดชบอร์ดผู้ดูแลระบบ — นับทั้งระบบ ไม่กรองตามเจ้าของเหมือนฝั่งผู้จัดกิจกรรม
 *
 * requireAdmin ซ้ำกับที่ layout ตรวจไว้แล้ว แต่หน้าเซิร์ฟเวอร์แต่ละหน้าต้องยืนได้ด้วยตัวเอง
 * ไม่ฝากความปลอดภัยไว้กับ layout ซึ่งเป็นแค่เรื่องของการจัดวางหน้าจอ
 */
export default async function AdminHomePage() {
  const user = await requireAdmin();
  const now = new Date();

  const [
    users,
    students,
    organizers,
    suspended,
    activities,
    openActivities,
    hours,
    deletionRequests,
    unreadContact,
    logRows,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'student' } }),
    prisma.user.count({ where: { role: 'organizer' } }),
    prisma.user.count({ where: { active: false } }),
    prisma.activity.count(),
    prisma.activity.count({ where: { status: 'open', endAt: { gte: now } } }),
    prisma.registration.aggregate({ _sum: { hoursAwarded: true } }),
    prisma.user.count({ where: { deletionRequestedAt: { not: null } } }),
    prisma.contactMessage.count({ where: { read: false } }),
    prisma.systemLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { actor: { select: { name: true } } },
    }),
  ]);

  const logs: LogRow[] = logRows.map((l) => ({
    id: l.id,
    level: l.level,
    text: l.text,
    actor: l.actor?.name ?? null,
    atTh: `${DATE_TH.format(l.createdAt)} ${timeOf(l.createdAt)}`,
    atEn: `${DATE_EN.format(l.createdAt)} ${timeOf(l.createdAt)}`,
  }));

  return (
    <AdminHome
      name={user.name || user.email}
      stats={{
        users,
        students,
        organizers,
        suspended,
        activities,
        openActivities,
        hoursAwarded: Math.round(hours._sum.hoursAwarded ?? 0),
        deletionRequests,
        unreadContact,
      }}
      logs={logs}
    />
  );
}
