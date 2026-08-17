/**
 * ข้อมูลห้องแชทที่ใช้ร่วมกันระหว่าง route handler กับหน้าเว็บที่เรนเดอร์ฝั่งเซิร์ฟเวอร์
 *
 * แยกออกมาเพราะหน้า /student/chat ต้องได้รายการห้องตั้งแต่ HTML ชุดแรก
 * ถ้าปล่อยให้หน้าเว็บเรียก API เองจะเห็นโครงเปล่าแวบหนึ่งก่อนข้อมูลมา
 * และตรรกะการนับที่ยังไม่อ่านจะต้องเขียนซ้ำสองที่
 */

import { isOnline } from '@/lib/chatBus';
import { prisma } from '@/lib/db';

/** ห้องแชทที่ผู้ใช้คนนี้มีสิทธิ์เห็น — นิสิตเห็นห้องของตัวเอง เจ้าหน้าที่เห็นห้องที่ตนดูแล */
export const chatScopeFor = (userId: string, role: string) =>
  role === 'student' ? { studentId: userId } : { staffId: userId };

/** เครื่องหมายว่าผู้ใช้คนนี้ซ่อนข้อความไว้เอง — ดูรูปแบบของ deleteScope ที่ visibleTo() */
export const hiddenMark = (userId: string) => `me:${userId}`;

/**
 * เงื่อนไข "ข้อความที่ผู้ใช้คนนี้ยังเห็นได้"
 *
 * รูปแบบของ ChatMessage.deleteScope
 *   null                       — ปกติ เห็นได้ทั้งสองฝ่าย
 *   'me:<id>[,me:<id>]'        — ฝ่ายที่ระบุกดลบสำหรับตัวเอง อีกฝ่ายยังเห็นข้อความเต็ม
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
  /** null = ห้องที่ไม่ผูกกับกิจกรรม (กิจกรรมถูกลบไปแล้ว — ความสัมพันธ์ตั้งไว้เป็น SetNull) */
  activityId: string | null;
  activityTitle: string | null;
  /** id ของคู่สนทนา — ใช้จับคู่เหตุการณ์ออนไลน์/ออฟไลน์ที่ส่งมาทางสตรีม */
  otherId: string;
  otherName: string;
  otherAvatar: string | null;
  otherOnline: boolean;
  lastText: string | null;
  lastAtMs: number;
  unread: number;
  muted: boolean;
  archived: boolean;
};

export async function listChatThreads(userId: string, role: string): Promise<ChatThreadView[]> {
  const threads = await prisma.chatThread.findMany({
    where: chatScopeFor(userId, role),
    orderBy: { lastMessageAt: 'desc' },
    include: {
      activity: { select: { id: true, title: true } },
      student: { select: { id: true, name: true, avatarUrl: true } },
      staff: { select: { id: true, name: true, avatarUrl: true } },
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

  return threads.map((t) => {
    // คู่สนทนาคืออีกฝ่ายเสมอ
    const other = role === 'student' ? t.staff : t.student;
    const last = t.messages[0];
    return {
      id: t.id,
      activityId: t.activity?.id ?? null,
      activityTitle: t.activity?.title ?? null,
      otherId: other.id,
      otherName: other.name,
      otherAvatar: other.avatarUrl,
      otherOnline: isOnline(other.id),
      lastText: last ? (last.deletedAt ? null : last.text) : null,
      lastAtMs: t.lastMessageAt.getTime(),
      unread: unreadMap.get(t.id) ?? 0,
      // studentMuted/studentArchived เป็นค่าของฝั่งนิสิตล้วน (ยังไม่มีคอลัมน์คู่ของเจ้าหน้าที่)
      // ถ้าส่งค่าเดียวกันให้ทั้งสองฝ่าย ห้องที่นิสิตเก็บเข้าคลังจะหายไปจากรายการของผู้จัดด้วย
      // ทั้งที่ผู้จัดไม่ได้สั่งเก็บเอง — ฝั่งเจ้าหน้าที่จึงเห็นเป็น false เสมอจนกว่าจะมีคอลัมน์ของตัวเอง
      muted: role === 'student' ? t.studentMuted : false,
      archived: role === 'student' ? t.studentArchived : false,
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
