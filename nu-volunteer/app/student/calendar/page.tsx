import { redirect } from 'next/navigation';
import { StudentCalendar, type CalendarItem } from '@/components/student/StudentCalendar';
import { dayKeyOf, seatFillMap, timeOf, toPublicActivity } from '@/lib/activities';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

/** กิจกรรมที่ยังไม่เปิดให้เห็นบนปฏิทิน */
const HIDDEN_ACTIVITY_STATUS = ['draft', 'cancelled'];

async function loadItems(userId: string): Promise<CalendarItem[]> {
  const [registrations, events, activities] = await Promise.all([
    prisma.registration.findMany({
      where: { userId },
      include: { activity: { include: { category: true } } },
    }),
    prisma.calendarEvent.findMany({ where: { userId }, orderBy: { startAt: 'asc' } }),
    // ระบบขนาดนี้มีกิจกรรมหลักสิบรายการ จึงดึงมาทั้งหมดแล้วให้ปฏิทินเลื่อนดูได้ทุกเดือน
    // ถ้าวันหนึ่งกิจกรรมเยอะขึ้นมาก ค่อยจำกัดช่วงวันที่ตามเดือนที่ผู้ใช้เปิดอยู่
    prisma.activity.findMany({
      where: { status: { notIn: HIDDEN_ACTIVITY_STATUS } },
      include: { category: true },
    }),
  ]);

  const registeredIds = new Set(registrations.map((r) => r.activityId));
  const filled = await seatFillMap(activities.map((a) => a.id));

  const items: CalendarItem[] = [];

  // 1) กิจกรรมที่ลงทะเบียนไว้ — พร้อมสถานะใบสมัคร
  for (const r of registrations) {
    const a = r.activity;
    items.push({
      kind: 'registration',
      id: r.id,
      day: dayKeyOf(a.startAt),
      endDay: dayKeyOf(a.endAt),
      title: a.title,
      time: timeOf(a.startAt),
      endTime: timeOf(a.endAt),
      color: a.category.color,
      status: r.status,
      location: a.location,
      orgName: a.orgName,
      hours: a.hours,
      activity: toPublicActivity(a, filled),
    });
  }

  // 2) กิจกรรมที่ยังเปิดรับและยังไม่ได้ลงทะเบียน — ไว้ให้เห็นว่าว่างวันไหน
  for (const a of activities) {
    if (registeredIds.has(a.id) || a.status !== 'open') continue;
    items.push({
      kind: 'activity',
      id: a.id,
      day: dayKeyOf(a.startAt),
      endDay: dayKeyOf(a.endAt),
      title: a.title,
      time: timeOf(a.startAt),
      endTime: timeOf(a.endAt),
      color: a.category.color,
      location: a.location,
      orgName: a.orgName,
      hours: a.hours,
      activity: toPublicActivity(a, filled),
    });
  }

  // 3) นัดหมายส่วนตัว
  for (const e of events) {
    items.push({
      kind: 'personal',
      id: e.id,
      day: dayKeyOf(e.startAt),
      endDay: dayKeyOf(e.endAt ?? e.startAt),
      title: e.title,
      time: e.allDay ? null : timeOf(e.startAt),
      endTime: e.allDay || !e.endAt ? null : timeOf(e.endAt),
      color: e.color,
      note: e.note,
    });
  }

  return items;
}

export default async function StudentCalendarPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <StudentCalendar items={await loadItems(user.id)} todayKey={dayKeyOf(new Date())} />
  );
}
