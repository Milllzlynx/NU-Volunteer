/**
 * โทเคนเช็กอินที่ผู้จัดแสดงเป็น QR หน้างาน
 *
 * รหัสหมุนทุก TOKEN_TTL_SEC วินาที เพราะ QR ที่อยู่นิ่งจะถูกถ่ายรูปแล้วส่งต่อให้คนที่ไม่ได้มางาน
 * อายุสั้นทำให้ภาพถ่ายหมดค่าก่อนจะส่งถึงมือใคร แต่ยังยาวพอให้คนต่อแถวสแกนทัน
 *
 * เช็กอินกับเช็กเอาต์ใช้คนละรหัส (kind = in | out) ไม่งั้นคนที่สแกนตอนมาถึง
 * จะกดสแกนซ้ำแล้วถูกนับเป็นเช็กเอาต์ทันทีโดยไม่ตั้งใจ
 */

import crypto from 'node:crypto';
import { publishCheckin } from '@/lib/checkinBus';
import { prisma } from '@/lib/db';
import { fail } from '@/lib/errors';
import { requireOwnedActivity } from '@/lib/organizer';
import { round1 } from '@/lib/organizerStats';
import type { UserModel as User } from '@/lib/generated/prisma/models';

/**
 * ทิศทางของรหัสหนึ่งใบ
 *
 * in / out = รหัสคนละใบสำหรับเข้าและออก ปลอดภัยที่สุด เพราะคนที่สแกนซ้ำโดยไม่ตั้งใจ
 * จะไม่ถูกนับว่าออกจากงาน
 *
 * auto = ใบเดียวใช้ได้ทั้งเข้าและออก เซิร์ฟเวอร์ดูจากสถานะปัจจุบันของคนสแกนว่าควรทำอะไร
 * สะดวกกว่าเพราะผู้จัดไม่ต้องคอยสลับจอ แต่แลกมาด้วยความเสี่ยงที่คนสแกนสองครั้งติดกัน
 * จะถูกเช็กเอาต์ทันที — ให้ผู้จัดเลือกเองว่ารับความเสี่ยงนี้ไหม
 */
export const CHECKIN_KINDS = ['in', 'out', 'auto'] as const;
export type CheckinKind = (typeof CHECKIN_KINDS)[number];

/** อายุของรหัสหนึ่งรอบ (วินาที) */
export const TOKEN_TTL_SEC = 60;

/**
 * เหลืออายุน้อยกว่านี้ถือว่าใกล้หมด ให้ออกรหัสใหม่เลย
 * กันกรณีหน้าจอเพิ่งขอรหัสมาแล้วมันหมดอายุระหว่างที่คนกำลังยกกล้องขึ้นมาสแกน
 */
const RENEW_MARGIN_SEC = 10;

/** อ่านง่ายเมื่อต้องพิมพ์มือ — ตัด 0/O/1/I ออกเพราะมองแล้วแยกไม่ออก */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 12;

export function isCheckinKind(v: unknown): v is CheckinKind {
  return typeof v === 'string' && (CHECKIN_KINDS as readonly string[]).includes(v);
}

/** สุ่มแบบไม่มี modulo bias — ทิ้งไบต์ที่ตกนอกช่วงที่หารลงตัวแล้วสุ่มใหม่ */
function randomCode(): string {
  const limit = 256 - (256 % ALPHABET.length);
  let out = '';
  while (out.length < CODE_LENGTH) {
    for (const b of crypto.randomBytes(CODE_LENGTH)) {
      if (b >= limit) continue;
      out += ALPHABET[b % ALPHABET.length];
      if (out.length === CODE_LENGTH) break;
    }
  }
  return out;
}

/** สถานะที่เช็กอินได้ — ต้องผ่านการอนุมัติแล้วเท่านั้น */
const CAN_CHECK_IN = 'approved';
/** สถานะที่เช็กเอาต์ได้ — ต้องเช็กอินไว้ก่อน */
const CAN_CHECK_OUT = 'checked-in';
/** ผ่านการเช็กเอาต์ไปแล้ว — สแกนอีกก็ไม่มีอะไรให้ทำ */
const DONE_STATUSES = ['checked-out', 'completed'];

/**
 * ข้อความที่เข้ารหัสลงใน QR
 *
 * ขึ้นต้นด้วยชื่อและรุ่นของรูปแบบ เพื่อให้ตัวสแกนแยกออกทันทีว่าเป็น QR ของระบบนี้
 * ไม่ใช่ URL เพราะไม่มีหน้าเว็บปลายทางให้เปิด — ถ้าใส่ลิงก์ไว้ คนที่สแกนด้วยกล้องของเครื่อง
 * จะเจอหน้า 404 แทนที่จะรู้ว่าต้องสแกนจากในแอป
 */
