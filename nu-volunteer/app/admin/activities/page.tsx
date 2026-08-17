import type { Metadata } from 'next';
import { AdminActivities, type AdminActivityRow } from '@/components/admin/AdminActivities';
import { DATE_EN, DATE_TH, SEAT_TAKEN, dayKeyOf, timeOf } from '@/lib/activities';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const metadata: Metadata = { title: 'กิจกรรมทั้งหมด · NU Volunteer' };

/**
 * รายการกิจกรรมทั้งระบบสำหรับผู้ดูแล
 *
 * ไม่ใส่ where — ต่างจากหน้าเดียวกันของฝั่งผู้จัดที่กรองด้วย ownedActivityFilter
 * แอดมินต้องเห็นของทุกคนรวมถึงฉบับร่างที่ยังไม่เผยแพร่ด้วย
 */
export default async function AdminActivitiesPage() {
  await requireAdmin();

  const now = new Date();
  const rows = await prisma.activity.findMany({
    orderBy: { startAt: 'desc' },
    include: {
      category: { select: { id: true, label: true, labelEn: true, color: true } },
      organizer: { select: { name: true } },
      _count: { select: { registrations: { where: { status: 'pending' } } } },
      registrations: { where: { status: { in: SEAT_TAKEN } }, select: { id: true } },
    },
  });

  const list: AdminActivityRow[] = rows.map((a) => {
    const multiDay = dayKeyOf(a.startAt) !== dayKeyOf(a.endAt);
    return {
      id: a.id,
      title: a.title,
      categoryId: a.category.id,
      categoryLabel: a.category.label,
      categoryLabelEn: a.category.labelEn,
      categoryColor: a.category.color,
      organizerName: a.organizer.name,
      orgName: a.orgName,
      status: a.status,
      // คีย์วันตามเขตเวลาไทย ใช้เทียบกับช่องเลือกวันที่ซึ่งส่งค่ามาเป็น YYYY-MM-DD
      startIso: dayKeyOf(a.startAt),
      dateTh: DATE_TH.format(a.startAt),
      dateEn: DATE_EN.format(a.startAt),
      endDateTh: multiDay ? DATE_TH.format(a.endAt) : null,
      endDateEn: multiDay ? DATE_EN.format(a.endAt) : null,
      time: `${timeOf(a.startAt)} - ${timeOf(a.endAt)}`,
      location: a.location,
      hours: a.hours,
      seatsTotal: a.seatsTotal,
      seatsFilled: a.registrations.length,
      pending: a._count.registrations,
      past: a.endAt.getTime() < now.getTime(),
    };
  });

  return <AdminActivities rows={list} />;
}
