/**
 * ใบประกาศนียบัตร — การค้นหาและจัดรูปแบบที่ใช้ร่วมกัน
 *
 * ใช้ทั้งหน้าของนิสิต (/student/certificates) และหน้าตรวจสอบสาธารณะ (/verify/[ref])
 * ทั้งสองหน้าต้องแสดง "ใบเดียวกัน" จึงต้องแปลงข้อมูลจากที่เดียว ไม่อย่างนั้น
 * ใบที่นิสิตพิมพ์ออกไปกับใบที่หน่วยงานภายนอกเห็นอาจไม่ตรงกัน
 */

import { randomInt } from 'node:crypto';
import { academicYearOf } from '@/lib/academic';
import { DATE_EN, DATE_LONG_EN, DATE_LONG_TH, DATE_TH } from '@/lib/activities';
import { prisma } from '@/lib/db';
import { fail } from '@/lib/errors';
import { sendMail } from '@/lib/mailer';

/** ที่อยู่ของหน้าตรวจสอบสาธารณะ — พิมพ์ลงบนใบประกาศและส่งไปในอีเมล */
export function verifyPath(ref: string): string {
  return `/verify/${encodeURIComponent(ref)}`;
}

/**
 * โดเมนของระบบ — ค่าเริ่มต้นตรงกับที่ app/api/v1/auth/forgot ใช้
 * เพื่อให้ลิงก์ในอีเมลกับที่อยู่ที่พิมพ์บนใบประกาศชี้ไปที่เดียวกันเสมอ
 */
