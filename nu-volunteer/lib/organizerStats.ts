/**
 * ตัวเลขรวมของกิจกรรมฝั่งผู้จัด — ใช้ร่วมกันระหว่างหน้าสถิติและหน้ารายงาน
 *
 * ทั้งสองหน้าตอบคำถามคนละแบบ (หน้าสถิติคือ "ภาพรวมเป็นอย่างไร" หน้ารายงานคือ
 * "ขอตัวเลขรายกิจกรรมไปส่งต่อ") แต่ตั้งอยู่บนตัวเลขชุดเดียวกัน ถ้าแยกกันคำนวณ
 * สองหน้าจะเริ่มไม่ตรงกันทันทีที่นิยามของ "ผู้เข้าร่วม" ถูกแก้ที่เดียว
 *
 * ไฟล์นี้ต้องไม่ import prisma หรืออะไรที่ลากฝั่งเซิร์ฟเวอร์เข้ามา — คอมโพเนนต์ฝั่ง
 * ไคลเอนต์ import summarize() ไปใช้คำนวณยอดรวมใหม่ทุกครั้งที่ผู้ใช้เปลี่ยนตัวกรอง
 * ตัวคำสั่งอ่านฐานข้อมูลอยู่ที่ loadActivityReport() ใน lib/organizer.ts แทน
 */

/** สถานะที่ถือว่ามาร่วมงานจริง — ผ่านการเช็กอินมาแล้วอย่างน้อยหนึ่งครั้ง */
export const ATTENDED = ['checked-in', 'checked-out', 'completed'];

/** ปัดทศนิยมหนึ่งตำแหน่ง — ชั่วโมงเป็น Float การบวกกันตรง ๆ ทำให้ได้ 12.000000000000002 */
export const round1 = (n: number) => Math.round(n * 10) / 10;

export type ActivityReportRow = {
  id: string;
  title: string;
  orgName: string;
  status: string;
  categoryId: string;
  categoryLabel: string;
  categoryLabelEn: string;
  categoryColor: string;
  /** คีย์วันที่เริ่มกิจกรรมตามเวลาไทย (YYYY-MM-DD) — ใช้กรองช่วงวันและจัดกลุ่มรายเดือน */
  dayKey: string;
  dateTh: string;
  dateEn: string;
  time: string;
  /** true = กิจกรรมจบไปแล้ว ณ เวลาที่เรนเดอร์ */
  past: boolean;

  hours: number;
  seatsTotal: number;

  /** ใบลงทะเบียนทั้งหมดที่เคยเข้ามา รวมใบที่ถูกปฏิเสธและยกเลิก */
  registered: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
  noShow: number;
  /** เช็กอินแล้วอย่างน้อยหนึ่งครั้ง (checked-in + checked-out + completed) */
  attended: number;
  /** รับรองชั่วโมงเรียบร้อยแล้ว */
  completed: number;

  hoursAwarded: number;
  reviewCount: number;
  /** null = ยังไม่มีใครรีวิว ต่างจาก 0 ดาวซึ่งเป็นไปไม่ได้ (ต่ำสุดคือ 1) */
  ratingAvg: number | null;
};

export type OrganizerTotals = {
  activities: number;
  open: number;
  past: number;
  registered: number;
  attended: number;
  completed: number;
  hoursAwarded: number;
  reviewCount: number;
  ratingAvg: number | null;
  /** ที่นั่งที่ถูกจองจริงเทียบกับที่นั่งที่ประกาศไว้ (%) — นับเฉพาะกิจกรรมที่จำกัดที่นั่ง */
  fillRate: number | null;
  /** มาจริงกี่ % ของใบที่อนุมัติไปแล้ว — ตัวชี้วัดว่าจองแล้วเบี้ยวมากแค่ไหน */
  turnoutRate: number | null;
};

/**
 * ยอดรวมของชุดกิจกรรมที่ส่งเข้ามา — คำนวณจากแถวที่ผ่านตัวกรองแล้ว
 * ไม่ใช่จากฐานข้อมูลทั้งก้อน ตัวเลขสรุปจึงขยับตามตัวกรองที่ผู้ใช้เลือกเสมอ
 */
export function summarize(rows: ActivityReportRow[]): OrganizerTotals {
  const seated = rows.filter((r) => r.seatsTotal > 0);
  const seatsTotal = seated.reduce((s, r) => s + r.seatsTotal, 0);
  /* ที่นั่งที่ถูกจอง = ใบที่ยังกินที่นั่งอยู่ ไม่ใช่ใบทั้งหมดที่เคยเข้ามา */
  const seatsTaken = seated.reduce((s, r) => s + r.pending + r.approved + r.attended, 0);

  const approvedEver = rows.reduce((s, r) => s + r.approved + r.attended, 0);
  const attended = rows.reduce((s, r) => s + r.attended, 0);

  /* คะแนนเฉลี่ยรวมต้องถ่วงน้ำหนักด้วยจำนวนรีวิว ไม่ใช่เฉลี่ยของค่าเฉลี่ย
     ไม่งั้นกิจกรรมที่มีรีวิวเดียวจะมีน้ำหนักเท่ากิจกรรมที่มีร้อยรีวิว */
  const reviewCount = rows.reduce((s, r) => s + r.reviewCount, 0);
  const starSum = rows.reduce((s, r) => s + (r.ratingAvg ?? 0) * r.reviewCount, 0);

  return {
    activities: rows.length,
    open: rows.filter((r) => r.status === 'open').length,
    past: rows.filter((r) => r.past).length,
    registered: rows.reduce((s, r) => s + r.registered, 0),
    attended,
    completed: rows.reduce((s, r) => s + r.completed, 0),
    hoursAwarded: round1(rows.reduce((s, r) => s + r.hoursAwarded, 0)),
    reviewCount,
    ratingAvg: reviewCount > 0 ? Math.round((starSum / reviewCount) * 10) / 10 : null,
    fillRate: seatsTotal > 0 ? Math.round((seatsTaken / seatsTotal) * 100) : null,
    turnoutRate: approvedEver > 0 ? Math.round((attended / approvedEver) * 100) : null,
  };
}
