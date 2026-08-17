import { redirect } from 'next/navigation';
import { StudentNotifications } from '@/components/student/StudentNotifications';
import type { AlertRow, NotificationRow } from '@/components/student/StudentNotifications';
import { deriveAlerts, getPrefs } from '@/lib/alerts';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export default async function StudentNotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const prefs = await getPrefs(user.id);

  const [rows, alerts] = await Promise.all([
    prisma.notification.findMany({
      where: {
        userId: user.id,
        // เคารพการตั้งค่า — ปิดประกาศระบบไว้ก็ไม่ต้องแสดงในกล่อง
        ...(prefs.systemNotice ? {} : { type: { not: 'system' } }),
      },
      orderBy: { createdAt: 'desc' },
    }),
    deriveAlerts(user.id, prefs),
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

  const alertRows: AlertRow[] = alerts.map((a) => ({
    key: a.key,
    kind: a.kind,
    type: a.type,
    title: a.title,
    body: a.body,
    link: a.link,
    severity: a.severity,
    daysLeft: a.daysLeft,
  }));

  return <StudentNotifications notifications={notifications} alerts={alertRows} />;
}
