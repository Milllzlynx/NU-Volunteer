import { redirect } from 'next/navigation';
import { StudentHours } from '@/components/student/StudentHours';
import type { HourEntry, LoanCard, MonthBucket } from '@/components/student/StudentHours';
import { academicYearOf } from '@/lib/academic';
import { DATE_EN, DATE_TH, dayKeyOf } from '@/lib/activities';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { loanYearStatus, yearHours } from '@/lib/loanHours';

/** ชั่วโมงถูกนับเมื่อผู้จัดรับรองแล้ว — ใช้เวลารับรองเป็นวันที่ของรายการ ถ้ายังไม่มีก็ใช้วันจัดกิจกรรม */
const earnedAt = (r: { hoursApprovedAt: Date | null; activity: { startAt: Date } }) =>
  r.hoursApprovedAt ?? r.activity.startAt;

export default async function StudentHoursPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const ay = academicYearOf();
  const isLoan = user.loanStatus === 'yes';

  const [rows, adjustments, categories, yearTotal, loanStatus] = await Promise.all([
    prisma.registration.findMany({
      where: { userId: user.id, hoursAwarded: { gt: 0 } },
      include: { activity: { include: { category: true } } },
    }),
    prisma.hourAdjustment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.category.findMany({ orderBy: { order: 'asc' }, select: { id: true, label: true, labelEn: true, color: true } }),
    // ยอดของปีการศึกษานับแบบเดียวกับหน้าแรกและการเตือน กยศ. (รับรองในช่วงนับ + ปรับชั่วโมงของปีนั้น)
    yearHours(user.id, ay),
    isLoan ? loanYearStatus(user.id) : null,
  ]);

  // เกณฑ์ชั่วโมงเป็นเรื่องของผู้กู้ยืม กยศ. เท่านั้น — นิสิตคนอื่นไม่ได้รับข้อมูลนี้ไปแสดงเลย
  const loan: LoanCard | null = loanStatus && {
    ...loanStatus,
    startTh: DATE_TH.format(loanStatus.startMs),
    startEn: DATE_EN.format(loanStatus.startMs),
    lastDayTh: DATE_TH.format(loanStatus.lastDayMs),
    lastDayEn: DATE_EN.format(loanStatus.lastDayMs),
  };

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

  const thisMonthKey = dayKeyOf(new Date()).slice(0, 7);

  return (
    <StudentHours
      entries={entries}
      months={months}
      categories={categories}
      totals={{
        all: entries.reduce((s, e) => s + e.hours, 0),
        thisMonth: entries.filter((e) => e.day.startsWith(thisMonthKey)).reduce((s, e) => s + e.hours, 0),
        academicYear: yearTotal,
        adjustments: adjustTotal,
      }}
      academicYear={ay.year}
      loan={loan}
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
