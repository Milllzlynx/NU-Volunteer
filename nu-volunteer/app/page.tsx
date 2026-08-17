import { Shell } from '@/components/layout/Shell';
import { Landing } from '@/components/landing/Landing';
import type { PublicCategory } from '@/components/landing/types';
import { SEAT_TAKEN, toPublicActivities } from '@/lib/activities';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

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

  const categories: PublicCategory[] = categoryRows.map((c) => ({
    id: c.id,
    label: c.label,
    labelEn: c.labelEn,
    color: c.color,
  }));

  return {
    categories,
    activities: await toPublicActivities(activityRows),
    stats: {
      activities: activityTotal,
      participants: participantRows.length,
      hours: Math.round(hoursAgg._sum.hoursAwarded ?? 0),
    },
  };
}

export default async function HomePage() {
  const [user, data] = await Promise.all([getCurrentUser(), loadLanding()]);

  // สถานะของผู้ใช้ต่อกิจกรรมที่แสดงอยู่ — ทำให้การ์ดบอกได้ว่า "ลงทะเบียนแล้ว" หรือถูกใจไว้แล้ว
  const ids = data.activities.map((a) => a.id);
  const [registrations, favorites] = user
    ? await Promise.all([
        prisma.registration.findMany({
          where: { userId: user.id, activityId: { in: ids } },
          select: { activityId: true, status: true },
        }),
        prisma.favorite.findMany({
          where: { userId: user.id, activityId: { in: ids } },
          select: { activityId: true },
        }),
      ])
    : [[], []];

  return (
    <Shell>
      <Landing
        account={user ? { name: user.name, email: user.email, role: user.role } : null}
        stats={data.stats}
        categories={data.categories}
        activities={data.activities}
        myStatus={Object.fromEntries(registrations.map((r) => [r.activityId, r.status]))}
        myFavorites={favorites.map((f) => f.activityId)}
      />
    </Shell>
  );
}
