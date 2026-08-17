import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { chatScopeFor, hiddenMark, listChatThreads } from '@/lib/chat';
import { prisma } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { readJson } from '@/lib/validation';

/* GET /api/v1/chat/threads — รายการห้องแชทพร้อมข้อความล่าสุดและจำนวนที่ยังไม่อ่าน */
export const GET = handler(async () => {
  const user = await requireUser();
  return NextResponse.json({ ok: true, threads: await listChatThreads(user.id, user.role) });
});

/**
 * POST /api/v1/chat/threads — เปิดห้องคุยกับผู้จัดของกิจกรรมที่ลงทะเบียนไว้
 * body: { activityId }
 *
 * คืนห้องเดิมถ้าเคยคุยกันแล้ว เพื่อไม่ให้ประวัติแตกเป็นหลายห้อง
 * จำกัดเฉพาะกิจกรรมที่นิสิตลงทะเบียนไว้ — กันเปิดห้องหาผู้จัดที่ไม่เกี่ยวข้องกัน
 */
export const POST = handler(async (req) => {
  const user = await requireUser();
  if (user.role !== 'student') fail('FORBIDDEN');

  const body = await readJson<{ activityId?: unknown }>(req);
  const activityId = String(body.activityId ?? '');
  if (!activityId) fail('VALIDATION_ERROR');

  const registration = await prisma.registration.findFirst({
    where: { userId: user.id, activityId },
    select: { activity: { select: { organizerId: true } } },
  });
  if (!registration) fail('NOT_REGISTERED');

  const staffId = registration.activity.organizerId;

  const thread = await prisma.chatThread.upsert({
    where: { activityId_studentId_staffId: { activityId, studentId: user.id, staffId } },
    // เปิดห้องที่เคยเก็บเข้าคลังไว้กลับมา แต่ไม่ยุ่งกับการปิดเสียงที่ผู้ใช้ตั้งเอง
    update: { studentArchived: false },
    create: { activityId, studentId: user.id, staffId },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: thread.id });
});

/**
 * PATCH /api/v1/chat/threads — ปิดเสียง / เก็บเข้าคลัง
 * body: { id, muted?, archived? }
 */
export const PATCH = handler(async (req) => {
  const user = await requireUser();
  // คอลัมน์ที่มีตอนนี้เป็นของฝั่งนิสิตล้วน — ถ้าปล่อยให้บทบาทอื่นเรียก จะกลายเป็นการ
  // ไปแก้ค่าปิดเสียง/คลังข้อความของนิสิตแทนที่จะเป็นของตัวเอง
  if (user.role !== 'student') fail('FORBIDDEN');

  const body = await readJson<{ id?: unknown; muted?: unknown; archived?: unknown }>(req);
  const id = String(body.id ?? '');
  if (!id) fail('VALIDATION_ERROR');

  const data: Record<string, boolean> = {};
  if (typeof body.muted === 'boolean') data.studentMuted = body.muted;
  if (typeof body.archived === 'boolean') data.studentArchived = body.archived;
  if (!Object.keys(data).length) fail('VALIDATION_ERROR');

  // จำกัดด้วยเจ้าของห้องในเงื่อนไข — กันแก้ห้องของคนอื่นด้วยการเดา id
  const { count } = await prisma.chatThread.updateMany({
    where: { id, ...chatScopeFor(user.id, user.role) },
    data,
  });
  if (!count) fail('NOT_FOUND');

  return NextResponse.json({ ok: true });
});

/**
 * DELETE /api/v1/chat/threads?id=... — ลบบทสนทนาสำหรับตัวเอง
 *
 * ไม่ลบแถวจริง เพราะอีกฝ่ายยังต้องเห็นประวัติของเขา — ทำเครื่องหมายซ่อนไว้ที่ deleteScope แทน
 * และไม่แตะ deletedAt เพราะฟิลด์นั้นหมายถึง "ลบให้ทุกคนเห็น" ซึ่งจะทำให้อีกฝ่าย
 * เห็นเป็นข้อความถูกลบไปด้วย ทั้งที่เขาไม่ได้สั่งลบ
 */
export const DELETE = handler(async (req) => {
  const user = await requireUser();
  const id = new URL(req.url).searchParams.get('id') ?? '';
  if (!id) fail('VALIDATION_ERROR');

  const thread = await prisma.chatThread.findFirst({
    where: { id, ...chatScopeFor(user.id, user.role) },
    select: { studentId: true, staffId: true },
  });
  if (!thread) fail('NOT_FOUND');

  const mine = hiddenMark(user.id);
  const otherId = thread.studentId === user.id ? thread.staffId : thread.studentId;
  const theirs = hiddenMark(otherId);

  // ห้องหนึ่งมีคู่สนทนาแค่สองคน ค่าที่เป็นไปได้ก่อนหน้านี้จึงมีแค่ null หรือของอีกฝ่าย
  // แยกเป็นสองคำสั่งเพื่อต่อสตริงได้โดยไม่ต้องใช้ SQL ดิบ
  const [fresh, alreadyHiddenByOther] = await Promise.all([
    prisma.chatMessage.updateMany({
      where: { threadId: id, deleteScope: null },
      data: { deleteScope: mine },
    }),
    prisma.chatMessage.updateMany({
      where: { threadId: id, deleteScope: theirs },
      data: { deleteScope: `${theirs},${mine}` },
    }),
  ]);

  return NextResponse.json({ ok: true, hidden: fresh.count + alreadyHiddenByOther.count });
});
