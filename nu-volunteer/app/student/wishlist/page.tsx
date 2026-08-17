import { redirect } from 'next/navigation';
import { StudentWishlist } from '@/components/student/StudentWishlist';
import type { SavedRegistration } from '@/components/student/StudentWishlist';
import { DATE_EN, DATE_TH, seatFillMap, toPublicActivity } from '@/lib/activities';
import { deriveAlerts } from '@/lib/alerts';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export default async function StudentWishlistPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: { activity: { include: { category: true } } },
  });

  const favouriteIds = favorites.map((f) => f.activityId);

  // "การลงทะเบียนที่บันทึกไว้" = ใบลงทะเบียนของกิจกรรมที่กดถูกใจไว้
  const [saved, filled, alerts] = await Promise.all([
    favouriteIds.length
      ? prisma.registration.findMany({
          where: { userId: user.id, activityId: { in: favouriteIds } },
          include: { activity: { include: { category: true } } },
          orderBy: { regAt: 'desc' },
        })
      : Promise.resolve([]),
    seatFillMap(favouriteIds),
    deriveAlerts(user.id),
  ]);

  const savedRegistrations: SavedRegistration[] = saved.map((r) => ({
    id: r.id,
    status: r.status,
    hoursAwarded: r.hoursAwarded,
    title: r.activity.title,
    orgName: r.activity.orgName,
    location: r.activity.location,
    color: r.activity.category.color,
    dateTh: DATE_TH.format(r.activity.startAt),
    dateEn: DATE_EN.format(r.activity.startAt),
  }));

  return (
    <StudentWishlist
      activities={favorites.map((f) => toPublicActivity(f.activity, filled))}
      savedRegistrations={savedRegistrations}
      deadlineCount={alerts.filter((a) => a.kind === 'deadline').length}
    />
  );
}
