import type { Metadata } from 'next';
import { AdminCalendar, type AdminCalendarItem } from '@/components/admin/AdminCalendar';
import { SEAT_TAKEN, dayKeyOf, timeOf } from '@/lib/activities';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const metadata: Metadata = { title: 'ปฏิทินกิจกรรม · NU Volunteer' };

/**
 * ปฏิทินกิจกรรมทั้งระบบ — ไม่มี where เพราะผู้ดูแลเห็นของผู้จัดทุกคน
 * (ฝั่งผู้จัดกรองด้วย ownedActivityFilter ที่ app/organizer/calendar/page.tsx)
 */
export default async function AdminCalendarPage() {
  await requireAdmin();

  const rows = await prisma.activity.findMany({
    orderBy: { startAt: 'asc' },
    include: {
      category: { select: { id: true, label: true, labelEn: true, color: true } },
      organizer: { select: { id: true, name: true } },
      _count: { select: { registrations: { where: { status: 'pending' } } } },
      registrations: { where: { status: { in: SEAT_TAKEN } }, select: { id: true } },
    },
  });

  const items: AdminCalendarItem[] = rows.map((a) => ({
    id: a.id,
    title: a.title,
    // คีย์วันคำนวณฝั่งเซิร์ฟเวอร์ตามเวลาไทย ฝั่ง client จึงไม่ต้องแตะ timezone อีก
    day: dayKeyOf(a.startAt),
    endDay: dayKeyOf(a.endAt),
    time: `${timeOf(a.startAt)} - ${timeOf(a.endAt)}`,
    status: a.status,
    categoryId: a.category.id,
    categoryLabel: a.category.label,
    categoryLabelEn: a.category.labelEn,
    categoryColor: a.category.color,
    organizerId: a.organizer.id,
    organizerName: a.organizer.name,
    location: a.location,
    seatsFilled: a.registrations.length,
    seatsTotal: a.seatsTotal,
    pending: a._count.registrations,
  }));

  return <AdminCalendar items={items} todayKey={dayKeyOf(new Date())} />;
}
