/**
 * ระบบแจ้งเตือนอัตโนมัติ — คำนวณจากข้อมูลจริงตอนเปิดหน้า ไม่ต้องมีตัวตั้งเวลา
 *
 * ทำไมถึงคำนวณสด: การเตือน "อีก 3 วันจะถึงกิจกรรม" เปลี่ยนไปทุกวัน ถ้าเขียนเป็นแถวไว้ล่วงหน้า
 * จะเพี้ยนทันทีที่ผู้ใช้ยกเลิกการลงทะเบียนหรือผู้จัดเลื่อนวัน การคำนวณสดจึงถูกต้องเสมอ
 * และไม่มีทางแจ้งซ้ำ
 *
 * แต่ยังเผื่อทางไว้ให้ยิง cron ได้ด้วย — materializeAlerts() เขียนผลลัพธ์ชุดเดียวกัน
 * ลงตาราง Notification (กันซ้ำด้วย userId+type+title) เผื่อวันหนึ่งต้องส่งอีเมลจริง
 */
import { DEFAULT_HOURS_GOAL, HOURS_GOAL_KEY, academicYearOf, type AcademicYear } from '@/lib/academic';
import { DATE_TH, JOINED } from '@/lib/activities';
import { prisma } from '@/lib/db';

export type AlertKind = 'activity-reminder' | 'deadline' | 'loan-hours-gap';
export type AlertSeverity = 'info' | 'warning' | 'danger';

export type DerivedAlert = {
  /** คีย์เสถียรของการเตือนหนึ่งอัน — ใช้เป็น key ของ React และกันซ้ำตอน materialize */
  key: string;
  kind: AlertKind;
  /** ตรงกับ Notification.type เพื่อให้ตัวกรองบนหน้าใช้ร่วมกันได้ */
  type: string;
  title: string;
  body: string;
  link: string | null;
  severity: AlertSeverity;
  daysLeft: number;
  /** เวลาที่เกี่ยวข้อง ใช้เรียงลำดับเท่านั้น */
  atMs: number;
};

export type NotifyPrefs = {
  activityReminder: boolean;
  deadlineReminder: boolean;
  systemNotice: boolean;
  chatMessage: boolean;
  loanHoursReminder: boolean;
  leadDays: number;
  emailEnabled: boolean;
};

/** ค่าเริ่มต้นเมื่อผู้ใช้ยังไม่เคยตั้งค่า — เปิดทุกอย่างไว้ก่อน เตือนล่วงหน้า 3 วัน */
export const DEFAULT_PREFS: NotifyPrefs = {
  activityReminder: true,
  deadlineReminder: true,
  systemNotice: true,
  chatMessage: true,
  loanHoursReminder: true,
  leadDays: 3,
  emailEnabled: false,
};

export const LEAD_DAYS_MIN = 1;
export const LEAD_DAYS_MAX = 14;

export const clampLeadDays = (n: number) =>
  Math.min(LEAD_DAYS_MAX, Math.max(LEAD_DAYS_MIN, Math.round(n) || DEFAULT_PREFS.leadDays));

export async function getPrefs(userId: string): Promise<NotifyPrefs> {
  const row = await prisma.notificationPreference.findUnique({ where: { userId } });
  if (!row) return DEFAULT_PREFS;
  return {
    activityReminder: row.activityReminder,
    deadlineReminder: row.deadlineReminder,
    systemNotice: row.systemNotice,
    chatMessage: row.chatMessage,
    loanHoursReminder: row.loanHoursReminder,
    leadDays: clampLeadDays(row.leadDays),
    emailEnabled: row.emailEnabled,
  };
}

const DAY_MS = 86_400_000;

/** จำนวนวันเต็มจากตอนนี้ถึงเวลาที่กำหนด (ปัดขึ้น) — 0 = ภายในวันนี้ */
function daysUntil(target: Date, now: number): number {
  return Math.max(0, Math.ceil((target.getTime() - now) / DAY_MS));
}

function severityOf(daysLeft: number): AlertSeverity {
  if (daysLeft <= 1) return 'danger';
  if (daysLeft <= 3) return 'warning';
  return 'info';
}

