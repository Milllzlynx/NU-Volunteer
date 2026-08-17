import { redirect } from 'next/navigation';
import { StudentRegistrations } from '@/components/student/StudentRegistrations';
import type { RegistrationRow } from '@/components/student/StudentRegistrations';
import { DATE_EN, DATE_TH, seatFillMap, toPublicActivity } from '@/lib/activities';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

async function loadRegistrations(userId: string): Promise<RegistrationRow[]> {
  const rows = await prisma.registration.findMany({
    where: { userId },
    orderBy: { regAt: 'desc' },
    include: {
      activity: { include: { category: true } },
      // หลักฐานล่าสุดของการลงทะเบียนใบนี้ — เก่ากว่านั้นเก็บไว้เป็นประวัติ
      evidence: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  // รีวิวผูกกับกิจกรรม ไม่ได้ผูกกับใบลงทะเบียน จึงต้องดึงแยก
  const reviewed = new Set(
    (
      await prisma.review.findMany({
        where: { userId, activityId: { in: rows.map((r) => r.activityId) } },
        select: { activityId: true },
      })
    ).map((r) => r.activityId),
  );

  const filled = await seatFillMap(rows.map((r) => r.activityId));

  return rows.map((r) => {
    const evidence = r.evidence[0];
    return {
      id: r.id,
      status: r.status,
      cancelRequested: r.cancelRequested,
      cancelStatus: r.cancelStatus,
      checkedIn: r.checkedInAt != null,
      checkedOut: r.checkedOutAt != null,
      hoursAwarded: r.hoursAwarded,
      reviewed: reviewed.has(r.activityId),
      evidence: evidence
        ? {
            status: evidence.status,
            fileUrl: evidence.fileUrl,
            uploadedTh: DATE_TH.format(evidence.createdAt),
            uploadedEn: DATE_EN.format(evidence.createdAt),
          }
        : null,
      activity: toPublicActivity(r.activity, filled),
      startAtMs: r.activity.startAt.getTime(),
      regAtMs: r.regAt.getTime(),
    };
  });
}

export default async function StudentRegistrationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return <StudentRegistrations rows={await loadRegistrations(user.id)} />;
}
