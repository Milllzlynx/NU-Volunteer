import { redirect } from 'next/navigation';
import { OrganizerQr, type QrActivity } from '@/components/organizer/OrganizerQr';
import { DATE_EN, DATE_TH } from '@/lib/activities';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ownedActivityFilter } from '@/lib/organizer';

/**
 * กิจกรรมที่ยัง "ออก QR แล้วมีความหมาย"
 *
 * ฉบับร่างยังไม่มีผู้เข้าร่วม และกิจกรรมที่ยกเลิกไปแล้วไม่ควรมีใครเช็กอินได้อีก
 * ที่เหลือเปิดไว้หมด เพราะกิจกรรมที่ปิดรับสมัครแล้วคือกิจกรรมที่กำลังจะจัดจริง
 */
const QR_STATUSES = ['open', 'closed', 'done'];

export default async function OrganizerQrPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const rows = await prisma.activity.findMany({
    where: { ...ownedActivityFilter(user), status: { in: QR_STATUSES } },
    // งานที่ใกล้ถึงวันจัดที่สุดอยู่บนสุด — หน้านี้ถูกเปิดตอนอยู่หน้างานเป็นหลัก
    orderBy: { startAt: 'desc' },
    take: 100,
    select: {
      id: true,
      title: true,
      startAt: true,
      endAt: true,
      status: true,
      location: true,
      category: { select: { label: true, labelEn: true, color: true } },
      _count: { select: { registrations: true } },
    },
  });

  const activities: QrActivity[] = rows.map((a) => ({
    id: a.id,
    title: a.title,
    status: a.status,
    location: a.location,
    dateTh: DATE_TH.format(a.startAt),
    dateEn: DATE_EN.format(a.startAt),
    startAtMs: a.startAt.getTime(),
    endAtMs: a.endAt.getTime(),
    categoryLabel: a.category.label,
    categoryLabelEn: a.category.labelEn,
    categoryColor: a.category.color,
    registered: a._count.registrations,
  }));

  return <OrganizerQr activities={activities} />;
}
