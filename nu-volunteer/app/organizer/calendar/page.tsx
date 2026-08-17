import { redirect } from 'next/navigation';
import {
  OrganizerCalendar,
  type OrganizerCalendarItem,
} from '@/components/organizer/OrganizerCalendar';
import { SEAT_TAKEN, dayKeyOf, timeOf } from '@/lib/activities';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ownedActivityFilter } from '@/lib/organizer';

export default async function OrganizerCalendarPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const rows = await prisma.activity.findMany({
    where: ownedActivityFilter(user),
    orderBy: { startAt: 'asc' },
    include: {
      category: { select: { color: true } },
      _count: { select: { registrations: { where: { status: 'pending' } } } },
      registrations: { where: { status: { in: SEAT_TAKEN } }, select: { id: true } },
    },
  });

  const items: OrganizerCalendarItem[] = rows.map((a) => ({
    id: a.id,
    title: a.title,
    // คีย์วันคำนวณฝั่งเซิร์ฟเวอร์ตามเวลาไทย ฝั่ง client จึงไม่ต้องแตะ timezone อีก
    day: dayKeyOf(a.startAt),
    endDay: dayKeyOf(a.endAt),
    time: `${timeOf(a.startAt)} - ${timeOf(a.endAt)}`,
    status: a.status,
    categoryColor: a.category.color,
    location: a.location,
    seatsFilled: a.registrations.length,
    seatsTotal: a.seatsTotal,
    pending: a._count.registrations,
  }));

  return <OrganizerCalendar items={items} todayKey={dayKeyOf(new Date())} />;
}
