import { redirect } from 'next/navigation';
import {
  OrganizerActivities,
  type OrganizerActivityRow,
} from '@/components/organizer/OrganizerActivities';
import { DATE_EN, DATE_TH, SEAT_TAKEN, timeOf } from '@/lib/activities';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ownedActivityFilter } from '@/lib/organizer';

export default async function OrganizerActivitiesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const now = new Date();
  const rows = await prisma.activity.findMany({
    where: ownedActivityFilter(user),
    orderBy: { startAt: 'desc' },
    include: {
      category: { select: { label: true, labelEn: true, color: true } },
      _count: { select: { registrations: { where: { status: 'pending' } } } },
      registrations: { where: { status: { in: SEAT_TAKEN } }, select: { id: true } },
    },
  });

  const list: OrganizerActivityRow[] = rows.map((a) => ({
    id: a.id,
    title: a.title,
    categoryLabel: a.category.label,
    categoryColor: a.category.color,
    status: a.status,
    dateTh: DATE_TH.format(a.startAt),
    dateEn: DATE_EN.format(a.startAt),
    time: `${timeOf(a.startAt)} - ${timeOf(a.endAt)}`,
    location: a.location,
    hours: a.hours,
    seatsTotal: a.seatsTotal,
    seatsFilled: a.registrations.length,
    pending: a._count.registrations,
    past: a.endAt.getTime() < now.getTime(),
  }));

  return <OrganizerActivities rows={list} />;
}
