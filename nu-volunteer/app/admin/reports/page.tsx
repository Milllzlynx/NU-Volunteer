import type { Metadata } from 'next';
import { OrganizerReports } from '@/components/organizer/OrganizerReports';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { loadActivityReport } from '@/lib/organizer';
import type { CategoryOption } from '@/components/reports/CategoryFilter';

export const metadata: Metadata = { title: 'รายงาน · NU Volunteer' };

/**
 * รายงานกิจกรรมของผู้ดูแลระบบ
 *
 * ใช้คอมโพเนนต์เดียวกับหน้ารายงานของผู้จัด ไม่ได้เขียนตารางใหม่ —
 * loadActivityReport() กรองขอบเขตจาก ownedActivityFilter() ซึ่งคืน {} ให้บทบาทแอดมิน
 * ส่งผู้ใช้ที่เป็นแอดมินเข้าไปจึงได้กิจกรรมทั้งระบบมาเองโดยไม่ต้องมีเส้นทางข้อมูลที่สอง
 *
 * ที่สำคัญกว่าคือ ตัวกรอง การเรียง การเลือกคอลัมน์ การส่งออก CSV และมุมมองการ์ดบนจอแคบ
 * ต้องทำงานเหมือนกันทั้งสองบทบาท ถ้าแยกไฟล์กันไว้ วันหนึ่งจะมีคอลัมน์ที่แก้ที่เดียวแล้วอีกหน้าไม่ตาม
 */
export default async function AdminReportsPage() {
  const admin = await requireAdmin();

  const [rows, categoryRows] = await Promise.all([
    loadActivityReport(admin),
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
