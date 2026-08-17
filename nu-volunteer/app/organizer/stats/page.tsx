import { redirect } from 'next/navigation';
import { OrganizerStats } from '@/components/organizer/OrganizerStats';
import { getCurrentUser } from '@/lib/auth';
import { loadActivityReport } from '@/lib/organizer';

export default async function OrganizerStatsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const rows = await loadActivityReport(user);

  return <OrganizerStats rows={rows} />;
}
