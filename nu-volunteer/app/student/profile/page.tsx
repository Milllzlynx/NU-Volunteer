import { redirect } from 'next/navigation';
import { StudentProfile } from '@/components/student/StudentProfile';
import { DATE_EN, DATE_TH, JOINED } from '@/lib/activities';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { buildTimeline } from '@/lib/timeline';

export default async function StudentProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [faculties, stats, recent] = await Promise.all([
    prisma.faculty.findMany({ orderBy: { order: 'asc' }, select: { name: true } }),
    Promise.all([
      prisma.registration.count({ where: { userId: user.id, status: { in: JOINED } } }),
      prisma.registration.aggregate({ where: { userId: user.id }, _sum: { hoursAwarded: true } }),
      prisma.certificate.count({ where: { userId: user.id } }),
    ]),
    // ประวัติแบบย่อบนหน้าโปรไฟล์ — ดูทั้งหมดได้ที่หน้าความเคลื่อนไหว
    buildTimeline(user.id, 8),
  ]);

  const [joined, hoursAgg, certificates] = stats;

  return (
    <StudentProfile
      profile={{
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        faculty: user.faculty,
        loanStatus: user.loanStatus,
        phone: user.phone,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        joinedTh: DATE_TH.format(user.createdAt),
        joinedEn: DATE_EN.format(user.createdAt),
      }}
      faculties={faculties.map((f) => f.name)}
      stats={{
        joined,
        hours: hoursAgg._sum.hoursAwarded ?? 0,
        certificates,
      }}
      recent={recent}
    />
  );
}
