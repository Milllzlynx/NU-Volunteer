import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { systemLog } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { sendMail } from '@/lib/mailer';

/**
 * POST /api/v1/admin/ops/test-email — ส่งอีเมลทดสอบ
 *
 * ส่งไปที่อีเมลของผู้ดูแลที่กดปุ่มเท่านั้น ไม่รับปลายทางจาก body —
 * ถ้ารับ ปลายทางจากภายนอกได้ ปุ่มนี้จะกลายเป็นเครื่องส่งอีเมลในนามมหาวิทยาลัย
 * ให้ใครก็ได้ที่ยึดบัญชีแอดมินได้ใช้ยิงอีเมลไปหาคนอื่น
 */
export const POST = handler(async () => {
  const admin = await requireAdmin();
  const transport = process.env.MAIL_TRANSPORT || 'console';

  try {
    const result = await sendMail('system.test', {
      to: admin.email,
      vars: { at: new Date().toISOString() },
    });

    await systemLog('success', `ส่งอีเมลทดสอบไปยัง ${admin.email}`, {
      actorId: admin.id,
      meta: { transport, emailLogId: result.id },
    });

    return NextResponse.json({ ok: true, to: admin.email, status: result.status, transport });
  } catch (e) {
    // sendMail บันทึกความล้มเหลวลง EmailLog ให้แล้ว ที่นี่บันทึกซ้ำใน SystemLog
    // เพราะหน้าการเชื่อมต่อระบบอ่านสองตารางนี้คนละส่วนกัน
    await systemLog('error', `ส่งอีเมลทดสอบไม่สำเร็จ: ${(e as Error).message}`, {
      actorId: admin.id,
      meta: { transport },
    });
    fail('UPSTREAM_UNAVAILABLE', 'ส่งอีเมลทดสอบไม่สำเร็จ');
  }
});
