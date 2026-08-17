/**
 * ไทม์ไลน์ความเคลื่อนไหวของผู้ใช้ — คำนวณจากข้อมูลจริงที่มีอยู่แล้ว ไม่มีตาราง log แยก
 *
 * เหตุผลที่ไม่เก็บเป็นตารางใหม่: ทุกเหตุการณ์มีเวลาบันทึกอยู่ในข้อมูลเดิมแล้ว
 * (regAt, approvedAt, checkedInAt, issuedAt, ...) การอ่านจากต้นทางโดยตรง
 * จึงไม่มีทางไม่ตรงกับความจริง และไม่ต้องเขียนซ้ำสองที่ทุกครั้งที่มีอะไรเกิดขึ้น
 */
import { DATE_EN, DATE_TH, timeOf } from '@/lib/activities';
import { prisma } from '@/lib/db';

/** กลุ่มของเหตุการณ์ — ใช้เป็นตัวกรองบนหน้าฟีด */
export type TimelineKind = 'registration' | 'participation' | 'achievement' | 'personal';

export type TimelineEvent = {
  key: string;
  kind: TimelineKind;
  icon: string;
  /** ชื่อเหตุการณ์ เช่น "สมัครเข้าร่วมกิจกรรม" */
  title: string;
  /** ชื่อกิจกรรมหรือรายละเอียดประกอบ */
  subject: string;
  detail: string;
  atMs: number;
  dateTh: string;
  dateEn: string;
  link: string | null;
};

const fmt = (d: Date) => ({
  atMs: d.getTime(),
  dateTh: `${DATE_TH.format(d)} ${timeOf(d)}`,
  dateEn: `${DATE_EN.format(d)} ${timeOf(d)}`,
});

/**
 * รวมความเคลื่อนไหวทั้งหมดของผู้ใช้ เรียงใหม่ก่อนเก่า
 *
 * @param limit จำนวนสูงสุดที่คืน (หน้าโปรไฟล์ขอแค่ไม่กี่รายการ ฟีดขอเยอะกว่า)
 */
export async function buildTimeline(userId: string, limit = 100): Promise<TimelineEvent[]> {
  const [registrations, certificates, reviews, favorites, events] = await Promise.all([
    prisma.registration.findMany({
      where: { userId },
      include: {
        activity: { select: { id: true, title: true, hours: true } },
        evidence: { orderBy: { createdAt: 'desc' } },
      },
    }),
    prisma.certificate.findMany({
      where: { userId },
      include: { activity: { select: { title: true } } },
    }),
    prisma.review.findMany({
      where: { userId },
      include: { activity: { select: { title: true } } },
    }),
    prisma.favorite.findMany({
      where: { userId },
      include: { activity: { select: { title: true } } },
    }),
    prisma.calendarEvent.findMany({ where: { userId } }),
  ]);

  const out: TimelineEvent[] = [];

  for (const r of registrations) {
    const title = r.activity.title;
    const link = '/student/registrations';

    out.push({
      key: `reg:${r.id}`,
      kind: 'registration',
      icon: 'assignment_turned_in',
      title: 'สมัครเข้าร่วมกิจกรรม',
      subject: title,
      detail: '',
      link,
      ...fmt(r.regAt),
    });

    if (r.approvedAt)
      out.push({
        key: `approved:${r.id}`,
        kind: 'registration',
        icon: 'check_circle',
        title: 'การสมัครได้รับอนุมัติ',
        subject: title,
        detail: '',
        link,
        ...fmt(r.approvedAt),
      });

    if (r.rejectedAt)
      out.push({
        key: `rejected:${r.id}`,
        kind: 'registration',
        icon: 'cancel',
        title: 'การสมัครไม่ได้รับอนุมัติ',
        subject: title,
        detail: r.rejectReason ?? '',
        link,
        ...fmt(r.rejectedAt),
      });

    if (r.cancelledAt)
      out.push({
        key: `cancelled:${r.id}`,
        kind: 'registration',
        icon: 'block',
        title: 'ยกเลิกการเข้าร่วม',
        subject: title,
        detail: r.cancelReason ?? '',
        link,
        ...fmt(r.cancelledAt),
      });

    if (r.checkedInAt)
      out.push({
        key: `in:${r.id}`,
        kind: 'participation',
        icon: 'login',
        title: 'เช็กอินเข้าร่วมกิจกรรม',
        subject: title,
        detail: '',
        link,
        ...fmt(r.checkedInAt),
      });

    if (r.checkedOutAt)
      out.push({
        key: `out:${r.id}`,
        kind: 'participation',
        icon: 'logout',
        title: 'เช็กเอาต์จากกิจกรรม',
        subject: title,
        detail: r.hoursAwarded ? `ได้รับ ${r.hoursAwarded} ชั่วโมง` : '',
        link,
        ...fmt(r.checkedOutAt),
      });

    for (const e of r.evidence) {
      out.push({
        key: `ev:${e.id}`,
        kind: 'participation',
        icon: 'upload_file',
        title: 'อัปโหลดหลักฐาน',
        subject: title,
        detail: '',
        link,
        ...fmt(e.createdAt),
      });

      if (e.reviewedAt)
        out.push({
          key: `evr:${e.id}`,
          kind: 'participation',
          icon: e.status === 'approved' ? 'verified' : 'error',
          title: e.status === 'approved' ? 'หลักฐานผ่านการตรวจ' : 'หลักฐานไม่ผ่านการตรวจ',
          subject: title,
          detail: e.reviewNote ?? '',
          link,
          ...fmt(e.reviewedAt),
        });
    }
  }

  for (const c of certificates)
    out.push({
      key: `cert:${c.id}`,
      kind: 'achievement',
      icon: 'workspace_premium',
      title: 'ได้รับใบประกาศ',
      subject: c.activity.title,
      detail: `${c.hours} ชั่วโมง · ${c.ref}`,
      link: '/student/certificates',
      ...fmt(c.issuedAt),
    });

  for (const rv of reviews)
    out.push({
      key: `review:${rv.id}`,
      kind: 'achievement',
      icon: 'reviews',
      title: 'ให้คะแนนกิจกรรม',
      subject: rv.activity.title,
      detail: `${rv.stars}/5`,
      link: null,
      ...fmt(rv.createdAt),
    });

  for (const f of favorites)
    out.push({
      key: `fav:${f.id}`,
      kind: 'personal',
      icon: 'favorite',
      title: 'เพิ่มในรายการโปรด',
      subject: f.activity.title,
      detail: '',
      link: '/student/wishlist',
      ...fmt(f.createdAt),
    });

  for (const e of events)
    out.push({
      key: `cal:${e.id}`,
      kind: 'personal',
      icon: 'event',
      title: 'เพิ่มนัดหมายในปฏิทิน',
      subject: e.title,
      detail: '',
      link: '/student/calendar',
      ...fmt(e.createdAt),
    });

  return out.sort((a, b) => b.atMs - a.atMs).slice(0, limit);
}

/** สรุปจำนวนต่อกลุ่ม — ใช้ทำตัวเลขบนแท็บตัวกรอง */
export function countByKind(events: TimelineEvent[]): Record<TimelineKind, number> {
  const base: Record<TimelineKind, number> = {
    registration: 0,
    participation: 0,
    achievement: 0,
    personal: 0,
  };
  for (const e of events) base[e.kind]++;
  return base;
}
