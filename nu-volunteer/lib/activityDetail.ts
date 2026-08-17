/**
 * ข้อมูลสำหรับหน้ารายละเอียดกิจกรรมเต็มหน้า (/activities/[id])
 *
 * แยกจาก toPublicActivity() เพราะหน้ารายละเอียดต้องใช้ฟิลด์ที่การ์ดไม่ใช้
 * (สิทธิประโยชน์ สิ่งที่ต้องเตรียม ภาพประกอบ แผนที่ ช่วงเปิดรับสมัคร)
 * การใส่ทั้งหมดลง PublicActivity จะทำให้ทุกหน้าที่แสดงการ์ดต้องส่งข้อมูลเกินจำเป็น
 */

import { DATE_EN, DATE_TH, SEAT_TAKEN, dayKeyOf, registrationBlock, timeOf } from '@/lib/activities';
import { prisma } from '@/lib/db';

export type ActivityDetailView = {
  id: string;
  title: string;
  description: string;
  orgName: string;
  organizerName: string;
  photo: string | null;
  gallery: string[];
  /** สิทธิประโยชน์ที่ผู้เข้าร่วมจะได้รับ */
  perks: string[];
  /** สิ่งที่ต้องเตรียมมาในวันกิจกรรม */
  prep: string[];
  /** หมายเหตุพิเศษจากผู้จัด — ข้อความอิสระ ว่างได้ */
  notes: string;

  dateTh: string;
  dateEn: string;
  /** วันสิ้นสุด — null เมื่อกิจกรรมจบภายในวันเดียว */
  endDateTh: string | null;
  endDateEn: string | null;
  /** จำนวนวันที่กิจกรรมกินเวลา (1 = วันเดียว) */
  days: number;
  time: string;
  hours: number;

  location: string;
  lat: number | null;
  lng: number | null;
  /** ลิงก์แผนที่ภายนอก — ถ้าไม่ได้ตั้งไว้จะสร้างจากพิกัดหรือชื่อสถานที่ให้ */
  mapLink: string;
  mapImage: string | null;

  seatsFilled: number;
  seatsTotal: number;
  /** ช่วงเปิดรับสมัคร — null เมื่อไม่ได้กำหนด (รับตลอดจนกว่ากิจกรรมจะเริ่ม) */
  regOpenTh: string | null;
  regOpenEn: string | null;
  regCloseTh: string | null;
  regCloseEn: string | null;
  /** จำนวนวันที่เหลือก่อนปิดรับสมัคร — ติดลบคือปิดไปแล้ว null คือไม่ได้กำหนด */
  daysLeft: number | null;

  status: string;
  closed: boolean;
  /** closed เพราะยังไม่ถึงวันเปิดรับสมัคร ไม่ใช่เพราะปิดไปแล้ว */
  notOpenYet: boolean;

  category: { id: string; label: string; labelEn: string; color: string };

  /** สถานะของผู้ใช้ที่ล็อกอินอยู่ — null ทั้งคู่เมื่อเป็นผู้เยี่ยมชม */
  myRegistration: {
    id: string;
    status: string;
    /** สถานะหลักฐานใบล่าสุดของผู้ที่กำลังดูอยู่ — null = ยังไม่เคยส่ง */
    evidenceStatus: string | null;
  } | null;
  favorited: boolean;

  /**
   * รายชื่อผู้เข้าร่วม — ว่างเสมอสำหรับผู้ที่ยังไม่เข้าสู่ระบบ
   * รวมทุกคนที่จองที่นั่งไว้แล้ว รวมใบสมัครที่ยังรออนุมัติด้วย เพราะใบเหล่านั้นกินที่นั่งจริง
   * จำนวนในรายชื่อจึงตรงกับตัวเลขที่นั่งที่แสดงด้านบนเสมอ
   */
  participants: {
    id: string;
    name: string;
    faculty: string | null;
    avatarUrl: string | null;
    /** สถานะใบลงทะเบียน ใช้ติดป้ายกำกับในรายชื่อ */
    status: string;
    regAtTh: string;
    regAtEn: string;
    /** ชั่วโมงที่รับรองแล้ว — 0 จนกว่าผู้จัดจะรับรองให้ */
    hoursAwarded: number;
    /**
     * รหัสนิสิต — null สำหรับผู้ชมทั่วไป
     *
     * รายชื่อนี้เปิดให้ทุกคนที่เข้าสู่ระบบเห็น รวมถึงนิสิตคนอื่นที่ไม่ได้ลงกิจกรรมนี้ด้วยซ้ำ
     * รหัสนิสิตใช้อ้างตัวตนข้ามระบบของมหาวิทยาลัย จึงส่งให้เฉพาะผู้จัดกิจกรรมนี้กับแอดมิน
     * ซึ่งมีสิทธิ์เห็นอยู่แล้วจากหน้าผู้เข้าร่วมกิจกรรม
     */
    studentId: string | null;
  }[];
  /** true เมื่อผู้เปิดดูมีสิทธิ์เห็นรายชื่อ — ใช้แยกกรณี "ไม่มีใครสมัคร" ออกจาก "ไม่มีสิทธิ์เห็น" */
  canSeeParticipants: boolean;

  /** รีวิวจากผู้ที่เคยเข้าร่วม — เรียงใหม่สุดก่อน */
  reviews: { id: string; stars: number; comment: string; author: string; dateTh: string; dateEn: string }[];
  /** คะแนนเฉลี่ย null เมื่อยังไม่มีรีวิว */
  ratingAvg: number | null;

  /**
   * รีวิวของผู้เปิดดูเอง — null เมื่อยังไม่เคยรีวิวหรือเป็นผู้เยี่ยมชม
   * ใช้เติมค่าเดิมลงฟอร์ม เพราะหนึ่งคนรีวิวได้กิจกรรมละครั้งเดียว (unique activityId+userId)
   */
  myReview: { stars: number; comment: string } | null;
  /**
   * true เมื่อผู้เปิดดูเขียนรีวิวได้ — ต้องเข้าร่วมกิจกรรมจนจบเท่านั้น
   * ไม่ใช่แค่เข้าสู่ระบบ ไม่งั้นคนที่ไม่เคยไปก็ให้ดาวได้
   */
  canReview: boolean;
};