export function qrPayload(code: string): string {
  return `NUV1:${code}`;
}

export type CheckinTokenView = {
  code: string;
  kind: CheckinKind;
  payload: string;
  expiresAtMs: number;
  ttlSec: number;
};

/**
 * รหัสที่ใช้อยู่ตอนนี้ของกิจกรรม — คืนของเดิมถ้ายังไม่ใกล้หมดอายุ ไม่งั้นออกใหม่
 *
 * ใช้ของเดิมซ้ำได้เพราะผู้จัดอาจเปิดหน้านี้ไว้หลายเครื่อง (คอมลงทะเบียนกับจอโปรเจกเตอร์)
 * ถ้าออกรหัสใหม่ทุกครั้งที่มีคนถาม สองจอจะแสดงคนละรหัสแล้วคนสแกนจะงงว่าอันไหนใช้ได้
 */
export async function currentCheckinToken(
  activityId: string,
  kind: CheckinKind,
  /**
   * บังคับออกรหัสใหม่และฆ่ารหัสเดิมทิ้งทันที
   *
   * มีไว้ให้ปุ่ม "ขอรหัสใหม่ทันที" ของผู้จัด ซึ่งจะถูกกดตอนสงสัยว่ารหัสรั่ว
   * (มีคนถ่ายรูป QR ไป) การคืนรหัสเดิมในกรณีนั้นเท่ากับไม่ได้แก้อะไรเลย
   * จึงต้องลบของเดิมด้วย ไม่ใช่แค่สร้างใบใหม่ทับ
   */
  force = false,
): Promise<CheckinTokenView> {
  const now = new Date();
  const usableUntil = new Date(now.getTime() + RENEW_MARGIN_SEC * 1000);

  if (force) await prisma.checkinToken.deleteMany({ where: { activityId, kind } });

  const live = force
    ? null
    : await prisma.checkinToken.findFirst({
        where: { activityId, kind, expiresAt: { gt: usableUntil } },
        orderBy: { expiresAt: 'desc' },
      });

  if (live) {
    return {
      code: live.code,
      kind,
      payload: qrPayload(live.code),
      expiresAtMs: live.expiresAt.getTime(),
      ttlSec: TOKEN_TTL_SEC,
    };
  }

  // เก็บกวาดรหัสที่หมดอายุของกิจกรรมนี้ไปพร้อมกัน จะได้ไม่ต้องมีงานตามล้างแยกต่างหาก
  await prisma.checkinToken.deleteMany({ where: { activityId, expiresAt: { lte: now } } });

  const expiresAt = new Date(now.getTime() + TOKEN_TTL_SEC * 1000);
  const created = await prisma.checkinToken.create({
    data: { activityId, kind, code: randomCode(), expiresAt },
  });

  return {
    code: created.code,
    kind,
    payload: qrPayload(created.code),
    expiresAtMs: created.expiresAt.getTime(),
    ttlSec: TOKEN_TTL_SEC,
  };
}

/* ───────────────── ฝั่งนิสิต: แลกรหัสเป็นการเช็กอิน ───────────────── */

/** รับได้ทั้งข้อความเต็มจาก QR และรหัสที่พิมพ์มือ — ตัวสแกนกับช่องกรอกจึงใช้เส้นเดียวกันได้ */
export function normalizeScannedCode(raw: string): string {
  const trimmed = String(raw ?? '').trim();
  const body = trimmed.startsWith('NUV1:') ? trimmed.slice('NUV1:'.length) : trimmed;
  return body.trim().toUpperCase();
}

/** ระยะทางระหว่างสองพิกัดเป็นเมตร (haversine) — พอสำหรับรัศมีระดับร้อยเมตร */
function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type ScanGeo = { lat: number; lng: number } | null;

export type CheckinResult = {
  kind: CheckinKind;
  registrationId: string;
  activityId: string;
  activityTitle: string;
  atMs: number;
  outOfRange: boolean;
  /** ชั่วโมงที่คำนวณได้จากช่วงเช็กอิน–เช็กเอาต์ (ยังไม่ใช่ชั่วโมงที่รับรอง) */
  hoursComputed: number;
};

/**
 * แลกรหัสจาก QR เป็นการเช็กอินหรือเช็กเอาต์ของนิสิตคนที่เรียกเข้ามา
 *
 * รหัสบอกทั้งกิจกรรมและทิศทาง (เข้า/ออก) อยู่แล้ว ฝั่งนิสิตจึงไม่ต้องส่ง activityId มาเอง
 * ถ้าให้ส่งมาได้ จะมีช่องให้ยิงเช็กอินกิจกรรมที่ไม่ได้อยู่ตรงหน้า
 *
 * พิกัดเป็นของแถม ไม่ใช่ประตู — ปฏิเสธคนที่ปิด GPS ไม่ได้ เพราะบางเครื่องหาพิกัดในอาคารไม่เจอ
 * ที่อยู่นอกรัศมีจึงถูกทำเครื่องหมายไว้ให้ผู้จัดตัดสินใจเอง ไม่ได้บล็อกทันที
 */
