import { redirect } from 'next/navigation';
import { OrganizerFeedback, type ReviewRow } from '@/components/organizer/OrganizerFeedback';
import { DATE_EN, DATE_TH } from '@/lib/activities';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ownedActivityFilter } from '@/lib/organizer';

/** เพดานจำนวนรีวิวที่ดึงมาแสดง — เท่ากับหน้าอื่นของผู้จัดที่กรองต่อฝั่งไคลเอนต์ */
const MAX_ROWS = 500;

export default async function OrganizerFeedbackPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const rows = await prisma.review.findMany({
    where: { activity: ownedActivityFilter(user) },
    orderBy: { createdAt: 'desc' },
    take: MAX_ROWS,
    include: {
      user: { select: { name: true, faculty: true, avatarUrl: true } },
      activity: {
        select: { id: true, title: true, category: { select: { color: true } } },
      },
    },
  });

  const list: ReviewRow[] = rows.map((r) => ({
    id: r.id,
    stars: r.stars,
    comment: r.comment,
    authorName: r.user.name,
    authorFaculty: r.user.faculty ?? '',
    avatarUrl: r.user.avatarUrl,
    activityId: r.activity.id,
    activityTitle: r.activity.title,
    categoryColor: r.activity.category.color,
    dateTh: DATE_TH.format(r.createdAt),
    dateEn: DATE_EN.format(r.createdAt),
  }));

  return <OrganizerFeedback rows={list} />;
}
