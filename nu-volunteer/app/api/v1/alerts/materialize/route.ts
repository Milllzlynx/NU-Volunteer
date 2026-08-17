import { NextResponse } from 'next/server';
import { materializeAlerts } from '@/lib/alerts';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { systemLog } from '@/lib/db';

/**
 * POST /api/v1/alerts/materialize — เขียนการเตือนที่คำนวณได้ลงตาราง Notification
 *
 * หน้าเว็บไม่ได้เรียกเส้นนี้ (หน้าปฏิทิน/แจ้งเตือนคำนวณสดเอาเอง) มีไว้ให้ตัวตั้งเวลาเรียก
 * เมื่อวันหนึ่งต้องส่งอีเมลหรืออยากให้การเตือนค้างอยู่ในกล่องข้อความจริง ๆ
 *
 * เข้าถึงได้สองทาง:
 *   1. header `x-cron-secret` ตรงกับ env CRON_SECRET  → ทำให้ทุกคน (ใช้กับ cron)
 *   2. ผู้ใช้ที่เป็นแอดมิน                              → ทำให้ตัวเองหรือผู้ใช้ที่ระบุ
 *
 * ถ้าไม่ตั้ง CRON_SECRET ไว้ ช่องทางที่ 1 จะถูกปิดสนิท — กันเผลอเปิดเส้นนี้ทิ้งไว้บน production
 */
export const POST = handler(async (req) => {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get('x-cron-secret');
  const viaCron = Boolean(secret && provided && provided === secret);

  let targetUserIds: string[];

  if (viaCron) {
    // cron: ทำให้นิสิตทุกคนที่ยังใช้งานอยู่
    const users = await prisma.user.findMany({
      where: { role: 'student', active: true },
      select: { id: true },
    });
    targetUserIds = users.map((u) => u.id);
  } else {
    const user = await getCurrentUser();
    if (!user) fail('UNAUTHORIZED');
    if (user.role !== 'admin') fail('FORBIDDEN');
    targetUserIds = [user.id];
  }

  let created = 0;
  for (const id of targetUserIds) created += await materializeAlerts(id);

  await systemLog('info', `สร้างการแจ้งเตือนอัตโนมัติ ${created} รายการ`, {
    meta: { users: targetUserIds.length, viaCron },
  });

  return NextResponse.json({ ok: true, users: targetUserIds.length, created });
});
