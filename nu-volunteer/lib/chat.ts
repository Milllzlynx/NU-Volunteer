/**
 * ข้อมูลห้องแชทที่ใช้ร่วมกันระหว่าง route handler กับหน้าเว็บที่เรนเดอร์ฝั่งเซิร์ฟเวอร์
 *
 * แยกออกมาเพราะหน้า /student/chat ต้องได้รายการห้องตั้งแต่ HTML ชุดแรก
 * ถ้าปล่อยให้หน้าเว็บเรียก API เองจะเห็นโครงเปล่าแวบหนึ่งก่อนข้อมูลมา
 * และตรรกะการนับที่ยังไม่อ่านจะต้องเขียนซ้ำสองที่
 *
 * ห้องแชทมีสองชนิด (ChatThread.kind)
 *   'activity' — นิสิตเปิดห้องถามผู้จัดของกิจกรรมที่ลงทะเบียนไว้ คู่สนทนาสองคนตายตัว
 *   'support'  — ผู้จัดกิจกรรมเปิดห้องถามทีมผู้ดูแลระบบ ฝั่งผู้ตอบเป็น "แอดมินทุกคน"
 *                (responderId เป็น null) แอดมินคนไหนเข้ามาตอบก็ได้ และทุกคนเห็นห้องเดียวกัน
 */

import { isOnline } from '@/lib/chatBus';
import { prisma } from '@/lib/db';

/** ค่าของ ChatThread.kind */
export const THREAD_ACTIVITY = 'activity';
export const THREAD_SUPPORT = 'support';

/**
 * id ปลอมของคู่สนทนาในห้อง support เมื่อมองจากฝั่งผู้จัด
 *
 * ฝั่งผู้ตอบเป็นทีม ไม่ใช่ผู้ใช้คนใดคนหนึ่ง จึงไม่มี id จริงจะใส่ให้ otherId
 * ผลที่ตามมา: เหตุการณ์ presence ที่ส่งมาพร้อม userId ของแอดมินจะจับคู่กับห้องนี้ไม่ได้
 * จุดออนไลน์ของห้อง support จึงสดเฉพาะตอนโหลดรายการห้องใหม่ (ซึ่งเกิดทุกครั้งที่มี
 * ข้อความเข้า) ไม่ใช่ทันทีที่แอดมินเปิด/ปิดหน้าจอ — ยอมรับได้ เพราะห้องนี้เป็นการ
 * ติดต่อทีม ไม่ใช่การรอคนคนหนึ่งตอบ
 */
export const SUPPORT_PEER = '__support__';

/** ชื่อที่ผู้จัดเห็นเป็นคู่สนทนาในห้อง support */
export const SUPPORT_NAME = 'ทีมผู้ดูแลระบบ';

/** id ของแอดมินทุกคน — ฝั่งผู้ตอบของห้อง support ทั้งหมด */
export async function adminIds(): Promise<string[]> {
  const rows = await prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } });
  return rows.map((r) => r.id);
}

/**
 * ห้องแชทที่ผู้ใช้คนนี้มีสิทธิ์เห็น
 *
 * กรองด้วย "เป็นคู่สนทนาในห้องนั้นหรือไม่" ไม่ใช่ด้วยบทบาท เพราะคนคนหนึ่งอยู่ได้ทั้งสองฝั่ง —
 * ผู้จัดกิจกรรมเป็นผู้ตอบในห้องของนิสิต และเป็นผู้เปิดห้องในห้องที่ถามแอดมิน
 * ถ้าแมปบทบาทไปที่คอลัมน์เดียวเหมือนเดิม ห้องอีกฝั่งของเขาจะหายไปทั้งหมด
 *
 * แอดมินเห็นห้อง support ทุกห้องเพิ่มมาด้วย เพราะฝั่งผู้ตอบของห้องพวกนั้นคือทีม ไม่ใช่ตัวบุคคล
 */
export const chatScopeFor = (userId: string, role: string) => ({
  OR: [
    { openerId: userId },
    { responderId: userId },
    ...(role === 'admin' ? [{ kind: THREAD_SUPPORT }] : []),
  ],
});

