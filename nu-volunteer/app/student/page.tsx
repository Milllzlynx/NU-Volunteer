import { redirect } from 'next/navigation';
import { StudentHome, type StudentBanner } from '@/components/student/StudentHome';
import { DEFAULT_HOURS_GOAL, HOURS_GOAL_KEY, academicYearOf } from '@/lib/academic';
import { DATE_EN, DATE_TH, JOINED, toPublicActivities } from '@/lib/activities';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ROLE_NAV } from '@/lib/design';
import { AVAILABLE_PAGES } from '@/lib/routes';

/** ctaTarget ของแบนเนอร์เก็บเป็น "คีย์หน้า" — แปลงเป็น URL และตัด CTA ทิ้งถ้าหน้านั้นยังไม่เปิดใช้งาน */
function ctaFor(target: string): { label: boolean; href: string } {
  const item = ROLE_NAV.student.find((i) => i.key === target);
  const open = item && AVAILABLE_PAGES.student.includes(item.key);
  return { label: Boolean(open), href: item?.href ?? '/student' };
}

async function loadStudentHome(userId: string, isLoanStudent: boolean) {
  const now = new Date();
  const ay = academicYearOf(now);

  const [bannerRows, activityRows, joined, awarded, adjustments, certificates, favorites, goalRow] =
    await Promise.all([
      prisma.banner.findMany({
        where: { visible: true },
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        take: 6,
      }),
      prisma.activity.findMany({
        where: { status: 'open', endAt: { gte: now } },
        orderBy: { startAt: 'asc' },
        take: 5,
        include: { category: true },
      }),
      prisma.registration.count({ where: { userId, status: { in: JOINED } } }),
      // ชั่วโมงที่ผู้จัดรับรองแล้ว + การปรับชั่วโมงด้วยมือ (ผลอุทธรณ์/แอดมินแก้)
      prisma.registration.aggregate({ where: { userId }, _sum: { hoursAwarded: true } }),
      prisma.hourAdjustment.aggregate({ where: { userId }, _sum: { hours: true } }),
      prisma.certificate.count({ where: { userId, revokedAt: null } }),
      prisma.favorite.count({ where: { userId } }),
      prisma.setting.findUnique({ where: { key: HOURS_GOAL_KEY } }),
    ]);

  const hours = round1((awarded._sum.hoursAwarded ?? 0) + (adjustments._sum.hours ?? 0));

  const banners: StudentBanner[] = bannerRows.map((b) => {
    const cta = ctaFor(b.ctaTarget);
    return {
      id: b.id,
      title: b.title,
      desc: b.desc,
      image: b.image,
      ctaLabel: cta.label ? b.ctaLabel : '',
      ctaHref: cta.href,
      type: b.type,
      date: DATE_TH.format(b.createdAt),
      dateEn: DATE_EN.format(b.createdAt),
    };
  });

  return {
    banners,
    latest: await toPublicActivities(activityRows),
    stats: { joined, hours, certificates, favorites },
    progress: isLoanStudent
      ? await loanProgress(userId, ay.start, ay.end, ay.year, Number(goalRow?.value) || DEFAULT_HOURS_GOAL)
      : null,
  };
}

/** ความคืบหน้าเกณฑ์ กยศ. — นับเฉพาะชั่วโมงที่รับรองภายในปีการศึกษาปัจจุบัน */
async function loanProgress(
  userId: string,
  start: Date,
  end: Date,
  year: number,
  goal: number,
) {
  const [yearAwarded, yearAdjustments] = await Promise.all([
    prisma.registration.aggregate({
      where: { userId, hoursApprovedAt: { gte: start, lt: end } },
      _sum: { hoursAwarded: true },
    }),
    prisma.hourAdjustment.aggregate({
      where: { userId, academicYear: year },
      _sum: { hours: true },
    }),
  ]);

  const total = round1((yearAwarded._sum.hoursAwarded ?? 0) + (yearAdjustments._sum.hours ?? 0));
  return {
    total,
    goal,
    remaining: round1(Math.max(0, goal - total)),
    pct: goal > 0 ? Math.min(100, Math.round((total / goal) * 100)) : 0,
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export default async function StudentHomePage() {
  // layout กันสิทธิ์ไว้แล้ว — อ่านซ้ำที่นี่เพื่อให้หน้ามีข้อมูลผู้ใช้ของตัวเอง
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const data = await loadStudentHome(user.id, user.loanStatus === 'yes');

  return (
    <StudentHome
      studentName={user.name || user.email}
      banners={data.banners}
      progress={data.progress}
      stats={data.stats}
      latest={data.latest}
    />
  );
}
