import { notFound } from 'next/navigation';
import { ActivityCardDemo } from '@/components/activity/ActivityCardDemo';
import { Shell } from '@/components/layout/Shell';

/**
 * หน้าตัวอย่างคอมโพเนนต์ — เปิดได้เฉพาะตอนพัฒนา
 *
 * ปิดตายบน production เพราะเป็นหน้าเครื่องมือของทีมพัฒนา ไม่ใช่ส่วนหนึ่งของระบบที่ผู้ใช้ต้องเห็น
 * (ถ้าอยากเปิดดูบนเซิร์ฟเวอร์ทดสอบ ให้ตั้ง NODE_ENV ไม่ใช่ production)
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'ActivityCard · ตัวอย่างคอมโพเนนต์',
  robots: { index: false, follow: false },
};

export default function ActivityCardDemoPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <Shell>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '20px 18px 56px' }}>
        <ActivityCardDemo />
      </div>
    </Shell>
  );
}
