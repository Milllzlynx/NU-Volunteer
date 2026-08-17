import type { PublicActivity } from '@/components/landing/types';
import { prisma } from '@/lib/db';

/** สถานะการลงทะเบียนที่นับว่ากินที่นั่งไปแล้ว */
export const SEAT_TAKEN = ['pending', 'approved', 'checked-in', 'checked-out', 'completed'];

/** สถานะที่ถือว่านิสิต "ได้เข้าร่วม" จริง — ตัดใบสมัครที่ยังรอ/ถูกปฏิเสธ/ยกเลิกออก */
export const JOINED = ['approved', 'checked-in', 'checked-out', 'completed'];

/**
 * ต้องยกเลิกก่อนวันจัดกิจกรรมอย่างน้อยกี่วัน (ตามคู่มือผู้ใช้งาน)
 *
 * อยู่ที่นี่เพราะทั้งปลายทางที่นิสิตยื่นคำขอและหน้าที่ผู้จัดใช้พิจารณาต้องใช้ค่าเดียวกัน
 * — ถ้าเก็บไว้ในไฟล์ route หน้าอื่นจะต้อง import ตัว route module เข้ามาด้วย
 */
export const CANCEL_LEAD_DAYS = 3;

const TZ = 'Asia/Bangkok';
// จัดรูปแบบวันที่ฝั่งเซิร์ฟเวอร์ พร้อมตรึงเขตเวลา เพื่อให้ผลลัพธ์ SSR ตรงกับฝั่ง client เสมอ
export const DATE_TH = new Intl.DateTimeFormat('th-TH', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: TZ,
});
export const DATE_EN = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: TZ,
});

// en-CA ให้รูปแบบ YYYY-MM-DD พอดี — ใช้เป็นคีย์จัดกลุ่มรายการลงช่องวันของปฏิทิน
const DAY_KEY = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: TZ,
});
const TIME_HM = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: TZ,
});

/** คีย์วันตามเวลาไทย (YYYY-MM-DD) — คำนวณฝั่งเซิร์ฟเวอร์เสมอ เพื่อไม่ให้ผลต่างจากเขตเวลาของเครื่องผู้ใช้ */
export const dayKeyOf = (d: Date) => DAY_KEY.format(d);

/** เวลาแบบ HH:mm ตามเวลาไทย */
export const timeOf = (d: Date) => TIME_HM.format(d);

/** เฉพาะฟิลด์ที่ใช้สร้าง PublicActivity — รับได้ทั้งผลลัพธ์ include และ select */
export type ActivityRow = {
  id: string;
  title: string;
  description: string;
  orgName: string;
  photo: string | null;
  status: string;
  startAt: Date;
  endAt: Date;
  regOpenAt: Date | null;
  regCloseAt: Date | null;
  hours: number;
  location: string;
  seatsTotal: number;
  category: { id: string; label: string; labelEn: string; color: string };
};

/** เหตุผลที่ยังกดสมัครไม่ได้ — null คือสมัครได้ */
export type RegBlock = 'not-open-yet' | 'closed' | null;

/**
 * กติกาเดียวที่ตัดสินว่ากิจกรรมรับสมัครอยู่หรือไม่
 *
 * ต้องมีที่เดียว เพราะก่อนหน้านี้ปลายทาง POST /registrations กับตัวสร้างหน้ารายละเอียด
 * เขียนเงื่อนไขแยกกันคนละชุด แล้วชุดของหน้าจอลืมดู regOpenAt ผลคือกิจกรรมที่ยังไม่ถึง
 * วันเปิดรับสมัครถูกแสดงว่า "เปิดรับสมัคร" พร้อมปุ่มที่กดได้ แต่เซิร์ฟเวอร์ปฏิเสธทุกครั้ง
 *
 * แยก "ยังไม่เปิด" ออกจาก "ปิดแล้ว" ด้วย เพราะสองอย่างนี้ผู้ใช้ต้องทำคนละอย่าง
 * อันหนึ่งคือรอ อีกอันคือเลิกรอได้แล้ว
 */
export function registrationBlock(
  a: { status: string; endAt: Date; regOpenAt: Date | null; regCloseAt: Date | null },
  now: Date = new Date(),
): RegBlock {
  const closed =
    a.status !== 'open' ||
    a.endAt < now ||
    (a.regCloseAt != null && a.regCloseAt < now);
  if (closed) return 'closed';
  if (a.regOpenAt != null && a.regOpenAt > now) return 'not-open-yet';
  return null;
}

/** จำนวนที่นั่งที่ถูกจองแล้วของแต่ละกิจกรรม */
export async function seatFillMap(activityIds: string[]): Promise<Map<string, number>> {
  if (!activityIds.length) return new Map();
  const rows = await prisma.registration.groupBy({
    by: ['activityId'],
    where: { activityId: { in: activityIds }, status: { in: SEAT_TAKEN } },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.activityId, r._count._all]));
}

export function toPublicActivity(a: ActivityRow, filled: Map<string, number>): PublicActivity {
  const block = registrationBlock(a);
  return {
    notOpenYet: block === 'not-open-yet',
    regOpenTh: a.regOpenAt ? DATE_TH.format(a.regOpenAt) : null,
    regOpenEn: a.regOpenAt ? DATE_EN.format(a.regOpenAt) : null,
    id: a.id,
    title: a.title,
    description: a.description,
    orgName: a.orgName,
    photo: a.photo,
    dateTh: DATE_TH.format(a.startAt),
    dateEn: DATE_EN.format(a.startAt),
    time: `${timeOf(a.startAt)} - ${timeOf(a.endAt)}`,
    hours: a.hours,
    location: a.location,
    seatsFilled: filled.get(a.id) ?? 0,
    seatsTotal: a.seatsTotal,
    category: {
      id: a.category.id,
      label: a.category.label,
      labelEn: a.category.labelEn,
      color: a.category.color,
    },
  };
}

/** แปลงกิจกรรมเป็นรูปแบบที่ส่งลงฝั่ง client ได้ พร้อมนับที่นั่งในคำสั่งเดียว */
export async function toPublicActivities(rows: ActivityRow[]): Promise<PublicActivity[]> {
  const filled = await seatFillMap(rows.map((a) => a.id));
  return rows.map((a) => toPublicActivity(a, filled));
}
