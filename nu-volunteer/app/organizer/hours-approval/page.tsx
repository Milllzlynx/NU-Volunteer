import { redirect } from 'next/navigation';
import { OrganizerHours, type HoursRow } from '@/components/organizer/OrganizerHours';
import { DATE_EN, DATE_TH } from '@/lib/activities';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ownedActivityFilter } from '@/lib/organizer';

export default async function OrganizerHoursPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const scope = ownedActivityFilter(user);

  const [rows, activityRows] = await Promise.all([
    prisma.registration.findMany({
      // เฉพาะคนที่เช็กเอาต์แล้ว — ก่อนหน้านั้นยังไม่มีอะไรให้รับรอง
      where: { activity: scope, status: { in: ['checked-out', 'completed'] } },
      orderBy: [{ hoursApprovedAt: 'asc' }, { checkedOutAt: 'desc' }],
      take: 500,
      include: {
        user: { select: { name: true, studentId: true, faculty: true, avatarUrl: true } },
        activity: { select: { id: true, title: true, hours: true } },
        evidence: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    }),
    prisma.activity.findMany({
      where: scope,
      orderBy: { startAt: 'desc' },
      select: { id: true, title: true },
    }),
  ]);

  const list: HoursRow[] = rows.map((r) => {
    const ev = r.evidence[0] ?? null;
    return {
      id: r.id,
      status: r.status,
      studentName: r.user.name,
      studentId: r.user.studentId ?? '',
      faculty: r.user.faculty ?? '',
      avatarUrl: r.user.avatarUrl,
      activityId: r.activity.id,
      activityTitle: r.activity.title,
      activityHours: r.activity.hours,
      hoursComputed: r.hoursComputed,
      hoursAwarded: r.hoursAwarded,
      approved: r.hoursApprovedAt != null,
      checkedOutTh: r.checkedOutAt ? DATE_TH.format(r.checkedOutAt) : '—',
      checkedOutEn: r.checkedOutAt ? DATE_EN.format(r.checkedOutAt) : '—',
      evidence: ev
        ? {
            id: ev.id,
            fileUrl: ev.fileUrl,
            fileName: ev.fileName,
            note: ev.note,
            status: ev.status,
            reviewNote: ev.reviewNote,
          }
        : null,
    };
  });

  return <OrganizerHours rows={list} activities={activityRows} />;
}
