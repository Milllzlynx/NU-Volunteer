import type { Metadata } from 'next';
import { AdminNotifications, type NotificationRow } from '@/components/admin/AdminNotifications';
import { deriveAdminAlerts } from '@/lib/admin';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const metadata: Metadata = { title: 'การแจ้งเตือน · NU Volunteer' };

/**
 * กล่องการแจ้งเตือนของผู้ดูแลระบบ
 *
 * requireAdmin ซ้ำกับที่ layout ตรวจไว้แล้ว แต่หน้าเซิร์ฟเวอร์แต่ละหน้าต้องยืนได้ด้วยตัวเอง
 * ไม่ฝากความปลอดภัยไว้กับ layout ซึ่งเป็นแค่เรื่องของการจัดวางหน้าจอ
 */
export default async function AdminNotificationsPage() {
  const user = await requireAdmin();

  const [rows, alerts] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    deriveAdminAlerts(),
  ]);

  const notifications: NotificationRow[] = rows.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    read: n.read,
    createdAtMs: n.createdAt.getTime(),
  }));

  return <AdminNotifications notifications={notifications} alerts={alerts} />;
}
