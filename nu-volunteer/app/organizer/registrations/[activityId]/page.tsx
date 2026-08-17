import { notFound, redirect } from 'next/navigation';
import {
  OrganizerActivityParticipants,
  type ActivityHeader,
  type ParticipantRow,
} from '@/components/organizer/OrganizerActivityParticipants';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export default async function ActivityParticipantsPage({
  params,
}: {
  params: Promise<{ activityId: string }>;
}) {
  const { activityId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: { id: true, title: true, startAt: true, seatsTotal: true, organizerId: true },
  });

  // ตอบ 404 ทั้งกรณีไม่พบและไม่มีสิทธิ์ ไม่ให้เดารหัสกิจกรรมของหน่วยงานอื่นได้
  if (!activity) notFound();
  if (user.role !== 'admin' && activity.organizerId !== user.id) notFound();

  const rows = await prisma.registration.findMany({
    where: { activityId },
    orderBy: { regAt: 'desc' },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          studentId: true,
          faculty: true,
          avatarUrl: true,
          shareContact: true,
        },
      },
      // ใบล่าสุดใบเดียว — นิสิตอัปโหลดใหม่ได้ ผู้จัดต้องตรวจใบที่ส่งล่าสุดเสมอ
      evidence: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  const list: ParticipantRow[] = rows.map((r) => {
    const ev = r.evidence[0] ?? null;
    return {
      id: r.id,
      name: r.user.name,
      /*
        เคารพการตั้งค่าความเป็นส่วนตัวเดียวกับที่ /api/v1/search ใช้:
        นิสิตที่ปิด "ให้ผู้จัดเห็นข้อมูลติดต่อ" จะไม่ถูกเปิดเผยอีเมลต่อผู้จัด
        ส่วนแอดมินยังเห็นได้เพื่อการดูแลระบบ
      */
      email: r.user.shareContact || user.role === 'admin' ? r.user.email : null,
      studentId: r.user.studentId ?? '',
      faculty: r.user.faculty ?? '',
      avatarUrl: r.user.avatarUrl,
      status: r.status,
      regAtMs: r.regAt.getTime(),
      checkedInAtMs: r.checkedInAt?.getTime() ?? null,
      checkedOutAtMs: r.checkedOutAt?.getTime() ?? null,
      hoursAwarded: r.hoursAwarded,
      evidence: ev
        ? {
            id: ev.id,
            fileUrl: ev.fileUrl,
            fileName: ev.fileName,
            note: ev.note,
            status: ev.status,
            reviewNote: ev.reviewNote,
          }
        : null,
    };
  });

  const header: ActivityHeader = {
    id: activity.id,
    title: activity.title,
    startAtMs: activity.startAt.getTime(),
    seatsTotal: activity.seatsTotal,
  };

  return <OrganizerActivityParticipants activity={header} rows={list} />;
}
