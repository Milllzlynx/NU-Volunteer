/**
 * ตัวช่วยฝั่งผู้จัดกิจกรรม — การตรวจความเป็นเจ้าของและการอ่านค่าจากฟอร์มกิจกรรม
 *
 * แยกออกมาจาก route เพราะทั้งเส้นสร้าง แก้ไข และจัดการผู้เข้าร่วม ต้องใช้กติกาเดียวกัน
 * ถ้าปล่อยให้แต่ละ route ตรวจเอง จะมีสักเส้นที่ลืมตรวจว่ากิจกรรมเป็นของใคร
 */

import { DATE_EN, DATE_TH, dayKeyOf, timeOf } from '@/lib/activities';
import { fail } from '@/lib/errors';
import { readHttpUrl, readImageSrc } from '@/lib/imageSrc';
import { prisma } from '@/lib/db';
import { ATTENDED, round1, type ActivityReportRow } from '@/lib/organizerStats';
import type { UserModel as User } from '@/lib/generated/prisma/models';

/** สถานะกิจกรรมที่ผู้จัดตั้งได้เอง — done มาจากระบบหลังกิจกรรมจบ ไม่ใช่ปุ่มในฟอร์ม */
export const ACTIVITY_STATUSES = ['draft', 'open', 'closed', 'cancelled'] as const;
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];

/**
 * คืนกิจกรรมเมื่อผู้ใช้มีสิทธิ์จัดการเท่านั้น
 *
 * ผู้จัดเห็นเฉพาะกิจกรรมของตัวเอง ส่วนแอดมินดูแลได้ทุกกิจกรรม
 * แยกไม่พบกับไม่มีสิทธิ์ไม่ได้ตั้งใจ — ทั้งสองกรณีคืน NOT_FOUND เหมือนกัน
 * เพื่อไม่ให้ใครเดารหัสกิจกรรมของหน่วยงานอื่นได้จากความต่างของข้อความ error
 */
export async function requireOwnedActivity(user: User, activityId: string) {
  const activity = await prisma.activity.findUnique({ where: { id: activityId } });
  if (!activity) fail('NOT_FOUND');
  if (user.role !== 'admin' && activity.organizerId !== user.id) fail('NOT_FOUND');
  return activity;
}

/** เงื่อนไข where ของรายการกิจกรรมตามบทบาท — แอดมินไม่ถูกกรอง */
export function ownedActivityFilter(user: User) {
  return user.role === 'admin' ? {} : { organizerId: user.id };
}

/**
 * งานที่ผู้จัดต้องลงมือทำ — คำนวณสด ไม่ได้เก็บเป็นแถวใน Notification
 *
 * ต่างจากการแจ้งเตือนของนิสิตที่เป็นการเตือนกำหนดการ ของผู้จัดคือ "คิวงานค้าง"
 * จึงต้องสะท้อนสถานะปัจจุบันเสมอ ถ้าเก็บเป็นแถวไว้ ตัวเลขจะค้างอยู่หลังจากเคลียร์งานไปแล้ว
 */
export type OrganizerAlert = {
  key: string;
  icon: string;
  title: string;
  body: string;
  href: string;
  count: number;
  severity: 'info' | 'warning' | 'danger';
};

