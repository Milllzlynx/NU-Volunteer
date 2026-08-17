import { redirect } from 'next/navigation';
import {
  OrganizerCancellations,
  type CancellationRow,
} from '@/components/organizer/OrganizerCancellations';
import { CANCEL_LEAD_DAYS, DATE_EN, DATE_TH } from '@/lib/activities';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ownedActivityFilter } from '@/lib/organizer';

const MS_PER_DAY = 86_400_000;

export default async function OrganizerCancellationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const rows = await prisma.registration.findMany({
    where: { activity: ownedActivityFilter(user), cancelRequested: true },
    // คำขอที่ยังไม่พิจารณาขึ้นก่อน (pending < approved < rejected ตามลำดับตัวอักษร)
    orderBy: [{ cancelStatus: 'asc' }, { updatedAt: 'desc' }],
    take: 300,
    include: {
      user: { select: { name: true, studentId: true, faculty: true, avatarUrl: true } },
      activity: { select: { id: true, title: true, startAt: true } },
    },
  });

  const now = new Date();

  const list: CancellationRow[] = rows.map((r) => {
    const daysBefore = Math.floor((r.activity.startAt.getTime() - now.getTime()) / MS_PER_DAY);
    return {
      id: r.id,
      studentName: r.user.name,
      studentId: r.user.studentId ?? '',
      faculty: r.user.faculty ?? '',
      avatarUrl: r.user.avatarUrl,
      activityId: r.activity.id,
      activityTitle: r.activity.title,
      status: r.status,
      reason: r.cancelReason ?? '',
      cancelStatus: r.cancelStatus ?? 'pending',
      // ไม่มีคอลัมน์เวลาที่ยื่นคำขอโดยเฉพาะ — updatedAt คือครั้งล่าสุดที่ใบถูกแก้ ซึ่งคือตอนยื่น
      requestedTh: DATE_TH.format(r.updatedAt),
      requestedEn: DATE_EN.format(r.updatedAt),
      activityDateTh: DATE_TH.format(r.activity.startAt),
      activityDateEn: DATE_EN.format(r.activity.startAt),
      daysBefore,
      late: daysBefore < CANCEL_LEAD_DAYS,
    };
  });

  return <OrganizerCancellations rows={list} />;
}
