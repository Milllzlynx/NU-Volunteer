import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CategoryActivities } from '@/components/activity/CategoryActivities';
import { AppShell } from '@/components/layout/AppShell';
import { Shell } from '@/components/layout/Shell';
import { toPublicActivities } from '@/lib/activities';
import { getCurrentUser, publicUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { AVAILABLE_PAGES } from '@/lib/routes';
import type { PublicCategory } from '@/components/landing/types';

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const category = await prisma.category.findUnique({ where: { id }, select: { label: true } });
  if (!category) return { title: 'ไม่พบหมวดหมู่ · NU Volunteer' };
  return { title: `${category.label} · NU Volunteer` };
}

/**
 * หน้ารวมกิจกรรมของหมวดหมู่เดียว เช่น /activities/category/acad (ด้านส่งเสริมวิชาการ)
 *
 * เป็นหน้าเดียวใช้ได้ทุกหมวด ไม่ได้ทำแยกรายหมวด เพราะทั้งชื่อและสีอ่านมาจากตาราง Category
 * เพิ่มหมวดใหม่ในฐานข้อมูลแล้วหน้าของหมวดนั้นมีทันที ไม่ต้องสร้างไฟล์เพิ่ม
 *
 * เปิดได้ทั้งผู้เยี่ยมชมและผู้ที่เข้าสู่ระบบแล้ว ใช้โครงหน้าแบบเดียวกับหน้ารายละเอียดกิจกรรม
 * เพื่อให้ลิงก์ที่แชร์ออกไปเปิดได้โดยไม่ต้องเข้าสู่ระบบ
 */
export default async function ActivityCategoryPage({ params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();

  const categoryRow = await prisma.category.findUnique({ where: { id } });
  if (!categoryRow || !categoryRow.active) notFound();

  const now = new Date();
  const activityRows = await prisma.activity.findMany({
    where: { categoryId: id, status: 'open', endAt: { gte: now } },
    orderBy: { startAt: 'asc' },
    include: { category: true },
  });

  // รายการโปรดและสถานะการลงทะเบียนเป็นข้อมูลส่วนบุคคล ผู้เยี่ยมชมไม่ต้องมี
  const [favoriteRows, registrationRows] = user
    ? await Promise.all([
        prisma.favorite.findMany({ where: { userId: user.id }, select: { activityId: true } }),
        prisma.registration.findMany({
          where: { userId: user.id },
          select: { activityId: true, status: true },
        }),
      ])
    : [[], []];

  const category: PublicCategory = {
    id: categoryRow.id,
    label: categoryRow.label,
    labelEn: categoryRow.labelEn,
    color: categoryRow.color,
  };

  const body = (
    <CategoryActivities
      category={category}
      activities={await toPublicActivities(activityRows)}
      signedIn={Boolean(user)}
      /* ไม่มีหน้า /activities ที่รวมทุกหมวด — นิสิตกลับไปหน้าค้นหากิจกรรม ที่เหลือกลับหน้าแรก */
      backHref={user?.role === 'student' ? '/student/discover' : '/#nuv-activities'}
      myFavorites={favoriteRows.map((f) => f.activityId)}
      myStatus={Object.fromEntries(registrationRows.map((r) => [r.activityId, r.status]))}
    />
  );

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
