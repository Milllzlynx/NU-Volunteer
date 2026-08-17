import { redirect } from 'next/navigation';
import {
  OrganizerParticipantActivities,
  type ParticipantActivityCard,
} from '@/components/organizer/OrganizerParticipantActivities';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ownedActivityFilter } from '@/lib/organizer';

/** สถานะที่ผ่านการอนุมัติมาแล้ว — ใช้นับตัวเลข "อนุมัติแล้ว" บนการ์ด */
const APPROVED_LIKE = ['approved', 'checked-in', 'checked-out', 'completed'];

export default async function OrganizerRegistrationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const rows = await prisma.activity.findMany({
    where: ownedActivityFilter(user),
    orderBy: { startAt: 'desc' },
    include: {
      category: { select: { color: true } },
      registrations: {
        select: { status: true, user: { select: { name: true } } },
      },
    },
  });

  const list: ParticipantActivityCard[] = rows.map((a) => {
    const regs = a.registrations;
    return {
      id: a.id,
      title: a.title,
      photo: a.photo,
      categoryColor: a.category.color,
      startAtMs: a.startAt.getTime(),
      // นับใบที่ยังไม่ถูกปฏิเสธหรือยกเลิก — ตรงกับที่ผู้จัดเข้าใจว่า "มีกี่คน"
      total: regs.filter((r) => !['rejected', 'cancelled'].includes(r.status)).length,
      pending: regs.filter((r) => r.status === 'pending').length,
      approved: regs.filter((r) => APPROVED_LIKE.includes(r.status)).length,
      seatsTotal: a.seatsTotal,
      // รวมชื่อไว้ให้ค้นหาคนแล้วเจอกิจกรรม โดยไม่ต้องยิง API ระหว่างพิมพ์
      names: regs.map((r) => r.user.name).join(' ').toLowerCase(),
    };
  });

  return <OrganizerParticipantActivities rows={list} />;
}