/** เครื่องหมายว่าผู้ใช้คนนี้ซ่อนข้อความไว้เอง — ดูรูปแบบของ deleteScope ที่ visibleTo() */
export const hiddenMark = (userId: string) => `me:${userId}`;

/**
 * เงื่อนไข "ข้อความที่ผู้ใช้คนนี้ยังเห็นได้"
 *
 * รูปแบบของ ChatMessage.deleteScope
 *   null                       — ปกติ เห็นได้ทุกฝ่าย
 *   'me:<id>[,me:<id>]'        — ฝ่ายที่ระบุกดลบสำหรับตัวเอง ฝ่ายอื่นยังเห็นข้อความเต็ม
 *   'all'                      — ลบให้ทุกคน (คู่กับ deletedAt ที่ทำให้แสดงเป็นข้อความถูกลบ)
 *
 * ต้องเขียนกรณี null แยกออกมาเสมอ เพราะ NOT ของ SQL ไม่คืนแถวที่คอลัมน์เป็น NULL
 * (`NULL <> 'all'` ได้ผลเป็น NULL ไม่ใช่ true) ถ้าลืมข้อนี้ ข้อความปกติทั้งหมด
 * ซึ่ง deleteScope เป็น NULL จะหายไปจากทั้งรายการห้อง ตัวนับที่ยังไม่อ่าน และหน้าสนทนา
 */
export const visibleTo = (userId: string) => ({
  OR: [
    { deleteScope: null },
    {
      AND: [
        { deleteScope: { not: 'all' } },
        { NOT: { deleteScope: { contains: hiddenMark(userId) } } },
      ],
    },
  ],
});

export type ChatThreadView = {
  id: string;
  kind: string;
  /** null = ห้องที่ไม่ผูกกับกิจกรรม (ห้อง support หรือกิจกรรมถูกลบไปแล้ว — ตั้งไว้เป็น SetNull) */
  activityId: string | null;
  activityTitle: string | null;
  /** id ของคู่สนทนา — ใช้จับคู่เหตุการณ์ออนไลน์/ออฟไลน์ที่ส่งมาทางสตรีม (ดู SUPPORT_PEER) */
  otherId: string;
  otherName: string;
  otherAvatar: string | null;
  otherOnline: boolean;
  lastText: string | null;
  lastAtMs: number;
  unread: number;
  muted: boolean;
  archived: boolean;
  /** true = ผู้ใช้คนนี้เป็นฝ่ายที่เปิดห้อง จึงตั้งปิดเสียง/เก็บเข้าคลังห้องนี้ได้ */
  own: boolean;
};

