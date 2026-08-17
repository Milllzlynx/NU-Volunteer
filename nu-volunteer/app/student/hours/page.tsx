import { redirect } from 'next/navigation';
import { StudentHours } from '@/components/student/StudentHours';
import type { HourEntry, MonthBucket } from '@/components/student/StudentHours';
import { academicYearOf, DEFAULT_HOURS_GOAL, HOURS_GOAL_KEY } from '@/lib/academic';
import { DATE_EN, DATE_TH, dayKeyOf } from '@/lib/activities';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

/** ชั่วโมงถูกนับเมื่อผู้จัดรับรองแล้ว — ใช้เวลารับรองเป็นวันที่ของรายการ ถ้ายังไม่มีก็ใช้วันจัดกิจกรรม */
const earnedAt = (r: { hoursApprovedAt: Date | null; activity: { startAt: Date } }) =>
  r.hoursApprovedAt ?? r.activity.startAt;

export default async function StudentHoursPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const ay = academicYearOf();

  const [rows, adjustments, goalSetting, categories] = await Promise.all([
    prisma.registration.findMany({
      where: { userId: user.id, hoursAwarded: { gt: 0 } },
      include: { activity: { include: { category: true } } },
    }),
    prisma.hourAdjustment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.setting.findUnique({ where: { key: HOURS_GOAL_KEY } }),
    prisma.category.findMany({ orderBy: { order: 'asc' }, select: { id: true, label: true, labelEn: true, color: true } }),
  ]);

  const goal = Number(goalSetting?.value) || DEFAULT_HOURS_GOAL;

  const entries: HourEntry[] = rows.map((r) => {
    const at = earnedAt(r);
    return {
      id: r.id,
      title: r.activity.title,
      orgName: r.activity.orgName,
      hours: r.hoursAwarded,
      categoryId: r.activity.category.id,
      categoryLabel: r.activity.category.label,
      categoryLabelEn: r.activity.category.labelEn || r.activity.category.label,
      color: r.activity.category.color,
      day: dayKeyOf(at),
      dateTh: DATE_TH.format(at),
      dateEn: DATE_EN.format(at),
      atMs: at.getTime(),
    };
  });

  // ปรับชั่วโมงโดยเจ้าหน้าที่ — แสดงแยกไว้ให้ตรวจสอบได้ ไม่ปนกับกิจกรรม
  const adjustTotal = adjustments.reduce((s, a) => s + a.hours, 0);

  /** รวมเป็นรายเดือนตามคีย์ YYYY-MM เพื่อให้กราฟกับตารางใช้ชุดข้อมูลเดียวกัน */
  const monthMap = new Map<string, number>();
  for (const e of entries) {
    const key = e.day.slice(0, 7);
    monthMap.set(key, (monthMap.get(key) ?? 0) + e.hours);
  }
  const months: MonthBucket[] = [...monthMap.entries()]
    .map(([key, hours]) => ({ key, hours }))
    .sort((a, b) => a.key.localeCompare(b.key));

  const inAcademicYear = entries.filter((e) => e.atMs >= ay.start.getTime() && e.atMs < ay.end.getTime());
  const thisMonthKey = dayKeyOf(new Date()).slice(0, 7);

  return (
    <StudentHours
      entries={entries}
      months={months}
      categories={categories}
      totals={{
        all: entries.reduce((s, e) => s + e.hours, 0),
        thisMonth: entries.filter((e) => e.day.startsWith(thisMonthKey)).reduce((s, e) => s + e.hours, 0),
        academicYear: inAcademicYear.reduce((s, e) => s + e.hours, 0),
        adjustments: adjustTotal,
      }}
      goal={goal}
      academicYear={ay.year}
      adjustments={adjustments.map((a) => ({
        id: a.id,
        hours: a.hours,
        reason: a.reason,
        dateTh: DATE_TH.format(a.createdAt),
        dateEn: DATE_EN.format(a.createdAt),
      }))}
      studentName={user.name}
    />
  );
}