/** อ่านคอลัมน์ที่เก็บเป็น JSON string — ข้อมูลเสียหายต้องไม่ทำให้ทั้งหน้าพัง */
function jsonList(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

/** ลิงก์แผนที่ที่ใช้ได้โดยไม่ต้องมี API key — ค่าที่ผู้จัดตั้งเองมาก่อนเสมอ */
export function mapLinkFor(opts: { mapLink: string | null; lat: number | null; lng: number | null; location: string }): string {
  if (opts.mapLink) return opts.mapLink;
  const query = opts.lat != null && opts.lng != null ? `${opts.lat},${opts.lng}` : opts.location;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

const MS_PER_DAY = 86_400_000;

/**
 * ย่อชื่อผู้รีวิวเหลือชื่อต้นกับอักษรแรกของนามสกุล เช่น "ณัฐชา ว."
 *
 * หน้ารายละเอียดกิจกรรมเปิดสาธารณะ และรีวิวมีได้เฉพาะคนที่เข้าร่วมจนจบกิจกรรม
 * ถ้าแสดงชื่อเต็มให้ผู้ที่ยังไม่เข้าสู่ระบบ รายชื่อผู้รีวิวก็เท่ากับรายชื่อผู้เข้าร่วม
 * ที่ใครบนอินเทอร์เน็ตก็อ่านได้ — ผู้ที่เข้าสู่ระบบแล้วเห็นชื่อเต็มตามนโยบายที่ตกลงไว้
 */
function maskName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1].charAt(0)}.`;
}

export async function getActivityDetail(
  id: string,
  viewerId: string | null,
  /** บทบาทของผู้เปิดดู — ใช้ตัดสินว่าจะส่งรหัสนิสิตลงไปด้วยหรือไม่ */
  viewerRole: string | null = null,
): Promise<ActivityDetailView | null> {
  const activity = await prisma.activity.findUnique({
    where: { id },
    include: { category: true, organizer: { select: { name: true } } },
  });
  if (!activity) return null;

  const [filled, myRegistration, favorite, reviewRows, participantRows, myReview] = await Promise.all([
    prisma.registration.count({ where: { activityId: id, status: { in: SEAT_TAKEN } } }),
    viewerId
      ? prisma.registration.findFirst({
          where: { activityId: id, userId: viewerId },
          // ใบหลักฐานล่าสุดมาด้วย เพื่อให้ปุ่มในหน้านี้รู้ว่าควรชวนให้ส่ง ส่งใหม่ หรือรอตรวจอยู่
          select: {
            id: true,
            status: true,
            evidence: { orderBy: { createdAt: 'desc' }, take: 1, select: { status: true } },
          },
        })
      : Promise.resolve(null),
    viewerId
      ? prisma.favorite.findUnique({
          where: { userId_activityId: { userId: viewerId, activityId: id } },
          select: { userId: true },
        })
      : Promise.resolve(null),
    prisma.review.findMany({
      where: { activityId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { user: { select: { name: true } } },
    }),
    // รายชื่อผู้เข้าร่วมเปิดให้ผู้ที่เข้าสู่ระบบแล้วทุกคน ไม่ต้องลงทะเบียนกิจกรรมนี้ก่อน
    // ไม่ส่งอีเมลหรือเบอร์โทรลงไปด้วย — ข้อมูลติดต่อยังเป็นของผู้จัดกิจกรรมเท่านั้น
    viewerId
      ? prisma.registration.findMany({
          where: { activityId: id, status: { in: SEAT_TAKEN } },
          orderBy: { regAt: 'asc' },
          take: 200,
          select: {
            status: true,
            regAt: true,
            hoursAwarded: true,
            user: { select: { id: true, name: true, faculty: true, avatarUrl: true, studentId: true } },
          },
        })
      : Promise.resolve([]),
    viewerId
      ? prisma.review.findUnique({
          where: { activityId_userId: { activityId: id, userId: viewerId } },
          select: { stars: true, comment: true },
        })
      : Promise.resolve(null),
  ]);

  // ผู้ที่เข้าสู่ระบบแล้วเห็นรายชื่อผู้เข้าร่วมอยู่แล้ว การย่อชื่อผู้รีวิวจึงไม่ได้ปกป้องอะไรเพิ่ม
  // ส่วนผู้เยี่ยมชมที่ยังไม่เข้าสู่ระบบยังเห็นเป็นชื่อย่อเหมือนเดิม
  const canSeeNames = viewerId != null;
  // ผู้จัดกิจกรรมนี้เองหรือแอดมิน — เห็นข้อมูลระบุตัวตนได้มากกว่าผู้ชมทั่วไป
  const isStaffViewer =
    viewerRole === 'admin' || (viewerId != null && activity.organizerId === viewerId);
  const reviews = reviewRows.map((r) => ({
    id: r.id,
    stars: r.stars,
    comment: r.comment,
    author: canSeeNames ? r.user.name : maskName(r.user.name),
    dateTh: DATE_TH.format(r.createdAt),
    dateEn: DATE_EN.format(r.createdAt),
  }));

  // กิจกรรมข้ามวันนับจากคีย์วันตามเวลาไทย ไม่ใช่ส่วนต่างของเวลา
  // กิจกรรม 20:00-01:00 กินเวลา 5 ชั่วโมงแต่ข้ามไปวันใหม่ ต้องนับเป็น 2 วัน
  const startDay = dayKeyOf(activity.startAt);
  const endDay = dayKeyOf(activity.endAt);
  const multiDay = startDay !== endDay;
  const days = multiDay
    ? Math.round((Date.parse(endDay) - Date.parse(startDay)) / MS_PER_DAY) + 1
    : 1;

  const now = Date.now();
  const daysLeft = activity.regCloseAt
    ? Math.ceil((activity.regCloseAt.getTime() - now) / MS_PER_DAY)
    : null;

  // กติกาเดียวกับที่ POST /registrations ใช้ — เดิมที่นี่ลืมดู regOpenAt
  // ทำให้ปุ่มสมัครเปิดให้กดทั้งที่ยังไม่ถึงวันเปิดรับ แล้วโดนเซิร์ฟเวอร์ปฏิเสธทุกครั้ง
  const block = registrationBlock(activity, new Date(now));
  const notOpenYet = block === 'not-open-yet';
  /** ปิดรับสมัคร (รวมกรณียังไม่เปิด) — ใช้ปิดปุ่ม ส่วนข้อความบอกเหตุผลดูที่ notOpenYet */
  const closed = block !== null;

  return {
    id: activity.id,
    title: activity.title,
    description: activity.description,
    orgName: activity.orgName,
    organizerName: activity.organizer.name,
    photo: activity.photo,
    gallery: jsonList(activity.gallery),
    perks: jsonList(activity.perks),
    prep: jsonList(activity.prep),
    notes: activity.notes,

    dateTh: DATE_TH.format(activity.startAt),
    dateEn: DATE_EN.format(activity.startAt),
    endDateTh: multiDay ? DATE_TH.format(activity.endAt) : null,
    endDateEn: multiDay ? DATE_EN.format(activity.endAt) : null,
    days,
    time: `${timeOf(activity.startAt)} - ${timeOf(activity.endAt)}`,
    hours: activity.hours,

    location: activity.location,
    lat: activity.lat,
    lng: activity.lng,
    mapLink: mapLinkFor(activity),
    mapImage: activity.mapImage,

    seatsFilled: filled,
    seatsTotal: activity.seatsTotal,
    regOpenTh: activity.regOpenAt ? DATE_TH.format(activity.regOpenAt) : null,
    regOpenEn: activity.regOpenAt ? DATE_EN.format(activity.regOpenAt) : null,
    regCloseTh: activity.regCloseAt ? DATE_TH.format(activity.regCloseAt) : null,
    regCloseEn: activity.regCloseAt ? DATE_EN.format(activity.regCloseAt) : null,
    daysLeft,

    status: activity.status,
    closed,
    notOpenYet,

    category: {
      id: activity.category.id,
      label: activity.category.label,
      labelEn: activity.category.labelEn,
      color: activity.category.color,
    },

    myRegistration: myRegistration
      ? {
          id: myRegistration.id,
          status: myRegistration.status,
          evidenceStatus: myRegistration.evidence[0]?.status ?? null,
        }
      : null,
    favorited: favorite != null,

    participants: participantRows.map((r) => ({
      id: r.user.id,
      name: r.user.name,
      faculty: r.user.faculty,
      avatarUrl: r.user.avatarUrl,
      status: r.status,
      regAtTh: DATE_TH.format(r.regAt),
      regAtEn: DATE_EN.format(r.regAt),
      hoursAwarded: r.hoursAwarded,
      studentId: isStaffViewer ? r.user.studentId : null,
    })),
    canSeeParticipants: canSeeNames,

    reviews,
    ratingAvg: reviews.length
      ? Math.round((reviews.reduce((sum, r) => sum + r.stars, 0) / reviews.length) * 10) / 10
      : null,

    myReview,
    canReview: myRegistration?.status === 'completed',
  };
}
