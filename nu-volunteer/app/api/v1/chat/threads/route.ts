import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import {
  THREAD_ACTIVITY,
  THREAD_SUPPORT,
  findThreadFor,
  hiddenMark,
  listChatThreads,
} from '@/lib/chat';
import { prisma } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { readJson } from '@/lib/validation';

/* GET /api/v1/chat/threads — รายการห้องแชทพร้อมข้อความล่าสุดและจำนวนที่ยังไม่อ่าน */
export const GET = handler(async () => {
  const user = await requireUser();
  return NextResponse.json({ ok: true, threads: await listChatThreads(user.id, user.role) });
});

/**
 * POST /api/v1/chat/threads — เปิดห้องสนทนาใหม่
 * body: { activityId } — นิสิตเปิดห้องคุยกับผู้จัดของกิจกรรมที่ลงทะเบียนไว้
 * body: { kind: 'support' } — ผู้จัดกิจกรรมเปิดห้องคุยกับทีมผู้ดูแลระบบ
 *
 * คืนห้องเดิมถ้าเคยคุยกันแล้ว เพื่อไม่ให้ประวัติแตกเป็นหลายห้อง
 */
export const POST = handler(async (req) => {
  const user = await requireUser();

  const body = await readJson<{ activityId?: unknown; kind?: unknown }>(req);

  if (String(body.kind ?? '') === THREAD_SUPPORT) {
    // แอดมินเป็นฝ่ายผู้ตอบของห้องชนิดนี้อยู่แล้ว ถ้าเปิดได้ก็จะได้ห้องที่คุยกับตัวเอง
    if (user.role !== 'organizer') fail('FORBIDDEN');

    /*
     * ห้อง support มีทั้ง activityId และ responderId เป็น null ซึ่ง SQLite ถือว่า NULL
     * ไม่ซ้ำกับ NULL — unique ของตารางจึงกันซ้ำให้ไม่ได้ ต้องหาก่อนสร้างเอง
     * ผู้จัดหนึ่งคนมีห้องเดียวตลอด ประวัติที่คุยกับทีมจึงอยู่ที่เดียว
     */
    const existing = await prisma.chatThread.findFirst({
      where: { kind: THREAD_SUPPORT, openerId: user.id },
      select: { id: true },
    });
    if (existing) {
      // เปิดห้องที่เคยเก็บเข้าคลังไว้กลับมา แต่ไม่ยุ่งกับการปิดเสียงที่ผู้ใช้ตั้งเอง
      await prisma.chatThread.update({
        where: { id: existing.id },
        data: { openerArchived: false },
      });
      return NextResponse.json({ ok: true, id: existing.id });
    }

    const thread = await prisma.chatThread.create({
      data: { kind: THREAD_SUPPORT, openerId: user.id },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, id: thread.id });
  }

  if (user.role !== 'student') fail('FORBIDDEN');

  const activityId = String(body.activityId ?? '');
  if (!activityId) fail('VALIDATION_ERROR');

  // จำกัดเฉพาะกิจกรรมที่นิสิตลงทะเบียนไว้ — กันเปิดห้องหาผู้จัดที่ไม่เกี่ยวข้องกัน
  const registration = await prisma.registration.findFirst({
    where: { userId: user.id, activityId },
    select: { activity: { select: { organizerId: true } } },
  });
  if (!registration) fail('NOT_REGISTERED');

  const responderId = registration.activity.organizerId;

  const thread = await prisma.chatThread.upsert({
    where: { activityId_openerId_responderId: { activityId, openerId: user.id, responderId } },
    update: { openerArchived: false },
    create: { kind: THREAD_ACTIVITY, activityId, openerId: user.id, responderId },
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

  const body = await readJson<{ id?: unknown; muted?: unknown; archived?: unknown }>(req);
  const id = String(body.id ?? '');
  if (!id) fail('VALIDATION_ERROR');

  const data: Record<string, boolean> = {};
  if (typeof body.muted === 'boolean') data.openerMuted = body.muted;
  if (typeof body.archived === 'boolean') data.openerArchived = body.archived;
  if (!Object.keys(data).length) fail('VALIDATION_ERROR');

  /*
   * คอลัมน์ที่มีตอนนี้เป็นของฝ่ายที่เปิดห้องล้วน จึงจำกัดด้วย openerId ในเงื่อนไข —
   * กันทั้งการแก้ห้องของคนอื่นด้วยการเดา id และการที่ฝั่งผู้ตอบไปตั้งค่าของผู้เปิดแทนตัวเอง
   * (ผู้จัดกิจกรรมเป็นผู้ตอบในห้องของนิสิต แต่เป็นผู้เปิดในห้องที่ถามแอดมิน คนเดียวกัน
   *  จึงตั้งค่าได้เฉพาะบางห้องของตัวเอง — ฝั่งหน้าเว็บดูจาก own ของแต่ละห้อง)
   */
  const { count } = await prisma.chatThread.updateMany({
    where: { id, openerId: user.id },
    data,
  });
  if (!count) fail('NOT_FOUND');

  return NextResponse.json({ ok: true });
});

/**
 * DELETE /api/v1/chat/threads?id=... — ลบบทสนทนาสำหรับตัวเอง
 *
 * ไม่ลบแถวจริง เพราะฝ่ายอื่นยังต้องเห็นประวัติของเขา — ทำเครื่องหมายซ่อนไว้ที่ deleteScope แทน
 * และไม่แตะ deletedAt เพราะฟิลด์นั้นหมายถึง "ลบให้ทุกคนเห็น" ซึ่งจะทำให้ฝ่ายอื่น
 * เห็นเป็นข้อความถูกลบไปด้วย ทั้งที่เขาไม่ได้สั่งลบ
 */
export const DELETE = handler(async (req) => {
  const user = await requireUser();
  const id = new URL(req.url).searchParams.get('id') ?? '';
  if (!id) fail('VALIDATION_ERROR');

  const thread = await findThreadFor(id, user.id, user.role);
  if (!thread) fail('NOT_FOUND');

  const mine = hiddenMark(user.id);

  /*
   * ต่อเครื่องหมายของเราเข้าไปในค่าที่แต่ละข้อความมีอยู่เดิม
   *
   * ห้อง support มีผู้เห็นได้หลายคน (ผู้จัดหนึ่งคน + แอดมินทุกคน) ค่าเดิมของ deleteScope
   * จึงมีได้หลายรูปแบบ ไม่ใช่แค่ null หรือของอีกฝ่ายคนเดียวเหมือนห้องสองคน
   * ดึงค่าที่มีจริงมาก่อนแล้วสั่งอัปเดตทีละค่า — ต่อสตริงได้โดยไม่ต้องใช้ SQL ดิบ
   * และจำนวนคำสั่งเท่ากับจำนวนค่าที่ต่างกันจริง ซึ่งไม่เกินจำนวนผู้เห็นห้องนั้น
   */
  const scopes = await prisma.chatMessage.findMany({
    where: { threadId: id },
    select: { deleteScope: true },
    distinct: ['deleteScope'],
  });

  let hidden = 0;
  for (const { deleteScope } of scopes) {
    // 'all' ถูกลบให้ทุกคนแล้ว และค่าที่มีเครื่องหมายของเราอยู่แล้วไม่ต้องต่อซ้ำ
    if (deleteScope === 'all') continue;
    if (deleteScope?.includes(mine)) continue;

    const { count } = await prisma.chatMessage.updateMany({
      where: { threadId: id, deleteScope },
      data: { deleteScope: deleteScope ? `${deleteScope},${mine}` : mine },
    });
    hidden += count;
  }

  return NextResponse.json({ ok: true, hidden });
});
