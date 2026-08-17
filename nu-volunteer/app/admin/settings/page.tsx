import type { Metadata } from 'next';
import { AdminSettings } from '@/components/admin/AdminSettings';
import { getPrefs } from '@/lib/alerts';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const metadata: Metadata = { title: 'ตั้งค่า · NU Volunteer' };

/**
 * ตั้งค่าของผู้ดูแลระบบ
 *
 * ตัวเลขงานค้างนับด้วยเงื่อนไขเดียวกับ deriveAdminAlerts() ใน lib/admin.ts
 * เพื่อให้ตรงกับที่หน้าแจ้งเตือนและแถบข้างแสดง ไม่ใช่คนละชุดที่ขัดกันเอง
 */
export default async function AdminSettingsPage() {
  const user = await requireAdmin();

  const [prefs, deletionRequests, unreadContact, suspended] = await Promise.all([
    getPrefs(user.id),
    prisma.user.count({ where: { deletionRequestedAt: { not: null } } }),
    prisma.contactMessage.count({ where: { read: false } }),
    prisma.user.count({ where: { active: false } }),
  ]);

  return (
    <AdminSettings
      prefs={prefs}
      account={{ name: user.name, email: user.email }}
      pendingWork={{ deletionRequests, unreadContact, suspended }}
    />
  );
}
