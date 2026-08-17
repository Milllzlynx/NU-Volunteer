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
import { DATE_TH, JOINED } from '@/lib/activities';
import { prisma } from '@/lib/db';

export type AlertKind = 'activity-reminder' | 'deadline';
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
  leadDays: number;
  emailEnabled: boolean;
};

/** ค่าเริ่มต้นเมื่อผู้ใช้ยังไม่เคยตั้งค่า — เปิดทุกอย่างไว้ก่อน เตือนล่วงหน้า 3 วัน */
export const DEFAULT_PREFS: NotifyPrefs = {
  activityReminder: true,
  deadlineReminder: true,
  systemNotice: true,
  chatMessage: true,
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
 * เตือน 2 แบบ:
 *   1. กิจกรรมที่ลงทะเบียนไว้และกำลังจะถึง (นับเฉพาะใบที่ยังมีผล ไม่เอาที่ยกเลิก/ถูกปฏิเสธ)
 *   2. กิจกรรมที่กดถูกใจไว้แต่ยังไม่ได้สมัคร และใกล้ปิดรับสมัครแล้ว
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

  // ใกล้ถึงกำหนดขึ้นก่อน
  return alerts.sort((a, b) => a.atMs - b.atMs);
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
