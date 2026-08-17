import { redirect } from 'next/navigation';
import { OrganizerHome, type UpcomingRow } from '@/components/organizer/OrganizerHome';
import { DATE_EN, DATE_TH, JOINED, SEAT_TAKEN, timeOf } from '@/lib/activities';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ownedActivityFilter } from '@/lib/organizer';
import type { UserModel } from '@/lib/generated/prisma/models';

async function loadHome(user: UserModel) {
  const scope = ownedActivityFilter(user);
  const now = new Date();

  const [activities, open, pending, participants, hours, upcomingRows] = await Promise.all([
    prisma.activity.count({ where: scope }),
    prisma.activity.count({ where: { ...scope, status: 'open', endAt: { gte: now } } }),
    prisma.registration.count({ where: { status: 'pending', activity: scope } }),
    // นับผู้เข้าร่วมแบบไม่ซ้ำคน คนเดิมที่มาหลายกิจกรรมนับครั้งเดียว
    prisma.registration.groupBy({
      by: ['userId'],
      where: { status: { in: JOINED }, activity: scope },
    }),
    prisma.registration.aggregate({
      _sum: { hoursAwarded: true },
      where: { activity: scope },
    }),
    prisma.activity.findMany({
      where: { ...scope, endAt: { gte: now }, status: { not: 'cancelled' } },
      orderBy: { startAt: 'asc' },
      take: 6,
      include: {
        _count: { select: { registrations: { where: { status: 'pending' } } } },
        registrations: { where: { status: { in: SEAT_TAKEN } }, select: { id: true } },
      },
    }),
  ]);

  const upcoming: UpcomingRow[] = upcomingRows.map((a) => ({
    id: a.id,
    title: a.title,
    status: a.status,
    dateTh: DATE_TH.format(a.startAt),
    dateEn: DATE_EN.format(a.startAt),
    time: `${timeOf(a.startAt)} - ${timeOf(a.endAt)}`,
    seatsFilled: a.registrations.length,
    seatsTotal: a.seatsTotal,
    pending: a._count.registrations,
  }));

  return {
    stats: {
      activities,
      open,
      pending,
      participants: participants.length,
      hoursAwarded: Math.round(hours._sum.hoursAwarded ?? 0),
    },
    upcoming,
  };
}

export default async function OrganizerHomePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const data = await loadHome(user);

  return <OrganizerHome name={user.name} stats={data.stats} upcoming={data.upcoming} />;
}
