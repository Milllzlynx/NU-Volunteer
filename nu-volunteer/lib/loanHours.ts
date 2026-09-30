/**
 * ความคืบหน้าชั่วโมงจิตอาสาของผู้กู้ยืม กยศ. — ที่เดียวที่คำนวณยอดของปีการศึกษาและจังหวะ
 *
 * หน้าแรกนิสิต หน้าชั่วโมงสะสม และการเตือน loan-hours-gap ต้องเห็นตัวเลขกับระดับความเร่งด่วนตรงกัน
 * จึงใช้ loanYearStatus() ร่วมกันแทนที่จะต่างคนต่างรวมเอง
 *
 * ยอดของปี = ชั่วโมงที่ผู้จัดรับรองภายในช่วงนับ (1 พ.ค.–31 มี.ค.) + รายการปรับชั่วโมงของปีนั้น
 *
 * ทดสอบสถานะในอนาคตได้ด้วย NUV_DEV_NOW (ดู loanNow) — มีผลเฉพาะตอน dev และเฉพาะการคำนวณ กยศ. ในไฟล์นี้
 */
import { DEFAULT_HOURS_GOAL, HOURS_GOAL_KEY, academicYearOf, type AcademicYear } from '@/lib/academic';
import type { AlertSeverity } from '@/lib/alerts';
import { prisma } from '@/lib/db';

const DAY_MS = 86_400_000;

/** ผ่อนให้ช้ากว่าจังหวะปกติได้ 25% ก่อนเริ่มเตือน — กันไม่ให้ตามจี้ตั้งแต่ต้นปีการศึกษา */
const LOAN_PACE_SLACK = 1.25;
/** ช่วงท้ายปีการศึกษาที่ขาดเท่าไหร่ก็เตือน เพราะเหลือเวลาน้อยจนเกณฑ์จังหวะแทบไม่ผ่อนให้แล้ว */
const LOAN_FINAL_DAYS = 60;

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * "ตอนนี้" ของการคำนวณ กยศ. — ตั้ง NUV_DEV_NOW ใน .env เพื่อดูหน้าและการเตือนเหมือนเป็นวันอื่น
 *
 *   NUV_DEV_NOW=2026-12-15            # ระดับ warning ของบัญชีที่ชั่วโมงน้อย
 *   NUV_DEV_NOW=2027-03-15T09:00+07:00  # ระดับ danger
 *
 * มีเพราะระดับ warning/danger ขึ้นกับวันที่ล้วน ๆ (warning ต้องผ่านครึ่งปีการศึกษาไปแล้ว danger เหลือไม่เกิน 30 วัน)
 * จะดูล่วงหน้าได้ก็ต้องเลื่อนวันของการคำนวณ ไม่ใช่แก้ข้อมูล
 *
 * ไม่มีผลใน production เด็ดขาด และไม่แตะส่วนอื่นของระบบ (วันกิจกรรม การเตือนอื่น ยอดชั่วโมงทั่วไป)
 * วันที่ไม่ถูกรูปแบบถูกเมินเฉยแล้วใช้เวลาจริง
 */
export function loanNow(): number {
  const raw = process.env.NUV_DEV_NOW;
  if (!raw || process.env.NODE_ENV === 'production') return Date.now();
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : Date.now();
}

/** จำนวนวันเต็มจากตอนนี้ถึงเวลาที่กำหนด (ปัดขึ้น) — 0 = ภายในวันนี้ */
const daysUntil = (target: Date, now: number) => Math.max(0, Math.ceil((target.getTime() - now) / DAY_MS));

export type LoanGap = { remaining: number; daysLeft: number; severity: AlertSeverity };

/**
 * ตัดสินว่าผู้กู้ยืม กยศ. ตามหลังเกณฑ์จนควรถูกเตือนหรือไม่ — คืน null ถ้ายังไม่ต้องเตือน
 *
 * ให้ G = เกณฑ์ชั่วโมง, f = สัดส่วนของช่วงนับ (1 พ.ค.–31 มี.ค.) ที่ผ่านไปแล้ว, remaining = ชั่วโมงที่ยังขาด
 * เตือนเมื่อ
 *   - remaining > 1.25 × G × (1 − f)  คือต้องเร่งเร็วกว่าจังหวะปกติเกิน 1.25 เท่า
 *     คนที่ยังไม่มีชั่วโมงเลยจะเริ่มเห็นราวต้น ก.ค. (f ≈ 0.2) ไม่ใช่สัปดาห์แรกของปี
 *   - หรือเหลือไม่เกิน 60 วันและยังขาดอยู่
 * เดือนเมษายนปิดนับไปแล้ว ทำอะไรเพิ่มไม่ได้ จึงไม่เตือน
 */
