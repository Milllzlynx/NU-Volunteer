import { redirect } from 'next/navigation';
import { OrganizerProfile } from '@/components/organizer/OrganizerProfile';
import { DATE_EN, DATE_TH } from '@/lib/activities';
import { getCurrentUser } from '@/lib/auth';
import { loadActivityReport } from '@/lib/organizer';
import { summarize } from '@/lib/organizerStats';

export default async function OrganizerProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // ตัวเลขบนโปรไฟล์มาจากชุดเดียวกับหน้าสถิติและหน้ารายงาน จะได้ไม่ขัดกันเอง
  const totals = summarize(await loadActivityReport(user));

  return (
    <OrganizerProfile
      profile={{
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        joinedTh: DATE_TH.format(user.createdAt),
        joinedEn: DATE_EN.format(user.createdAt),
      }}
      stats={{
        activities: totals.activities,
        registered: totals.registered,
        attended: totals.attended,
        hoursAwarded: totals.hoursAwarded,
        ratingAvg: totals.ratingAvg,
        reviewCount: totals.reviewCount,
      }}
    />
  );
}
