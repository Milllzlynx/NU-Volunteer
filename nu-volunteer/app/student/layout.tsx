import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getCurrentUser, publicUser } from '@/lib/auth';
import { countUnreadChat } from '@/lib/chat';
import { prisma } from '@/lib/db';
import { AVAILABLE_PAGES } from '@/lib/routes';

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  // ส่วนนี้เป็นของนิสิตเท่านั้น — บทบาทอื่นมีพื้นที่ของตัวเอง
  if (user.role !== 'student') redirect('/');

  const [unread, unreadChat] = await Promise.all([
    prisma.notification.count({ where: { userId: user.id, read: false } }),
    countUnreadChat(user.id, user.role),
  ]);

  return (
    <AppShell
      account={publicUser(user)}
      unreadCount={unread}
      badges={{ notifications: unread, chat: unreadChat }}
      available={AVAILABLE_PAGES.student}
    >
      {children}
    </AppShell>
  );
}
