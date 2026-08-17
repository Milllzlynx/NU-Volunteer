/**
 * ใบประกาศนียบัตร — การค้นหาและจัดรูปแบบที่ใช้ร่วมกัน
 *
 * ใช้ทั้งหน้าของนิสิต (/student/certificates) และหน้าตรวจสอบสาธารณะ (/verify/[ref])
 * ทั้งสองหน้าต้องแสดง "ใบเดียวกัน" จึงต้องแปลงข้อมูลจากที่เดียว ไม่อย่างนั้น
 * ใบที่นิสิตพิมพ์ออกไปกับใบที่หน่วยงานภายนอกเห็นอาจไม่ตรงกัน
 */

import { DATE_EN, DATE_TH } from '@/lib/activities';
import { prisma } from '@/lib/db';

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
  issuedAtMs: number;
  revoked: boolean;
  revokeReason: string | null;
  revokedTh: string | null;
  revokedEn: string | null;
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
    issuedAtMs: row.issuedAt.getTime(),
    revoked: row.revokedAt != null,
    revokeReason: row.revokeReason,
    revokedTh: row.revokedAt ? DATE_TH.format(row.revokedAt) : null,
    revokedEn: row.revokedAt ? DATE_EN.format(row.revokedAt) : null,
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