/**
 * สร้างรายการเตือนของผู้ใช้คนหนึ่ง
 *
 * เตือน 3 แบบ:
 *   1. กิจกรรมที่ลงทะเบียนไว้และกำลังจะถึง (นับเฉพาะใบที่ยังมีผล ไม่เอาที่ยกเลิก/ถูกปฏิเสธ)
 *   2. กิจกรรมที่กดถูกใจไว้แต่ยังไม่ได้สมัคร และใกล้ปิดรับสมัครแล้ว
 *   3. ผู้กู้ยืม กยศ. ที่ชั่วโมงของปีการศึกษาตามหลังเกณฑ์ (ดู loanHoursAlert)
 */
export async function deriveAlerts(userId: string, prefs?: NotifyPrefs): Promise<DerivedAlert[]> {
  const p = prefs ?? (await getPrefs(userId));
  const now = Date.now();
  const horizon = new Date(now + p.leadDays * DAY_MS);
  const alerts: DerivedAlert[] = [];

  if (p.activityReminder) {
    const upcoming = await prisma.registration.findMany({
      where: {
        userId,
        // ใบที่ยังมีผลเท่านั้น — ยกเลิก/ถูกปฏิเสธ/ไม่มาตามนัด ไม่ต้องเตือน
        status: { in: ['pending', ...JOINED] },
        activity: { startAt: { gte: new Date(now), lte: horizon }, status: { notIn: ['cancelled', 'draft'] } },
      },
      include: { activity: { select: { id: true, title: true, startAt: true, location: true } } },
    });

    for (const r of upcoming) {
      const daysLeft = daysUntil(r.activity.startAt, now);
      alerts.push({
        key: `reminder:${r.id}`,
        kind: 'activity-reminder',
        type: 'reminder',
        // หัวข้อต้องคงที่ (ไม่ใส่จำนวนวัน) เพราะใช้กันซ้ำตอนเขียนลงตาราง
        title: `ใกล้ถึงวันกิจกรรม: ${r.activity.title}`,
        body:
          daysLeft === 0
            ? `กิจกรรมจัดวันนี้ ที่ ${r.activity.location || '—'} อย่าลืมเช็กอิน`
            : `อีก ${daysLeft} วันจะถึงวันกิจกรรม (${DATE_TH.format(r.activity.startAt)}) ที่ ${r.activity.location || '—'}`,
        link: '/student/registrations',
        severity: severityOf(daysLeft),
        daysLeft,
        atMs: r.activity.startAt.getTime(),
      });
    }
  }

  if (p.deadlineReminder) {
    const favorites = await prisma.favorite.findMany({
      where: {
        userId,
        activity: {
          status: 'open',
          regCloseAt: { gte: new Date(now), lte: horizon },
          // ที่สมัครไปแล้วไม่ต้องเตือนเรื่องปิดรับสมัคร
          registrations: { none: { userId } },
        },
      },
      include: { activity: { select: { id: true, title: true, regCloseAt: true } } },
    });

    for (const f of favorites) {
      if (!f.activity.regCloseAt) continue;
      const daysLeft = daysUntil(f.activity.regCloseAt, now);
      alerts.push({
        key: `deadline:${f.activityId}`,
        kind: 'deadline',
        type: 'reminder',
        title: `ใกล้ปิดรับสมัคร: ${f.activity.title}`,
        body:
          daysLeft === 0
            ? 'ปิดรับสมัครวันนี้ — กิจกรรมที่คุณกดถูกใจไว้'
            : `เหลืออีก ${daysLeft} วันจะปิดรับสมัคร (${DATE_TH.format(f.activity.regCloseAt)})`,
        link: '/student/discover',
        severity: severityOf(daysLeft),
        daysLeft,
        atMs: f.activity.regCloseAt.getTime(),
      });
    }
  }

  if (p.loanHoursReminder) {
    const gap = await loanHoursAlert(userId, now);
    if (gap) alerts.push(gap);
  }

  // ใกล้ถึงกำหนดขึ้นก่อน
  return alerts.sort((a, b) => a.atMs - b.atMs);
}

