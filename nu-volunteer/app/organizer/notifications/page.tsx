import { redirect } from 'next/navigation';
import {
  OrganizerNotifications,
  type NotificationRow,
} from '@/components/organizer/OrganizerNotifications';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { deriveOrganizerAlerts } from '@/lib/organizer';

export default async function OrganizerNotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [rows, alerts] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    deriveOrganizerAlerts(user),
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

  return <OrganizerNotifications notifications={notifications} alerts={alerts} />;
}