export function loanGap(total: number, goal: number, ay: AcademicYear, now: number): LoanGap | null {
  if (now < ay.start.getTime() || now >= ay.end.getTime()) return null;

  const remaining = round1(Math.max(0, goal - total));
  if (remaining <= 0) return null;

  const span = ay.end.getTime() - ay.start.getTime();
  const left = 1 - (now - ay.start.getTime()) / span;
  const daysLeft = daysUntil(ay.end, now);

  const behindPace = remaining > LOAN_PACE_SLACK * goal * left;
  const finalStretch = daysLeft <= LOAN_FINAL_DAYS;
  if (!behindPace && !finalStretch) return null;

  const severity: AlertSeverity =
    daysLeft <= 30 ? 'danger' : finalStretch || remaining > 2 * goal * left ? 'warning' : 'info';
  return { remaining, daysLeft, severity };
}

/**
 * สถานะเทียบเกณฑ์ของปีการศึกษา
 *   met      ครบเกณฑ์แล้ว
 *   on-pace  ยังไม่ครบแต่ทันจังหวะ (ยังไม่ถึงขั้นเตือน)
 *   info / warning / danger  ระดับเดียวกับการเตือน loan-hours-gap
 *   closed   เดือนเมษายน — ปิดนับของปีนั้นแล้วและยังไม่ครบ
 */
export type LoanPace = 'met' | 'on-pace' | AlertSeverity | 'closed';

export type LoanYearStatus = {
  /** ปีการศึกษา พ.ศ. */
  year: number;
  startMs: number;
  /** วันสุดท้ายของช่วงนับ (31 มี.ค.) */
  lastDayMs: number;
  total: number;
  goal: number;
  remaining: number;
  pct: number;
  /** วันที่เหลือถึงสิ้นช่วงนับ — 0 เมื่อปิดนับแล้ว */
  daysLeft: number;
  counting: boolean;
  pace: LoanPace;
};

/** ยอดชั่วโมงของปีการศึกษาที่ครอบวันนั้น — ใช้ได้กับนิสิตทุกคน ไม่เฉพาะผู้กู้ยืม */
export async function yearHours(userId: string, ay: AcademicYear): Promise<number> {
  const [awarded, adjustments] = await Promise.all([
    prisma.registration.aggregate({
      where: { userId, hoursApprovedAt: { gte: ay.start, lt: ay.end } },
      _sum: { hoursAwarded: true },
    }),
    prisma.hourAdjustment.aggregate({
      where: { userId, academicYear: ay.year },
      _sum: { hours: true },
    }),
  ]);
  return round1((awarded._sum.hoursAwarded ?? 0) + (adjustments._sum.hours ?? 0));
}

export async function hoursGoal(): Promise<number> {
  const row = await prisma.setting.findUnique({ where: { key: HOURS_GOAL_KEY } });
  return Number(row?.value) || DEFAULT_HOURS_GOAL;
}

export async function loanYearStatus(userId: string, now: number = loanNow()): Promise<LoanYearStatus> {
  const ay = academicYearOf(new Date(now));
  const [total, goal] = await Promise.all([yearHours(userId, ay), hoursGoal()]);

  const remaining = round1(Math.max(0, goal - total));
  const counting = now >= ay.start.getTime() && now < ay.end.getTime();
  const gap = loanGap(total, goal, ay, now);

  const pace: LoanPace = remaining <= 0 ? 'met' : !counting ? 'closed' : gap ? gap.severity : 'on-pace';

  return {
    year: ay.year,
    startMs: ay.start.getTime(),
    lastDayMs: ay.end.getTime() - DAY_MS,
    total,
    goal,
    remaining,
    pct: goal > 0 ? Math.min(100, Math.round((total / goal) * 100)) : 0,
    daysLeft: counting ? daysUntil(ay.end, now) : 0,
    counting,
    pace,
  };
}