export async function deriveOrganizerAlerts(user: User): Promise<OrganizerAlert[]> {
  const scope = ownedActivityFilter(user);
  const now = new Date();
  const soon = new Date(now.getTime() + 3 * 86_400_000);

  const [pendingRegs, pendingCancels, awaitingHours, startingSoon, drafts] = await Promise.all([
    prisma.registration.count({ where: { activity: scope, status: 'pending' } }),
    prisma.registration.count({
      where: { activity: scope, cancelRequested: true, cancelStatus: 'pending' },
    }),
    prisma.registration.count({
      where: { activity: scope, status: 'checked-out', hoursApprovedAt: null },
    }),
    prisma.activity.count({
      where: { ...scope, status: 'open', startAt: { gte: now, lte: soon } },
    }),
    prisma.activity.count({ where: { ...scope, status: 'draft' } }),
  ]);

  const alerts: OrganizerAlert[] = [];

  if (pendingRegs > 0) {
    alerts.push({
      key: 'pending-registrations',
      icon: 'hourglass_top',
      title: 'มีใบลงทะเบียนรออนุมัติ',
      body: 'นิสิตจะยังไม่ได้ที่นั่งจนกว่าคุณจะพิจารณา',
      href: '/organizer/registrations',
      count: pendingRegs,
      severity: 'warning',
    });
  }

  if (pendingCancels > 0) {
    alerts.push({
      key: 'pending-cancellations',
      icon: 'event_busy',
      title: 'มีคำขอยกเลิกรอพิจารณา',
      body: 'ที่นั่งจะยังไม่ถูกคืนจนกว่าคำขอจะได้รับการอนุมัติ',
      href: '/organizer/cancellations',
      count: pendingCancels,
      severity: 'danger',
    });
  }

  if (awaitingHours > 0) {
    alerts.push({
      key: 'awaiting-hours',
      icon: 'fact_check',
      title: 'มีผู้เข้าร่วมรอรับรองชั่วโมง',
      body: 'นิสิตจะยังไม่ได้ชั่วโมงจนกว่าคุณจะรับรอง',
      href: '/organizer/hours-approval',
      count: awaitingHours,
      severity: 'warning',
    });
  }

  if (startingSoon > 0) {
    alerts.push({
      key: 'starting-soon',
      icon: 'upcoming',
      title: 'กิจกรรมกำลังจะเริ่มใน 3 วัน',
      body: 'ตรวจรายชื่อผู้เข้าร่วมและเตรียมการเช็กอินให้พร้อม',
      href: '/organizer/calendar',
      count: startingSoon,
      severity: 'info',
    });
  }

  if (drafts > 0) {
    alerts.push({
      key: 'drafts',
      icon: 'edit_note',
      title: 'มีกิจกรรมที่ยังเป็นฉบับร่าง',
      body: 'ฉบับร่างยังไม่แสดงให้นิสิตเห็น เผยแพร่เมื่อพร้อมรับสมัคร',
      href: '/organizer/activities',
      count: drafts,
      severity: 'info',
    });
  }

  return alerts;
}

/**
 * ตัวเลขรายกิจกรรมทั้งหมดที่ผู้จัดคนนี้ดูแล เรียงจากกิจกรรมล่าสุด
 *
 * แอดมินไม่ถูกกรอง (ownedActivityFilter คืน {}) จึงได้ทุกกิจกรรมในระบบ
 */
export async function loadActivityReport(user: User): Promise<ActivityReportRow[]> {
  const scope = ownedActivityFilter(user);
  const now = new Date();

  const [activities, regGroups, reviewGroups] = await Promise.all([
    prisma.activity.findMany({
      where: scope,
      orderBy: { startAt: 'desc' },
      include: { category: { select: { id: true, label: true, labelEn: true, color: true } } },
    }),
    prisma.registration.groupBy({
      by: ['activityId', 'status'],
      where: { activity: scope },
      _count: { _all: true },
      _sum: { hoursAwarded: true },
    }),
    prisma.review.groupBy({
      by: ['activityId'],
      where: { activity: scope },
      _count: { _all: true },
      _avg: { stars: true },
    }),
  ]);

  /* activityId -> status -> จำนวนใบและชั่วโมงที่รับรอง */
  const byActivity = new Map<string, Map<string, { count: number; hours: number }>>();
  for (const g of regGroups) {
    const inner = byActivity.get(g.activityId) ?? new Map();
    inner.set(g.status, { count: g._count._all, hours: g._sum.hoursAwarded ?? 0 });
    byActivity.set(g.activityId, inner);
  }

  const reviews = new Map(reviewGroups.map((g) => [g.activityId, g]));

  return activities.map((a) => {
    const statuses = byActivity.get(a.id) ?? new Map<string, { count: number; hours: number }>();
    const countOf = (status: string) => statuses.get(status)?.count ?? 0;
    const sumOf = (list: string[]) => list.reduce((s, k) => s + countOf(k), 0);

    let registered = 0;
    let hoursAwarded = 0;
    for (const v of statuses.values()) {
      registered += v.count;
      hoursAwarded += v.hours;
    }

    const review = reviews.get(a.id);

    return {
      id: a.id,
      title: a.title,
      orgName: a.orgName,
      status: a.status,
      categoryId: a.category.id,
      categoryLabel: a.category.label,
      categoryLabelEn: a.category.labelEn || a.category.label,
      categoryColor: a.category.color,
      dayKey: dayKeyOf(a.startAt),
      dateTh: DATE_TH.format(a.startAt),
      dateEn: DATE_EN.format(a.startAt),
      time: `${timeOf(a.startAt)}–${timeOf(a.endAt)}`,
      past: a.endAt < now,

      hours: a.hours,
      seatsTotal: a.seatsTotal,

      registered,
      pending: countOf('pending'),
      approved: countOf('approved'),
      rejected: countOf('rejected'),
      cancelled: countOf('cancelled'),
      noShow: countOf('no-show'),
      attended: sumOf(ATTENDED),
      completed: countOf('completed'),

      hoursAwarded: round1(hoursAwarded),
      reviewCount: review?._count._all ?? 0,
      ratingAvg: review?._avg.stars != null ? Math.round(review._avg.stars * 10) / 10 : null,
    };
  });
}

