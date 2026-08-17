import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getCurrentUser, publicUser } from '@/lib/auth';
import { countUnreadChat } from '@/lib/chat';
import { prisma } from '@/lib/db';
import { AVAILABLE_PAGES } from '@/lib/routes';

/**
 * โครงหน้าฝั่งผู้ดูแลระบบ — คู่ขนานกับ app/organizer/layout.tsx และ app/student/layout.tsx
 *
 * ต่างจากอีกสองบทบาทตรงที่ไม่มีการจำกัดขอบเขตข้อมูล (ไม่มี ownedActivityFilter)
 * แอดมินเห็นทั้งระบบตามนิยามของบทบาท การกรองจึงอยู่ที่หน้าจอ ไม่ใช่ที่สิทธิ์
 *
 * ผู้จัดกิจกรรมเข้าหน้านี้ไม่ได้ ต่างจาก /organizer ที่แอดมินเข้าได้ —
 * สิทธิ์ไหลลงทางเดียวเสมอ แอดมินทำแทนผู้จัดได้ แต่ผู้จัดทำแทนแอดมินไม่ได้
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect('/');

  const [unread, unreadChat, unreadContact, pendingDeletions] = await Promise.all([
    prisma.notification.count({ where: { userId: user.id, read: false } }),
    countUnreadChat(user.id, user.role),
    prisma.contactMessage.count({ where: { read: false } }),
    prisma.user.count({ where: { deletionRequestedAt: { not: null } } }),
  ]);

  return (
    <AppShell
      account={publicUser(user)}
      unreadCount={unread}
      /*
        ตัวเลขข้างเมนู — ของแอดมินคือ "งานที่ต้องตัดสินใจ" ไม่ใช่ข้อความที่ยังไม่อ่าน
        คำขอลบบัญชีขึ้นที่เมนูผู้ใช้งาน เพราะไม่ลบให้อัตโนมัติ ต้องมีคนพิจารณาเสมอ
      */
      badges={{
        notifications: unread,
        chat: unreadChat,
        contact: unreadContact,
        users: pendingDeletions,
      }}
      available={AVAILABLE_PAGES[user.role] ?? []}
    >
      {children}
    </AppShell>
  );
}
