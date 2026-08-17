import type { Metadata } from 'next';
import { AdminOps, type BackupRow, type EmailLogRow, type OpsData } from '@/components/admin/AdminOps';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const metadata: Metadata = { title: 'การเชื่อมต่อระบบ · NU Volunteer' };

/** อีเมลย้อนหลังที่แสดง — พอให้เห็นว่าเกิดอะไรขึ้นล่าสุด ไม่ใช่ประวัติทั้งหมด */
const EMAIL_TAKE = 12;
const BACKUP_TAKE = 6;
const SOON_DAYS = 7;

/**
 * หน้าการเชื่อมต่อระบบ
 *
 * เรนเดอร์ฝั่งเซิร์ฟเวอร์ทั้งหมด ต่างจากหน้ากล่องข้อความที่โหลดผ่าน API —
 * หน้านี้ไม่มีตัวกรองให้สลับ อ่านครั้งเดียวจบ การดึงตอนเรนเดอร์จึงเร็วกว่าและ
 * ไม่ต้องมีปลายทาง API เพิ่มสำหรับข้อมูลที่อ่านอย่างเดียว
 */
export default async function AdminOpsPage() {
  await requireAdmin();

  const now = new Date();
  const soon = new Date(now.getTime() + SOON_DAYS * 86_400_000);
  const activeSession = { revokedAt: null, expiresAt: { gt: now } };

  const [emailGroups, emailRows, backupRows, activeSessions, distinctUsers, expiringSoon] =
    await Promise.all([
      prisma.emailLog.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.emailLog.findMany({ orderBy: { createdAt: 'desc' }, take: EMAIL_TAKE }),
      prisma.backup.findMany({ orderBy: { createdAt: 'desc' }, take: BACKUP_TAKE }),
      prisma.session.count({ where: activeSession }),
      prisma.session.findMany({ where: activeSession, distinct: ['userId'], select: { userId: true } }),
      prisma.session.count({ where: { ...activeSession, expiresAt: { gt: now, lte: soon } } }),
    ]);

  const countOf = (status: string) =>
    emailGroups.find((g) => g.status === status)?._count._all ?? 0;

  const recentEmails: EmailLogRow[] = emailRows.map((m) => ({
    id: m.id,
    event: m.event,
    to: m.to,
    subject: m.subject,
    status: m.status,
    attempts: m.attempts,
    error: m.error,
    atMs: m.createdAt.getTime(),
  }));

  const backups: BackupRow[] = backupRows.map((b) => ({
    id: b.id,
    trigger: b.trigger,
    status: b.status,
    sizeMb: b.sizeMb,
    atMs: b.createdAt.getTime(),
  }));

  const data: OpsData = {
    transport: process.env.MAIL_TRANSPORT || 'console',
    mailFrom: process.env.MAIL_FROM || 'no-reply@nu.ac.th',
    emailCounts: {
      sent: countOf('sent'),
      failed: countOf('failed'),
      pending: countOf('sending') + countOf('retrying'),
      total: emailGroups.reduce((sum, g) => sum + g._count._all, 0),
    },
    recentEmails,
    backups,
    sessions: {
      active: activeSessions,
      users: distinctUsers.length,
      expiringSoon,
    },
  };

  return <AdminOps data={data} />;
}
