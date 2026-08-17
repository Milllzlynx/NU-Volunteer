import type { Metadata } from 'next';
import { AdminLogs, type SystemLogRow } from '@/components/admin/AdminLogs';
import { dayKeyOf } from '@/lib/activities';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const metadata: Metadata = { title: 'System Log · NU Volunteer' };

/**
 * จำนวนแถวที่ดึงมาให้หน้าเดียว
 *
 * ตัวกรองทั้งหมดทำงานฝั่งไคลเอนต์ จึงต้องมีเพดานไว้ ไม่งั้นวันหนึ่งที่บันทึกสะสมเป็นแสนแถว
 * หน้านี้จะดึงมาทั้งหมดแล้วค้าง — ตัดที่รายการล่าสุดเท่านี้ และบอกผู้ใช้บนหน้าเมื่อชนเพดาน
 */
const LOG_CAP = 500;

/** meta เก็บเป็น JSON — แปลงเป็นข้อความอ่านได้ก่อนส่งลงหน้า ข้อมูลเสียหายต้องไม่ทำให้ทั้งหน้าพัง */
function metaText(raw: string): string {
  try {
    const parsed: unknown = JSON.parse(raw || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return '';
    const entries = Object.entries(parsed as Record<string, unknown>).filter(
      ([, v]) => v !== null && v !== '' && v !== undefined,
    );
    if (!entries.length) return '';
    return entries.map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`).join(' · ');
  } catch {
    return '';
  }
}

/**
 * บันทึกการทำงานของระบบ
 *
 * requireAdmin ซ้ำกับที่ layout ตรวจไว้แล้ว แต่หน้าเซิร์ฟเวอร์แต่ละหน้าต้องยืนได้ด้วยตัวเอง
 * หน้านี้เปิดเผยอีเมลผู้ใช้และการกระทำของทุกคนในระบบ จะฝากไว้กับ layout ไม่ได้
 */
export default async function AdminLogsPage() {
  await requireAdmin();

  const logRows = await prisma.systemLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: LOG_CAP,
    include: { actor: { select: { name: true, email: true } } },
  });

  const rows: SystemLogRow[] = logRows.map((l) => ({
    id: l.id,
    level: l.level,
    text: l.text,
    actor: l.actor ? l.actor.name || l.actor.email : null,
    atMs: l.createdAt.getTime(),
    dayKey: dayKeyOf(l.createdAt),
    meta: metaText(l.meta),
  }));

  return <AdminLogs rows={rows} cap={LOG_CAP} />;
}