export function appBaseUrl(): string {
  return (process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

/** ที่อยู่แบบเต็มโดเมน — ใบที่พิมพ์ออกกระดาษคลิกไม่ได้ จึงต้องอ่านแล้วพิมพ์ตามได้ */
export function verifyUrl(ref: string): string {
  return `${appBaseUrl()}${verifyPath(ref)}`;
}

/** ข้อมูลบนใบประกาศ — ไม่มีอีเมล เบอร์โทร หรือที่อยู่ ตามที่ประกาศไว้ในนโยบายความเป็นส่วนตัว */
export type CertificateView = {
  id: string;
  ref: string;
  holderName: string;
  /** รหัสนิสิตแสดงเฉพาะบนใบของเจ้าของ — หน้าตรวจสอบสาธารณะไม่ส่งค่านี้ */
  studentId: string | null;
  faculty: string | null;
  activityId: string;
  activityTitle: string;
  orgName: string;
  categoryLabel: string;
  categoryLabelEn: string;
  categoryColor: string;
  hours: number;
  /** ปีการศึกษา (พ.ศ.) ที่ออกใบ — อ่านจากรหัสอ้างอิงที่ฝังไว้ตอนออกใบ */
  academicYear: number | null;
  issuedTh: string;
  issuedEn: string;
  /** วันที่ออกใบแบบเดือนเต็ม สำหรับพิมพ์บนตัวเอกสาร */
  issuedLongTh: string;
  issuedLongEn: string;
  issuedAtMs: number;
  revoked: boolean;
  revokeReason: string | null;
  revokedTh: string | null;
  revokedEn: string | null;
  revokedLongTh: string | null;
  revokedLongEn: string | null;
};

/** ฟิลด์ที่ต้อง select มาให้ครบก่อนเรียก toView() */
const include = {
  user: { select: { name: true, studentId: true, faculty: true } },
  activity: {
    select: {
      id: true,
      title: true,
      orgName: true,
      category: { select: { label: true, labelEn: true, color: true } },
    },
  },
} as const;

type Row = {
  id: string;
  ref: string;
  hours: number;
  issuedAt: Date;
  revokedAt: Date | null;
  revokeReason: string | null;
  user: { name: string; studentId: string | null; faculty: string | null };
  activity: {
    id: string;
    title: string;
    orgName: string;
    category: { label: string; labelEn: string; color: string };
  };
};

/** ดึงปีการศึกษาออกจากรหัสอ้างอิงรูปแบบ NUV-2569-XXXXX */
function yearOfRef(ref: string): number | null {
  const year = Number(ref.split('-')[1]);
  return Number.isFinite(year) ? year : null;
}

function toView(row: Row, opts: { includeIdentity: boolean }): CertificateView {
  return {
    id: row.id,
    ref: row.ref,
    holderName: row.user.name,
    studentId: opts.includeIdentity ? row.user.studentId : null,
    faculty: row.user.faculty,
    activityId: row.activity.id,
    activityTitle: row.activity.title,
    orgName: row.activity.orgName,
    categoryLabel: row.activity.category.label,
    categoryLabelEn: row.activity.category.labelEn || row.activity.category.label,
    categoryColor: row.activity.category.color,
    hours: row.hours,
    academicYear: yearOfRef(row.ref),
    issuedTh: DATE_TH.format(row.issuedAt),
    issuedEn: DATE_EN.format(row.issuedAt),
    issuedLongTh: DATE_LONG_TH.format(row.issuedAt),
    issuedLongEn: DATE_LONG_EN.format(row.issuedAt),
    issuedAtMs: row.issuedAt.getTime(),
    revoked: row.revokedAt != null,
    revokeReason: row.revokeReason,
    revokedTh: row.revokedAt ? DATE_TH.format(row.revokedAt) : null,
    revokedEn: row.revokedAt ? DATE_EN.format(row.revokedAt) : null,
    revokedLongTh: row.revokedAt ? DATE_LONG_TH.format(row.revokedAt) : null,
    revokedLongEn: row.revokedAt ? DATE_LONG_EN.format(row.revokedAt) : null,
  };
}

/** ใบประกาศทั้งหมดของนิสิตคนหนึ่ง ใบใหม่สุดขึ้นก่อน */
export async function listCertificates(userId: string): Promise<CertificateView[]> {
  const rows = await prisma.certificate.findMany({
    where: { userId },
    orderBy: { issuedAt: 'desc' },
    include,
  });
  return rows.map((r) => toView(r, { includeIdentity: true }));
}

/**
 * ค้นใบประกาศจากรหัสอ้างอิงสำหรับหน้าตรวจสอบสาธารณะ
 *
 * ตัดช่องว่างและทำเป็นตัวพิมพ์ใหญ่ก่อนค้น เพราะคนที่พิมพ์รหัสตามใบกระดาษ
 * มักพิมพ์ตัวเล็กหรือติดช่องว่างมาด้วย — ไม่ควรตอบว่า "ไม่พบ" เพราะเหตุนั้น
 * ไม่คืนรหัสนิสิต เพราะหน้านี้เปิดสาธารณะโดยไม่ต้องเข้าสู่ระบบ
 */
export async function findCertificateByRef(ref: string): Promise<CertificateView | null> {
  const normalized = ref.trim().toUpperCase();
  if (!normalized) return null;

  const row = await prisma.certificate.findUnique({ where: { ref: normalized }, include });
  return row ? toView(row, { includeIdentity: false }) : null;
}

/* ───────────────────────── ฝั่งผู้จัด: รายการ ออกใบ เพิกถอน ───────────────────────── */

/** ใบประกาศบนหน้าจัดการของผู้จัด — เพิ่มข้อมูลที่ต้องใช้ตัดสินใจว่าออกใบใหม่ได้หรือไม่ */
export type OrganizerCertificateView = CertificateView & {
  registrationId: string | null;
  avatarUrl: string | null;
  /** ใบที่ถูกเพิกถอนแต่ใบลงทะเบียนยังรับรองชั่วโมงอยู่ — กดออกใบใหม่แทนได้ */
  canReissue: boolean;
};

/** ใบประกาศทั้งหมดของกิจกรรมที่อยู่ในขอบเขต (ส่ง ownedActivityFilter มา) ใบใหม่สุดขึ้นก่อน */
export async function listOrganizerCertificates(
  activityScope: Record<string, unknown>,
): Promise<OrganizerCertificateView[]> {
  const rows = await prisma.certificate.findMany({
    where: { activity: activityScope },
    orderBy: { issuedAt: 'desc' },
    take: 1000,
    include: {
      ...include,
      user: { select: { name: true, studentId: true, faculty: true, avatarUrl: true } },
      registration: { select: { status: true, hoursApprovedAt: true, hoursAwarded: true } },
    },
  });

  return rows.map((r) => ({
    ...toView(r, { includeIdentity: true }),
    registrationId: r.registrationId,
    avatarUrl: r.user.avatarUrl,
    canReissue: r.revokedAt != null && r.registration != null && isEligible(r.registration),
  }));
}

/** ออกใบได้เมื่อรับรองชั่วโมงแล้วและได้ชั่วโมงมากกว่าศูนย์ — ไม่รับรองก็ไม่มีอะไรให้ยืนยันบนใบ */
function isEligible(r: { status: string; hoursApprovedAt: Date | null; hoursAwarded: number }) {
  return r.status === 'completed' && r.hoursApprovedAt != null && r.hoursAwarded > 0;
}

/** ตัดตัวที่อ่านสับสนออก (0/O, 1/I) เพราะคนต้องพิมพ์รหัสตามใบกระดาษ */
const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function newRef(issuedAt: Date): string {
  let code = '';
  for (let i = 0; i < 5; i++) code += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  return `NUV-${academicYearOf(issuedAt).year}-${code}`;
}

export type IssueResult = { id: string; ref: string; hours: number; created: boolean };

/**
 * ออกใบประกาศให้ใบลงทะเบียนหนึ่งใบ — เรียกซ้ำได้โดยไม่ออกใบซ้ำ
 *
 * - มีใบที่ใช้ได้และชั่วโมงตรงกันอยู่แล้ว → คืนใบเดิม (created: false)
 * - มีใบที่ใช้ได้แต่ชั่วโมงไม่ตรง (ผู้จัดรับรองชั่วโมงใหม่) → เพิกถอนใบเดิมแล้วออกใบใหม่
 *   ไม่แก้ตัวเลขบนใบเดิม เพราะใบนั้นอาจถูกพิมพ์ส่งหน่วยงานภายนอกไปแล้ว
 * - มีใบที่ถูกเพิกถอน → ออกใบใหม่แทน ใบเดิมยังเปิดตรวจสอบได้และขึ้นว่าถูกเพิกถอน
 *
 * Certificate.registrationId เป็น unique ใบเดิมจึงต้องปลดออกจากใบลงทะเบียนก่อนสร้างใบใหม่
 * ไม่ส่งการแจ้งเตือนเอง — ผู้เรียกเลือกถ้อยคำให้ตรงกับเหตุการณ์ (ดู notifyCertificateIssued)
 */
export async function issueCertificate(registrationId: string): Promise<IssueResult> {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: {
      id: true,
      userId: true,
      activityId: true,
      status: true,
      hoursApprovedAt: true,
      hoursAwarded: true,
      certificate: { select: { id: true, ref: true, hours: true, revokedAt: true } },
    },
  });
  if (!registration) fail('NOT_FOUND');
  if (!isEligible(registration)) {
    fail('VALIDATION_ERROR', 'ออกใบประกาศได้เฉพาะผู้ที่ได้รับการรับรองชั่วโมงแล้ว');
  }

  const current = registration.certificate;
  if (current && !current.revokedAt && current.hours === registration.hoursAwarded) {
    return { id: current.id, ref: current.ref, hours: current.hours, created: false };
  }

  const issuedAt = new Date();

  // รหัสสุ่ม 5 ตัวมีโอกาสชนน้อยมาก แต่ถ้าชนจริง unique constraint จะปฏิเสธ — สุ่มใหม่แล้วลองอีกครั้ง
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const created = await prisma.$transaction(async (tx) => {
        if (current) {
          await tx.certificate.update({
            where: { id: current.id },
            data: {
              registrationId: null,
              ...(current.revokedAt
                ? {}
                : {
                    revokedAt: issuedAt,
                    revokeReason: 'ออกใบใหม่แทน เนื่องจากจำนวนชั่วโมงที่รับรองเปลี่ยนไป',
                  }),
            },
          });
        }
        return tx.certificate.create({
          data: {
            ref: newRef(issuedAt),
            userId: registration.userId,
            activityId: registration.activityId,
            registrationId: registration.id,
            hours: registration.hoursAwarded,
            issuedAt,
          },
          select: { id: true, ref: true, hours: true },
        });
      });
      return { ...created, created: true };
    } catch (e) {
      const clash = (e as { code?: string }).code === 'P2002';
      if (!clash || attempt === 4) throw e;
    }
  }
  throw new Error('unreachable');
}