export async function listChatThreads(userId: string, role: string): Promise<ChatThreadView[]> {
  const threads = await prisma.chatThread.findMany({
    where: chatScopeFor(userId, role),
    orderBy: { lastMessageAt: 'desc' },
    include: {
      activity: { select: { id: true, title: true } },
      opener: { select: { id: true, name: true, avatarUrl: true } },
      responder: { select: { id: true, name: true, avatarUrl: true } },
      messages: {
        where: visibleTo(userId),
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  const unread = await prisma.chatMessage.groupBy({
    by: ['threadId'],
    where: {
      threadId: { in: threads.map((t) => t.id) },
      senderId: { not: userId },
      readAt: null,
      ...visibleTo(userId),
    },
    _count: { _all: true },
  });
  const unreadMap = new Map(unread.map((u) => [u.threadId, u._count._all]));

  // สถานะออนไลน์ของ "ทีมผู้ดูแลระบบ" = มีแอดมินอย่างน้อยหนึ่งคนออนไลน์
  // ดึงรายชื่อแอดมินเฉพาะเมื่อมีห้อง support ที่ผู้ใช้คนนี้เป็นฝ่ายเปิดจริง ๆ
  const needsSupportPresence = threads.some(
    (t) => t.kind === THREAD_SUPPORT && t.openerId === userId,
  );
  const supportOnline = needsSupportPresence ? (await adminIds()).some(isOnline) : false;

  return threads.map((t) => {
    const own = t.openerId === userId;
    // คู่สนทนาคืออีกฝ่ายเสมอ — ยกเว้นห้อง support ที่มองจากฝั่งผู้เปิด ซึ่งอีกฝ่ายคือทีมทั้งทีม
    const other = own ? t.responder : t.opener;

    return {
      id: t.id,
      kind: t.kind,
      activityId: t.activity?.id ?? null,
      activityTitle: t.activity?.title ?? null,
      otherId: other?.id ?? SUPPORT_PEER,
      otherName: other?.name ?? SUPPORT_NAME,
      otherAvatar: other?.avatarUrl ?? null,
      otherOnline: other ? isOnline(other.id) : supportOnline,
      lastText: t.messages[0] ? (t.messages[0].deletedAt ? null : t.messages[0].text) : null,
      lastAtMs: t.lastMessageAt.getTime(),
      unread: unreadMap.get(t.id) ?? 0,
      // openerMuted/openerArchived เป็นค่าของฝ่ายที่เปิดห้องล้วน (ฝั่งผู้ตอบยังไม่มีคอลัมน์คู่)
      // ถ้าส่งค่าเดียวกันให้ทั้งสองฝ่าย ห้องที่ผู้เปิดเก็บเข้าคลังจะหายไปจากรายการของผู้ตอบด้วย
      // ทั้งที่ผู้ตอบไม่ได้สั่งเก็บเอง — ฝั่งผู้ตอบจึงเห็นเป็น false เสมอจนกว่าจะมีคอลัมน์ของตัวเอง
      muted: own ? t.openerMuted : false,
      archived: own ? t.openerArchived : false,
      own,
    };
  });
}

/** จำนวนข้อความที่ยังไม่อ่านทุกห้องรวมกัน — ใช้ติดป้ายบนเมนูแถบข้าง */
export async function countUnreadChat(userId: string, role: string): Promise<number> {
  return prisma.chatMessage.count({
    where: {
      thread: chatScopeFor(userId, role),
      senderId: { not: userId },
      readAt: null,
      ...visibleTo(userId),
    },
  });
}

/**
 * ห้องที่ผู้ใช้คนนี้เข้าถึงได้ — คืน null ถ้าไม่มีสิทธิ์ (ให้ผู้เรียก fail('NOT_FOUND') เอง)
 *
 * ใช้เงื่อนไขชุดเดียวกับรายการห้อง จึงไม่มีทางที่ห้องจะขึ้นในรายการแต่ส่งข้อความไม่ได้
 * (หรือกลับกัน) — ตรวจสิทธิ์ที่นี่ที่เดียวทั้ง GET/POST ข้อความ สัญญาณกำลังพิมพ์ และการลบ
 */
export async function findThreadFor(threadId: string, userId: string, role: string) {
  return prisma.chatThread.findFirst({
    where: { id: threadId, ...chatScopeFor(userId, role) },
    select: { id: true, kind: true, openerId: true, responderId: true },
  });
}

/**
 * ผู้ใช้ที่ควรได้รับเหตุการณ์ของห้องนี้ นอกจากตัวผู้กระทำเอง
 *
 * ห้อง activity มีคู่สนทนาสองคน ปลายทางจึงเป็นอีกฝ่ายคนเดียว
 * ห้อง support ส่งถึงแอดมินทุกคนเสมอ เพื่อให้ตัวนับที่ยังไม่อ่านของแอดมินคนอื่นขยับตาม
 * แม้ข้อความนั้นจะถูกแอดมินอีกคนตอบไปแล้ว
 */
export async function peersOf(
  thread: { kind: string; openerId: string; responderId: string | null },
  userId: string,
): Promise<string[]> {
  if (thread.kind === THREAD_SUPPORT) {
    const admins = await adminIds();
    const all = thread.openerId === userId ? admins : [thread.openerId, ...admins];
    return [...new Set(all)].filter((id) => id !== userId);
  }

  const other = thread.openerId === userId ? thread.responderId : thread.openerId;
  return other && other !== userId ? [other] : [];
}
