import { redirect } from 'next/navigation';
import { OrganizerReports } from '@/components/organizer/OrganizerReports';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { loadActivityReport } from '@/lib/organizer';
import type { CategoryOption } from '@/components/reports/CategoryFilter';

export default async function OrganizerReportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [rows, categoryRows] = await Promise.all([
    loadActivityReport(user),
    // หมวดทั้งหมดที่เปิดใช้งาน ไม่ใช่เฉพาะหมวดที่ผู้จัดคนนี้เคยจัด
    // เรียงตามคอลัมน์ order ซึ่งเป็นลำดับที่ตั้งใจให้ผู้ใช้เห็น ไม่ใช่ลำดับตัวอักษร
    prisma.category.findMany({
      where: { active: true },
      orderBy: [{ order: 'asc' }, { label: 'asc' }],
    }),
  ]);

  const allCategories: CategoryOption[] = categoryRows.map((c) => ({
    id: c.id,
    label: c.label,
    labelEn: c.labelEn,
    color: c.color,
  }));

  return <OrganizerReports rows={rows} allCategories={allCategories} />;
}
