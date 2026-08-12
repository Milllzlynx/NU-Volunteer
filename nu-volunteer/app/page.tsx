import { Shell } from '@/components/layout/Shell';
import { Landing } from '@/components/landing/Landing';
import type { PublicActivity, PublicCategory } from '@/components/landing/types';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

/** สถานะการลงทะเบียนที่นับว่ากินที่นั่งไปแล้ว */
const SEAT_TAKEN = ['pending', 'approved', 'checked-in', 'checked-out', 'completed'];

const TZ = 'Asia/Bangkok';
// จัดรูปแบบวันที่ฝั่งเซิร์ฟเวอร์ พร้อมตรึงเขตเวลา เพื่อให้ผลลัพธ์ SSR ตรงกับฝั่ง client เสมอ
const DATE_TH = new Intl.DateTimeFormat('th-TH', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: TZ,
});
const DATE_EN = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: TZ,
});

async function loadLanding() {
  const now = new Date();

  const [categoryRows, activityRows, activityTotal, participantRows, hoursAgg] = await Promise.all([
    prisma.category.findMany({
      where: { active: true },
      orderBy: [{ order: 'asc' }, { label: 'asc' }],
    }),
    prisma.activity.findMany({
      where: { status: 'open', endAt: { gte: now } },
      orderBy: { startAt: 'asc' },
      take: 24,
      include: { category: true },
    }),
    prisma.activity.count({ where: { status: { not: 'draft' } } }),
    // นับ "นิสิตผู้เข้าร่วม" แบบไม่ซ้ำคน
    prisma.registration.groupBy({ by: ['userId'], where: { status: { in: SEAT_TAKEN } } }),
    prisma.registration.aggregate({ _sum: { hoursAwarded: true } }),
  ]);

  const seatCounts = activityRows.length
    ? await prisma.registration.groupBy({
        by: ['activityId'],
        where: { activityId: { in: activityRows.map((a) => a.id) }, status: { in: SEAT_TAKEN } },
        _count: { _all: true },
      })
    : [];
  const filled = new Map(seatCounts.map((c) => [c.activityId, c._count._all]));

  const categories: PublicCategory[] = categoryRows.map((c) => ({
    id: c.id,
    label: c.label,
    labelEn: c.labelEn,
    color: c.color,
  }));

  const activities: PublicActivity[] = activityRows.map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    photo: a.photo,
    dateTh: DATE_TH.format(a.startAt),
    dateEn: DATE_EN.format(a.startAt),
    hours: a.hours,
    location: a.location,
    seatsFilled: filled.get(a.id) ?? 0,
    seatsTotal: a.seatsTotal,
    category: {
      id: a.category.id,
      label: a.category.label,
      labelEn: a.category.labelEn,
      color: a.category.color,
    },
  }));

  return {
    categories,
    activities,
    stats: {
      activities: activityTotal,
      participants: participantRows.length,
      hours: Math.round(hoursAgg._sum.hoursAwarded ?? 0),
    },
  };
}

export default async function HomePage() {
  const [user, data] = await Promise.all([getCurrentUser(), loadLanding()]);

  return (
    <Shell>
      <Landing
        account={user ? { name: user.name, email: user.email, role: user.role } : null}
        stats={data.stats}
        categories={data.categories}
        activities={data.activities}
      />
    </Shell>
  );
}
