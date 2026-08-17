import { redirect } from 'next/navigation';
import { StudentSettings } from '@/components/student/StudentSettings';
import { deriveAlerts, getPrefs } from '@/lib/alerts';
import { getCurrentUser } from '@/lib/auth';

export default async function StudentSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const prefs = await getPrefs(user.id);
  const alerts = await deriveAlerts(user.id, prefs);

  return (
    <StudentSettings
      prefs={prefs}
      account={{ name: user.name, email: user.email, shareContact: user.shareContact }}
      // ให้เห็นผลทันทีว่าการตั้งค่าปัจจุบันทำให้มีการเตือนกี่รายการ
      activeAlerts={{
        reminder: alerts.filter((a) => a.kind === 'activity-reminder').length,
        deadline: alerts.filter((a) => a.kind === 'deadline').length,
      }}
    />
  );
}