/**
 * เพิกถอนใบที่ยังใช้ได้ของใบลงทะเบียนหนึ่งใบ (ถ้ามี) — ใช้ตอนผู้จัดเปลี่ยนใจไม่รับรองชั่วโมง
 * คืนรหัสอ้างอิงของใบที่ถูกเพิกถอน หรือ null ถ้าไม่มีใบให้เพิกถอน
 */
export async function revokeActiveCertificate(
  registrationId: string,
  reason: string,
): Promise<string | null> {
  const cert = await prisma.certificate.findUnique({
    where: { registrationId },
    select: { id: true, ref: true, revokedAt: true },
  });
  if (!cert || cert.revokedAt) return null;

  await prisma.certificate.update({
    where: { id: cert.id },
    data: { revokedAt: new Date(), revokeReason: reason },
  });
  return cert.ref;
}

/**
 * แจ้งนิสิตว่าใบประกาศพร้อมแล้ว — การแจ้งเตือนในระบบและอีเมล
 *
 * อีเมลส่งเสมอโดยไม่ดู NotificationPreference.emailEnabled เพราะใบประกาศเป็นเอกสารสำคัญ
 * แบบเดียวกับอีเมลเรื่องรหัสผ่าน และค่านั้นยังขึ้นว่า "ยังไม่เปิดใช้งานจริง" บนหน้าตั้งค่า
 * ส่งอีเมลไม่สำเร็จต้องไม่ทำให้การออกใบล้มเหลว (sendMail บันทึกลง EmailLog ให้แล้ว)
 */
export async function notifyCertificateIssued(input: {
  userId: string;
  email: string;
  activityTitle: string;
  ref: string;
  title?: string;
  body?: string;
}) {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: 'certificate',
      title: input.title ?? `ใบประกาศพร้อมดาวน์โหลด: ${input.activityTitle}`,
      body: input.body ?? `รหัสอ้างอิง ${input.ref} ดูตัวอย่าง พิมพ์ หรือส่งให้หน่วยงานภายนอกตรวจสอบได้`,
      link: '/student/certificates',
    },
  });

  sendMail('certificate.issued', {
    to: input.email,
    vars: { activity: input.activityTitle, ref: input.ref, verifyUrl: verifyUrl(input.ref) },
  }).catch(() => {});
}