/** ผ่อนให้ช้ากว่าจังหวะปกติได้ 25% ก่อนเริ่มเตือน — กันไม่ให้ตามจี้ตั้งแต่ต้นปีการศึกษา */
const LOAN_PACE_SLACK = 1.25;
/** ช่วงท้ายปีการศึกษาที่ขาดเท่าไหร่ก็เตือน เพราะเหลือเวลาน้อยจนเกณฑ์จังหวะแทบไม่ผ่อนให้แล้ว */
const LOAN_FINAL_DAYS = 60;

export type LoanGap = { remaining: number; daysLeft: number; severity: AlertSeverity };

/**
 * ตัดสินว่าผู้กู้ยืม กยศ. ควรถูกเตือนเรื่องชั่วโมงหรือไม่ — คืน null ถ้ายังไม่ต้องเตือน
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

  const remaining = Math.round(Math.max(0, goal - total) * 10) / 10;
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
 * เตือนผู้กู้ยืม กยศ. ที่ชั่วโมงของปีการศึกษาปัจจุบันตามหลังเกณฑ์ (ดูกติกาที่ loanGap)
 *
 * นับชั่วโมงแบบเดียวกับแถบความคืบหน้าบนหน้าแรกนิสิต (ชั่วโมงที่รับรองในปีนี้ + รายการปรับชั่วโมงของปีนี้)
 */
async function loanHoursAlert(userId: string, now: number): Promise<DerivedAlert | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { loanStatus: true } });
  if (user?.loanStatus !== 'yes') return null;

  const ay = academicYearOf(new Date(now));
  if (now >= ay.end.getTime()) return null;

  const [goalSetting, awarded, adjustments] = await Promise.all([
    prisma.setting.findUnique({ where: { key: HOURS_GOAL_KEY } }),
    prisma.registration.aggregate({
      where: { userId, hoursApprovedAt: { gte: ay.start, lt: ay.end } },
      _sum: { hoursAwarded: true },
    }),
    prisma.hourAdjustment.aggregate({
      where: { userId, academicYear: ay.year },
      _sum: { hours: true },
    }),
  ]);

  const goal = Number(goalSetting?.value) || DEFAULT_HOURS_GOAL;
  const total = (awarded._sum.hoursAwarded ?? 0) + (adjustments._sum.hours ?? 0);
  const gap = loanGap(total, goal, ay, now);
  if (!gap) return null;

  const lastDay = new Date(ay.end.getTime() - DAY_MS);
  return {
    key: `loan-hours:${ay.year}`,
    kind: 'loan-hours-gap',
    type: 'reminder',
    // หัวข้อคงที่ตลอดทั้งปีการศึกษา — ไม่ใส่จำนวนชั่วโมง ไม่งั้น materialize จะงอกแถวใหม่ทุกครั้งที่ได้ชั่วโมงเพิ่ม
    title: `ชั่วโมงจิตอาสา กยศ. ปีการศึกษา ${ay.year} ยังไม่ครบเกณฑ์`,
    body: `ยังขาดอีก ${gap.remaining} ชม. จากเกณฑ์ ${goal} ชม. — เหลือเวลาอีก ${gap.daysLeft} วัน (ถึง ${DATE_TH.format(lastDay)})`,
    link: '/student/discover',
    severity: gap.severity,
    daysLeft: gap.daysLeft,
    atMs: ay.end.getTime(),
  };
}

/**
 * เขียนรายการเตือนลงตาราง Notification — สำหรับให้ cron เรียกในอนาคต
 *
 * Notification ไม่มีคีย์ไม่ซ้ำให้ upsert จึงกันซ้ำด้วย userId+type+title เหมือนที่ seed ทำ
 * (หัวข้อของแต่ละการเตือนถูกออกแบบให้คงที่ ไม่มีจำนวนวันปนอยู่ จึงไม่งอกใหม่ทุกวัน)
 *
 * คืนจำนวนแถวที่เพิ่มจริง
 */
export async function materializeAlerts(userId: string): Promise<number> {
  const alerts = await deriveAlerts(userId);
  let created = 0;

  for (const a of alerts) {
    const exists = await prisma.notification.findFirst({
      where: { userId, type: a.type, title: a.title },
      select: { id: true },
    });
    if (exists) continue;
    await prisma.notification.create({
      data: { userId, type: a.type, title: a.title, body: a.body, link: a.link, read: false },
    });
    created++;
  }
  return created;
}