export type ActivityInput = {
  title: string;
  categoryId: string;
  orgName: string;
  description: string;
  location: string;
  startAt: Date;
  endAt: Date;
  regOpenAt: Date | null;
  regCloseAt: Date | null;
  seatsTotal: number;
  hours: number;
  status: ActivityStatus;
  requiresApproval: boolean;
  photo: string | null;
  mapLink: string | null;
  mapImage: string | null;
  /** JSON string ตามรูปแบบของคอลัมน์ Activity.gallery */
  gallery: string;
  perks: string;
  prep: string;
  notes: string;
};

/**
 * แปลงค่าจาก <input type="datetime-local"> เป็น Date
 *
 * ค่าที่ได้จากช่องนี้เป็น "YYYY-MM-DDTHH:mm" ที่ไม่มีเขตเวลาติดมา
 * ถ้าส่งเข้า new Date() ตรง ๆ จาวาสคริปต์จะตีความเป็นเวลาท้องถิ่นของเครื่องที่รันเซิร์ฟเวอร์
 * ซึ่งบนเครื่อง deploy มักเป็น UTC — เวลากิจกรรมจะเพี้ยนไป 7 ชั่วโมงทันที
 * จึงต่อ +07:00 เข้าไปเอง ประเทศไทยไม่มี DST ออฟเซ็ตนี้จึงคงที่ตลอดปี
 */
function readDate(raw: unknown, field: string, required: boolean): Date | null {
  const s = String(raw ?? '').trim();
  if (!s) {
    if (required) fail('VALIDATION_ERROR', `กรุณาระบุ${field}`);
    return null;
  }

  const local = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(s);
  const d = new Date(local ? `${s.length === 16 ? `${s}:00` : s}+07:00` : s);
  if (Number.isNaN(d.getTime())) fail('VALIDATION_ERROR', `รูปแบบ${field}ไม่ถูกต้อง`);
  return d;
}

/** ค่าเริ่มต้นของช่อง datetime-local จากค่าที่เก็บไว้ — ต้องเป็นเวลาไทยให้ตรงกับตอนบันทึก */
export function toDateTimeLocal(d: Date | null): string {
  return d ? `${dayKeyOf(d)}T${timeOf(d)}` : '';
}

