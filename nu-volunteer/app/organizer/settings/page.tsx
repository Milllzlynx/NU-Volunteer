import { redirect } from 'next/navigation';
import { OrganizerSettings } from '@/components/organizer/OrganizerSettings';
import { getPrefs } from '@/lib/alerts';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ownedActivityFilter } from '@/lib/organizer';

export default async function OrganizerSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const scope = ownedActivityFilter(user);

  const [prefs, registrations, cancellations, hours] = await Promise.all([
    getPrefs(user.id),
    // นับด้วยเงื่อนไขเดียวกับ deriveOrganizerAlerts เพื่อให้ตัวเลขตรงกับที่หน้าหลักแสดง
    prisma.registration.count({ where: { activity: scope, status: 'pending' } }),
    prisma.registration.count({
      where: { activity: scope, cancelRequested: true, cancelStatus: 'pending' },
    }),
    prisma.registration.count({
      where: { activity: scope, status: 'checked-out', hoursApprovedAt: null },
    }),
  ]);

  return (
    <OrganizerSettings
      prefs={prefs}
      account={{ name: user.name, email: user.email }}
      pendingWork={{ registrations, cancellations, hours }}
    />
  );
}
