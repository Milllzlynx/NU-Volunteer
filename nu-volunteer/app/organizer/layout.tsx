import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getCurrentUser, publicUser } from '@/lib/auth';
import { countUnreadChat } from '@/lib/chat';
import { prisma } from '@/lib/db';
import { ownedActivityFilter } from '@/lib/organizer';
import { AVAILABLE_PAGES } from '@/lib/routes';

/**
 * โครงหน้าฝั่งผู้จัดกิจกรรม — คู่ขนานกับ app/student/layout.tsx
 *
 * แอดมินเข้ามาได้ด้วยเพราะทำได้ทุกอย่างที่ผู้จัดทำได้ (ตาม requireStaff ใน lib/auth.ts)
 * แต่แถบข้างจะขึ้นเมนูตามบทบาทจริงของผู้ใช้ ไม่ใช่ของผู้จัดเสมอไป
 */
export default async function OrganizerLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'organizer' && user.role !== 'admin') redirect('/');

  const scope = ownedActivityFilter(user);

  const [unread, unreadChat, pendingRegs, pendingCancels, awaitingHours] = await Promise.all([
    prisma.notification.count({ where: { userId: user.id, read: false } }),
    countUnreadChat(user.id, user.role),
    prisma.registration.count({ where: { activity: scope, status: 'pending' } }),
    prisma.registration.count({
      where: { activity: scope, cancelRequested: true, cancelStatus: 'pending' },
    }),
    prisma.registration.count({
      where: { activity: scope, status: 'checked-out', hoursApprovedAt: null },
    }),
  ]);

  return (
    <AppShell
      account={publicUser(user)}
      unreadCount={unread}
      /*
        ตัวเลขข้างเมนู — ของผู้จัดคือ "งานค้าง" ไม่ใช่ข้อความที่ยังไม่อ่าน
        ปัจจุบันการแจ้งเตือนทุกฉบับถูกส่งถึงนิสิต ตัวเลขบนกระดิ่งจึงมักเป็นศูนย์
        คิวงานจริงอยู่ที่สามเมนูนี้ ผู้จัดจึงเห็นได้จากแถบข้างโดยไม่ต้องเปิดทีละหน้า
      */
      badges={{
        notifications: unread,
        chat: unreadChat,
        registrations: pendingRegs,
        cancellations: pendingCancels,
        hoursApproval: awaitingHours,
      }}
      available={AVAILABLE_PAGES[user.role] ?? []}
    >
      {children}
    </AppShell>
  );
}
