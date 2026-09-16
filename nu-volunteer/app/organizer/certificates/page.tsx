import { redirect } from 'next/navigation';
import {
  OrganizerCertificates,
  type PendingCertificateRow,
} from '@/components/organizer/OrganizerCertificates';
import { DATE_EN, DATE_TH, dayKeyOf } from '@/lib/activities';
import { getCurrentUser } from '@/lib/auth';
import { appBaseUrl, listOrganizerCertificates } from '@/lib/certificates';
import { prisma } from '@/lib/db';
import { ownedActivityFilter } from '@/lib/organizer';

export default async function OrganizerCertificatesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const scope = ownedActivityFilter(user);

  const [certificates, pendingRows, activities] = await Promise.all([
    listOrganizerCertificates(scope),
    prisma.registration.findMany({
      // รับรองชั่วโมงแล้วแต่ยังไม่มีใบ — ส่วนใหญ่คือชั่วโมงที่รับรองไว้ก่อนระบบจะออกใบให้อัตโนมัติ
      where: {
        activity: scope,
        status: 'completed',
        hoursApprovedAt: { not: null },
        hoursAwarded: { gt: 0 },
        certificate: { is: null },
      },
      orderBy: { hoursApprovedAt: 'desc' },
      take: 500,
      include: {
        user: { select: { name: true, studentId: true, faculty: true, avatarUrl: true } },
        activity: { select: { id: true, title: true } },
      },
    }),
    prisma.activity.findMany({
      where: scope,
      orderBy: { startAt: 'desc' },
      select: { id: true, title: true },
    }),
  ]);

  const pending: PendingCertificateRow[] = pendingRows.map((r) => ({
    registrationId: r.id,
    studentName: r.user.name,
    studentId: r.user.studentId ?? '',
    faculty: r.user.faculty ?? '',
    avatarUrl: r.user.avatarUrl,
    activityId: r.activity.id,
    activityTitle: r.activity.title,
    hours: r.hoursAwarded,
    approvedTh: DATE_TH.format(r.hoursApprovedAt!),
    approvedEn: DATE_EN.format(r.hoursApprovedAt!),
    approvedKey: dayKeyOf(r.hoursApprovedAt!),
  }));

  return (
    <OrganizerCertificates
      certificates={certificates}
      pending={pending}
      activities={activities}
      verifyBase={appBaseUrl()}
    />
  );
}