export async function redeemCheckinCode(
  user: User,
  rawCode: string,
  geo: ScanGeo,
): Promise<CheckinResult> {
  const code = normalizeScannedCode(rawCode);
  if (!code) fail('VALIDATION_ERROR', 'ไม่พบรหัสจาก QR กรุณาสแกนใหม่');

  const token = await prisma.checkinToken.findUnique({
    where: { code },
    include: { activity: { select: { id: true, title: true, hours: true, lat: true, lng: true, geoRadiusM: true } } },
  });
  if (!token) fail('NOT_FOUND', 'รหัสนี้ใช้ไม่ได้ กรุณาสแกน QR ที่ผู้จัดแสดงอยู่');
  if (token.expiresAt.getTime() <= Date.now()) {
    fail('VALIDATION_ERROR', 'รหัสนี้หมดอายุแล้ว กรุณาสแกน QR ที่จออีกครั้ง');
  }

  const tokenKind = isCheckinKind(token.kind) ? token.kind : 'in';
  const activity = token.activity;

  const registration = await prisma.registration.findUnique({
    where: { userId_activityId: { userId: user.id, activityId: activity.id } },
  });
  if (!registration) fail('FORBIDDEN', 'คุณยังไม่ได้ลงทะเบียนกิจกรรมนี้');

  const now = new Date();

  // นอกรัศมีถือว่า "น่าสงสัย" ไม่ใช่ "ไม่ผ่าน" — และไม่มีพิกัดก็ไม่นับว่านอกรัศมี
  const outOfRange =
    geo != null && activity.lat != null && activity.lng != null
      ? distanceMeters(geo.lat, geo.lng, activity.lat, activity.lng) > activity.geoRadiusM
      : false;

  /**
   * รหัสแบบ auto ตัดสินทิศทางจากสถานะของคนสแกน ณ ตอนนั้น
   * ยังไม่เช็กอิน = เข้า, เช็กอินแล้ว = ออก, นอกนั้นปล่อยให้ตกไปเจอข้อความปฏิเสธตามปกติ
   */
  const kind: CheckinKind =
    tokenKind === 'auto' ? (registration.status === CAN_CHECK_OUT ? 'out' : 'in') : tokenKind;

  if (kind === 'in') {
    if (registration.status === CAN_CHECK_OUT) {
      fail('ALREADY_CHECKED_IN');
    }
    // จบรอบไปแล้ว — ต้องไม่ตกไปเจอข้อความ "ยังไม่ได้รับอนุมัติ" ซึ่งอ่านแล้วเข้าใจผิดว่าใบสมัครมีปัญหา
    if (DONE_STATUSES.includes(registration.status)) {
      fail('ALREADY_CHECKED_OUT');
    }
    if (registration.status !== CAN_CHECK_IN) {
      fail('VALIDATION_ERROR', 'ใบลงทะเบียนของคุณยังไม่ได้รับอนุมัติให้เข้าร่วม');
    }

    const updated = await prisma.registration.update({
      where: { id: registration.id },
      data: {
        status: 'checked-in',
        checkedInAt: now,
        checkinLat: geo?.lat ?? null,
        checkinLng: geo?.lng ?? null,
        checkinOutOfRange: outOfRange,
      },
      select: { id: true, hoursComputed: true },
    });

    publishScan(activity.id, updated.id, 'in', user, outOfRange, now);
    return {
      kind,
      registrationId: updated.id,
      activityId: activity.id,
      activityTitle: activity.title,
      atMs: now.getTime(),
      outOfRange,
      hoursComputed: updated.hoursComputed,
    };
  }

  if (registration.status !== CAN_CHECK_OUT) {
    fail('VALIDATION_ERROR', 'ต้องเช็กอินก่อนจึงจะเช็กเอาต์ได้');
  }

  // ชั่วโมงจากเวลาที่อยู่จริง แต่ไม่เกินที่กิจกรรมประกาศไว้ — ผู้จัดปรับได้อีกทีตอนรับรอง
  const inAt = registration.checkedInAt ?? now;
  const rawHours = (now.getTime() - inAt.getTime()) / 3_600_000;
  const hoursComputed = round1(Math.min(Math.max(rawHours, 0), activity.hours));

  const updated = await prisma.registration.update({
    where: { id: registration.id },
    data: { status: 'checked-out', checkedOutAt: now, hoursComputed },
    select: { id: true, hoursComputed: true },
  });

  publishScan(activity.id, updated.id, 'out', user, outOfRange, now);
  return {
    kind,
    registrationId: updated.id,
    activityId: activity.id,
    activityTitle: activity.title,
    atMs: now.getTime(),
    outOfRange,
    hoursComputed: updated.hoursComputed,
  };
}

