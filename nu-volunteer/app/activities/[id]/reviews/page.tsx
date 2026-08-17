import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ReviewsView } from '@/components/activity/ReviewsView';
import { AppShell } from '@/components/layout/AppShell';
import { Shell } from '@/components/layout/Shell';
import { getCurrentUser, publicUser } from '@/lib/auth';
import { getActivityDetail } from '@/lib/activityDetail';
import { AVAILABLE_PAGES } from '@/lib/routes';

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const user = await getCurrentUser();
  const activity = await getActivityDetail(id, user?.id ?? null, user?.role ?? null);
  if (!activity) return { title: 'ไม่พบกิจกรรม · NU Volunteer' };
  return { title: `รีวิว · ${activity.title} · NU Volunteer` };
}

/**
 * หน้ารีวิวเต็มหน้า — แยกออกมาจากลิ้นชักที่เคยเปิดคาหน้ารายการ
 *
 * เปิดให้ผู้เยี่ยมชมอ่านได้ (เห็นชื่อผู้รีวิวแบบย่อตามที่ getActivityDetail ย่อมาให้)
 * ส่วนฟอร์มเขียนรีวิวขึ้นเฉพาะคนที่เข้าร่วมกิจกรรมนี้จนจบแล้วเท่านั้น
 */
export default async function ActivityReviewsPage({ params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();
  const activity = await getActivityDetail(id, user?.id ?? null, user?.role ?? null);
  if (!activity) notFound();

  const body = <ReviewsView activity={activity} />;

  if (!user) {
    return (
      <Shell>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 18px 56px' }}>{body}</div>
      </Shell>
    );
  }

  return (
    <AppShell account={publicUser(user)} available={AVAILABLE_PAGES[user.role] ?? []}>
      {body}
    </AppShell>
  );
}
