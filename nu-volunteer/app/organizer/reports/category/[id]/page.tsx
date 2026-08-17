import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { OrganizerReports } from '@/components/organizer/OrganizerReports';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { loadActivityReport } from '@/lib/organizer';
import type { CategoryOption } from '@/components/reports/CategoryFilter';

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const category = await prisma.category.findUnique({ where: { id }, select: { label: true } });
  if (!category) return { title: 'ไม่พบหมวดหมู่ · NU Volunteer' };
  return { title: `รายงาน ${category.label} · NU Volunteer` };
}

/**
 * รายงานเฉพาะหมวดหมู่เดียว เช่น /organizer/reports/category/acad (ด้านส่งเสริมวิชาการ)
 *
 * ใช้คอมโพเนนต์เดียวกับหน้ารายงานปกติ ต่างแค่ล็อกหมวดไว้จาก URL
 * ผู้จัดจึงได้ตัวกรอง ตาราง การ์ด CSV และการพิมพ์ ครบเหมือนเดิมทุกอย่าง
 *
 * แถวที่ส่งเข้าไปถูกกรองตั้งแต่ฝั่งเซิร์ฟเวอร์แล้ว ไม่ได้ส่งทั้งหมดไปให้ฝั่งเบราว์เซอร์กรองเอง
 * รายงานของหมวดหนึ่งไม่ควรพากิจกรรมของหมวดอื่นติดลงไปในหน้าเว็บด้วย
 */
export default async function OrganizerCategoryReportPage({ params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const categoryRow = await prisma.category.findUnique({ where: { id } });
  if (!categoryRow) notFound();

  const all = await loadActivityReport(user);
  const rows = all.filter((r) => r.categoryId === id);

  const lockedCategory: CategoryOption = {
    id: categoryRow.id,
    label: categoryRow.label,
    labelEn: categoryRow.labelEn,
    color: categoryRow.color,
  };

  return <OrganizerReports rows={rows} lockedCategory={lockedCategory} />;
}