/**
 * ผู้จัดกดเช็กอิน/เช็กเอาต์ให้นิสิตเอง จากหน้ารายชื่อผู้เข้าร่วม
 *
 * ทางสำรองของการสแกน QR ซึ่งพังได้หลายแบบหน้างาน — เครื่องนิสิตแบตหมด กล้องอ่านไม่ติด
 * เน็ตในพื้นที่ล่ม หรือนิสิตไม่ได้พกโทรศัพท์มา ถ้าไม่มีทางนี้ คนที่มาจริงจะไม่มีเวลาเข้า–ออก
 * และเสียชั่วโมงไปทั้งที่มาร่วมกิจกรรม
 *
 * ใช้เงื่อนไขสถานะและสูตรชั่วโมงชุดเดียวกับการสแกนจริง ข้อมูลที่ได้จึงเหมือนกันทุกประการ
 * ต่างกันแค่ไม่มีพิกัด — คนกดคือผู้จัดที่อยู่หน้างาน ไม่ใช่เครื่องของนิสิต จึงไม่มีอะไรให้ตรวจรัศมี
 */
export async function manualCheckin(
  staff: User,
  registrationId: string,
  kind: 'in' | 'out',
): Promise<CheckinResult> {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: {
      user: true,
      activity: { select: { id: true, title: true, hours: true } },
    },
  });
  if (!registration) fail('NOT_FOUND');

  // ผู้จัดแตะได้เฉพาะกิจกรรมของตัวเอง — ตรวจก่อนเปลี่ยนสถานะใบของนิสิต
  await requireOwnedActivity(staff, registration.activityId);

  const activity = registration.activity;
  const now = new Date();

  if (kind === 'in') {
    if (registration.status === CAN_CHECK_OUT) fail('ALREADY_CHECKED_IN');
    if (DONE_STATUSES.includes(registration.status)) fail('ALREADY_CHECKED_OUT');
    if (registration.status !== CAN_CHECK_IN) {
      fail('VALIDATION_ERROR', 'ใบลงทะเบียนนี้ยังไม่ได้รับอนุมัติให้เข้าร่วม');
    }

    const updated = await prisma.registration.update({
      where: { id: registration.id },
      data: { status: 'checked-in', checkedInAt: now },
      select: { id: true, hoursComputed: true },
    });

    // จอที่เปิดหน้าสแกนค้างไว้ต้องเห็นคนที่ผู้จัดกดเข้าให้ด้วย ไม่ใช่เฉพาะคนที่สแกนเอง
    publishScan(activity.id, updated.id, 'in', registration.user, false, now);
    return {
      kind,
      registrationId: updated.id,
      activityId: activity.id,
      activityTitle: activity.title,
      atMs: now.getTime(),
      outOfRange: false,
      hoursComputed: updated.hoursComputed,
    };
  }

  if (registration.status !== CAN_CHECK_OUT) {
    fail('VALIDATION_ERROR', 'ต้องเช็กอินก่อนจึงจะเช็กเอาต์ได้');
  }

  const inAt = registration.checkedInAt ?? now;
  const rawHours = (now.getTime() - inAt.getTime()) / 3_600_000;
  const hoursComputed = round1(Math.min(Math.max(rawHours, 0), activity.hours));

  const updated = await prisma.registration.update({
    where: { id: registration.id },
    data: { status: 'checked-out', checkedOutAt: now, hoursComputed },
    select: { id: true, hoursComputed: true },
  });

  publishScan(activity.id, updated.id, 'out', registration.user, false, now);
  return {
    kind,
    registrationId: updated.id,
    activityId: activity.id,
    activityTitle: activity.title,
    atMs: now.getTime(),
    outOfRange: false,
    hoursComputed: updated.hoursComputed,
  };
}

function publishScan(
  activityId: string,
  registrationId: string,
  /** การสแกนจริงลงเอยที่เข้าหรือออกเสมอ — 'auto' ถูกแปลงไปแล้วก่อนถึงตรงนี้ */
  kind: 'in' | 'out',
  user: User,
  outOfRange: boolean,
  at: Date,
) {
  publishCheckin({
    type: 'checkin',
    activityId,
    registrationId,
    kind,
    studentName: user.name,
    studentId: user.studentId ?? '',
    avatarUrl: user.avatarUrl,
    outOfRange,
    at: at.getTime(),
  });
}
