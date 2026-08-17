import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ParticipantsView } from '@/components/activity/ParticipantsView';
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
  return { title: `รายชื่อผู้เข้าร่วม · ${activity.title} · NU Volunteer` };
}

/**
 * หน้ารายชื่อผู้เข้าร่วมเต็มหน้า — แยกออกมาจากลิ้นชักที่เคยเปิดคาหน้ารายการ
 *
 * โครงหน้าเหมือน /activities/[id]: ผู้ที่ล็อกอินอยู่เห็นในโครงของบทบาทตัวเอง (มีแถบข้าง)
 * ส่วนผู้เยี่ยมชมเห็นเป็นหน้าเดี่ยว เพื่อให้ลิงก์ที่แชร์ออกไปเปิดได้โดยไม่ต้องเข้าสู่ระบบ
 * (สิทธิ์การเห็นรายชื่อยังตัดสินฝั่งเซิร์ฟเวอร์ใน getActivityDetail เหมือนเดิม)
 */
export default async function ActivityParticipantsPage({ params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();
  const activity = await getActivityDetail(id, user?.id ?? null, user?.role ?? null);
  if (!activity) notFound();

  const body = <ParticipantsView activity={activity} />;

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
