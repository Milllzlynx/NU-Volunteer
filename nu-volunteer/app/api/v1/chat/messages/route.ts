import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { findThreadFor, peersOf, visibleTo } from '@/lib/chat';
import { publishTo, touch } from '@/lib/chatBus';
import { prisma } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { readJson } from '@/lib/validation';

const TEXT_MAX = 2000;
const PAGE = 100;

/**
 * ตรวจว่าผู้ใช้เข้าถึงห้องนี้ได้จริง แล้วคืนผู้ที่ต้องได้รับเหตุการณ์ของห้อง
 *
 * คืนเป็นรายการ ไม่ใช่คนเดียว เพราะห้อง support มีแอดมินหลายคนอยู่ฝั่งผู้ตอบ —
 * ข้อความหนึ่งฉบับต้องไปถึงทุกคนที่เห็นห้องนั้น ไม่ใช่คนที่เผอิญตอบอยู่
 */
async function requireMembership(threadId: string, userId: string, role: string) {
  const thread = await findThreadFor(threadId, userId, role);
  if (!thread) fail('NOT_FOUND');
  return { thread, peerIds: await peersOf(thread, userId) };
}

/* GET /api/v1/chat/messages?threadId=...  — ประวัติข้อความ + ทำเครื่องหมายว่าอ่านแล้ว */
export const GET = handler(async (req) => {
  const user = await requireUser();
  touch(user.id);

  const threadId = new URL(req.url).searchParams.get('threadId') ?? '';
  if (!threadId) fail('VALIDATION_ERROR');
  const { peerIds } = await requireMembership(threadId, user.id, user.role);

  const rows = await prisma.chatMessage.findMany({
    where: {
      threadId,
      // ซ่อนข้อความที่ลบให้ทุกคน และที่ผู้ใช้คนนี้ลบไปเอง
      ...visibleTo(user.id),
    },
    orderBy: { createdAt: 'asc' },
    take: PAGE,
    include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
  });

  // อ่านแล้ว: ข้อความของอีกฝ่ายที่ยังไม่ถูกอ่าน
  const { count } = await prisma.chatMessage.updateMany({
    where: { threadId, senderId: { not: user.id }, readAt: null },
    data: { readAt: new Date() },
  });
  if (count) publishTo(peerIds, { type: 'read', threadId, byUserId: user.id, at: Date.now() });

  return NextResponse.json({
    ok: true,
    messages: rows.map((m) => ({
      id: m.id,
      text: m.deletedAt ? null : m.text,
      mine: m.senderId === user.id,
      senderName: m.sender.name,
      readAt: m.readAt ? m.readAt.getTime() : null,
      atMs: m.createdAt.getTime(),
    })),
  });
});

/* POST /api/v1/chat/messages — ส่งข้อความ */
export const POST = handler(async (req) => {
  const user = await requireUser();
  touch(user.id);

  const body = await readJson<{ threadId?: unknown; text?: unknown }>(req);
  const threadId = String(body.threadId ?? '');
  const text = String(body.text ?? '').trim();

  if (!threadId) fail('VALIDATION_ERROR');
  if (!text) fail('VALIDATION_ERROR', 'กรุณาพิมพ์ข้อความ');
  if (text.length > TEXT_MAX) fail('VALIDATION_ERROR', `ข้อความต้องไม่เกิน ${TEXT_MAX} ตัวอักษร`);

  const { peerIds } = await requireMembership(threadId, user.id, user.role);

  const msg = await prisma.chatMessage.create({
    data: { threadId, senderId: user.id, text },
    select: { id: true, createdAt: true },
  });
  await prisma.chatThread.update({
    where: { id: threadId },
    data: { lastMessageAt: msg.createdAt },
  });

  // ส่งให้ทุกฝ่ายในห้อง — ผู้ส่งเองก็ได้รับ เพื่อให้แท็บอื่นของเขาอัปเดตตาม
  publishTo([...peerIds, user.id], {
    type: 'message',
    threadId,
    messageId: msg.id,
    senderId: user.id,
    at: msg.createdAt.getTime(),
  });

  return NextResponse.json({ ok: true, id: msg.id, atMs: msg.createdAt.getTime() });
});
