import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ActivityDetail } from '@/components/activity/ActivityDetail';
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
  return {
    title: `${activity.title} · NU Volunteer`,
    description: activity.description.slice(0, 160),
  };
}

/**
 * หน้ารายละเอียดกิจกรรมเต็มหน้า — เปิดได้ทั้งผู้เยี่ยมชมและผู้ที่เข้าสู่ระบบแล้ว
 *
 * ผู้ที่ล็อกอินอยู่จะเห็นหน้านี้ในโครงเดียวกับหน้าอื่นของบทบาทตัวเอง (มีแถบข้าง)
 * ส่วนผู้เยี่ยมชมเห็นเป็นหน้าเดี่ยว เพื่อให้ลิงก์ที่แชร์ออกไปเปิดได้โดยไม่ต้องเข้าสู่ระบบ
 */
export default async function ActivityDetailPage({ params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();
  const activity = await getActivityDetail(id, user?.id ?? null, user?.role ?? null);
  if (!activity) notFound();

  const body = <ActivityDetail activity={activity} signedIn={Boolean(user)} />;

  if (!user) {
    return (
      <Shell>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '20px 18px 56px' }}>{body}</div>
      </Shell>
    );
  }

  return (
    <AppShell account={publicUser(user)} available={AVAILABLE_PAGES[user.role] ?? []}>
      {body}
    </AppShell>
  );
}
