import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { publishTo, touch } from '@/lib/chatBus';
import { prisma } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { readJson } from '@/lib/validation';

/**
 * POST /api/v1/chat/typing — บอกคู่สนทนาว่ากำลังพิมพ์อยู่
 *
 * ไม่บันทึกลงฐานข้อมูล เป็นสัญญาณชั่วคราวที่ส่งผ่านบัสในหน่วยความจำเท่านั้น
 * ฝั่งหน้าเว็บหน่วงไว้ไม่ให้ยิงทุกตัวอักษร
 */
export const POST = handler(async (req) => {
  const user = await requireUser();
  touch(user.id);

  const body = await readJson<{ threadId?: unknown }>(req);
  const threadId = String(body.threadId ?? '');
  if (!threadId) fail('VALIDATION_ERROR');

  const thread = await prisma.chatThread.findFirst({
    where: { id: threadId, OR: [{ studentId: user.id }, { staffId: user.id }] },
    select: { studentId: true, staffId: true },
  });
  if (!thread) fail('NOT_FOUND');

  const otherId = thread.studentId === user.id ? thread.staffId : thread.studentId;
  publishTo([otherId], { type: 'typing', threadId, userId: user.id, at: Date.now() });

  return NextResponse.json({ ok: true });
});