/** เก็บรายการข้อความเป็น JSON string ตามที่คอลัมน์ perks/prep คาดไว้ */
function readList(raw: unknown): string {
  if (Array.isArray(raw)) {
    return JSON.stringify(raw.map((v) => String(v).trim()).filter(Boolean));
  }
  // ฟอร์มส่งมาเป็นข้อความหลายบรรทัด — หนึ่งบรรทัดคือหนึ่งรายการ
  const lines = String(raw ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  return JSON.stringify(lines);
}

/** ความยาวสูงสุดของหมายเหตุพิเศษ — กันข้อความยาวผิดปกติ ไม่ได้ตั้งใจจำกัดการใช้งานจริง */
const MAX_NOTES_CHARS = 2000;

/** หมายเหตุพิเศษเก็บเป็นข้อความอิสระ ไม่ตัดบรรทัดเป็นรายการเหมือน perks/prep */
function readNotes(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (s.length > MAX_NOTES_CHARS) fail('VALIDATION_ERROR', 'หมายเหตุพิเศษยาวเกินไป');
  return s;
}

/** จำนวนภาพประกอบสูงสุดต่อกิจกรรม — ตรงกับจำนวนช่องบนฟอร์ม */
const MAX_GALLERY = 3;

/** อ่านรายการภาพประกอบให้เป็น JSON string ตามที่คอลัมน์ gallery คาดไว้ */
function readGallery(raw: unknown): string {
  if (raw == null) return '[]';
  if (!Array.isArray(raw)) fail('VALIDATION_ERROR', 'รูปแบบภาพประกอบกิจกรรมไม่ถูกต้อง');
  if (raw.length > MAX_GALLERY) {
    fail('VALIDATION_ERROR', `ภาพประกอบกิจกรรมใส่ได้ไม่เกิน ${MAX_GALLERY} ภาพ`);
  }

  const images = raw
    .map((item) => readImageSrc(item, 'ภาพประกอบกิจกรรม'))
    .filter((src): src is string => src !== null);
  return JSON.stringify(images);
}

/**
 * ตรวจและแปลง body ของฟอร์มกิจกรรม
 *
 * ตรวจซ้ำทั้งหมดที่ฝั่งเซิร์ฟเวอร์แม้ฟอร์มจะตรวจให้แล้ว ตามหลักเดียวกับ lib/validation.ts
 */
export async function readActivityInput(body: Record<string, unknown>): Promise<ActivityInput> {
  const title = String(body.title ?? '').trim();
  if (!title) fail('VALIDATION_ERROR', 'กรุณาระบุชื่อกิจกรรม');
  if (title.length > 200) fail('VALIDATION_ERROR', 'ชื่อกิจกรรมยาวเกินไป');

  const categoryId = String(body.categoryId ?? '').trim();
  if (!categoryId) fail('VALIDATION_ERROR', 'กรุณาเลือกหมวดหมู่');
  const category = await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (!category) fail('VALIDATION_ERROR', 'ไม่พบหมวดหมู่ที่เลือก');

  const startAt = readDate(body.startAt, 'วันเวลาเริ่มกิจกรรม', true)!;
  const endAt = readDate(body.endAt, 'วันเวลาสิ้นสุดกิจกรรม', true)!;
  if (endAt.getTime() <= startAt.getTime()) {
    fail('VALIDATION_ERROR', 'เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มกิจกรรม');
  }

  const regOpenAt = readDate(body.regOpenAt, 'วันเปิดรับสมัคร', false);
  const regCloseAt = readDate(body.regCloseAt, 'วันปิดรับสมัคร', false);
  if (regOpenAt && regCloseAt && regCloseAt.getTime() <= regOpenAt.getTime()) {
    fail('VALIDATION_ERROR', 'วันปิดรับสมัครต้องอยู่หลังวันเปิดรับสมัคร');
  }
  // ปิดรับสมัครหลังกิจกรรมเริ่มไปแล้วไม่มีความหมาย และทำให้การ์ดแสดงสถานะขัดกันเอง
  if (regCloseAt && regCloseAt.getTime() > startAt.getTime()) {
    fail('VALIDATION_ERROR', 'วันปิดรับสมัครต้องไม่เลยวันเริ่มกิจกรรม');
  }

  const seatsTotal = Number(body.seatsTotal ?? 0);
  if (!Number.isInteger(seatsTotal) || seatsTotal < 0) {
    fail('VALIDATION_ERROR', 'จำนวนที่นั่งต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป');
  }

  const hours = Number(body.hours ?? 0);
  if (!Number.isFinite(hours) || hours < 0 || hours > 1000) {
    fail('VALIDATION_ERROR', 'ชั่วโมงจิตอาสาไม่ถูกต้อง');
  }

  const statusRaw = String(body.status ?? 'draft') as ActivityStatus;
  if (!ACTIVITY_STATUSES.includes(statusRaw)) fail('VALIDATION_ERROR', 'สถานะกิจกรรมไม่ถูกต้อง');

  return {
    title,
    categoryId,
    orgName: String(body.orgName ?? '').trim(),
    description: String(body.description ?? '').trim(),
    location: String(body.location ?? '').trim(),
    startAt,
    endAt,
    regOpenAt,
    regCloseAt,
    seatsTotal,
    hours,
    status: statusRaw,
    requiresApproval: Boolean(body.requiresApproval ?? true),
    photo: readImageSrc(body.photo, 'ภาพหน้าปก'),
    mapLink: readHttpUrl(body.mapLink, 'ลิงก์แผนที่'),
    mapImage: readImageSrc(body.mapImage, 'ภาพแผนที่'),
    gallery: readGallery(body.gallery),
    perks: readList(body.perks),
    prep: readList(body.prep),
    notes: readNotes(body.notes),
  };
}
