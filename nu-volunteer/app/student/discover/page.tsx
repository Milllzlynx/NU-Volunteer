import { redirect } from 'next/navigation';
import { StudentDiscover } from '@/components/student/StudentDiscover';
import { sortActivities, toPublicActivities } from '@/lib/activities';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import type { PublicCategory } from '@/components/landing/types';

async function loadDiscover(userId: string) {
  const now = new Date();

  const [categoryRows, activityRows, favoriteRows, registrationRows] = await Promise.all([
    prisma.category.findMany({
      where: { active: true },
      orderBy: [{ order: 'asc' }, { label: 'asc' }],
    }),
    // เอาฉบับร่างออกอย่างเดียว — กิจกรรมที่จบแล้วยังต้องเห็น เพียงแต่ถูกเรียงไปท้ายสุด
    prisma.activity.findMany({
      where: { status: { not: 'draft' } },
      include: { category: true },
    }),
    prisma.favorite.findMany({ where: { userId }, select: { activityId: true } }),
    prisma.registration.findMany({ where: { userId }, select: { activityId: true, status: true } }),
  ]);

  const categories: PublicCategory[] = categoryRows.map((c) => ({
    id: c.id,
    label: c.label,
    labelEn: c.labelEn,
    color: c.color,
  }));

  return {
    categories,
    activities: await toPublicActivities(sortActivities(activityRows, now)),
    favorites: favoriteRows.map((f) => f.activityId),
    registrations: Object.fromEntries(registrationRows.map((r) => [r.activityId, r.status])),
  };
}

export default async function StudentDiscoverPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const data = await loadDiscover(user.id);

  return (
    <StudentDiscover
      activities={data.activities}
      categories={data.categories}
      favorites={data.favorites}
      registrations={data.registrations}
    />
  );
}
