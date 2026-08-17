import { redirect } from 'next/navigation';
import { ChatWorkspace } from '@/components/chat/ChatWorkspace';
import type { ChatContact } from '@/components/chat/ChatWorkspace';
import { getCurrentUser } from '@/lib/auth';
import { listChatThreads } from '@/lib/chat';
import { prisma } from '@/lib/db';

/** สถานะออนไลน์กับจำนวนที่ยังไม่อ่านเปลี่ยนตลอด — หน้านี้ห้ามถูกแคช */
export const dynamic = 'force-dynamic';

export default async function StudentChatPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [threads, registrations] = await Promise.all([
    listChatThreads(user.id, user.role),
    // คุยได้เฉพาะผู้จัดของกิจกรรมที่ลงทะเบียนไว้ — ตรงกับเงื่อนไขที่ POST /chat/threads บังคับ
    prisma.registration.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        activity: {
          select: { id: true, title: true, organizer: { select: { name: true } } },
        },
      },
    }),
  ]);

  // นิสิตคนหนึ่งอาจลงทะเบียนกิจกรรมเดิมซ้ำหลังยกเลิก — เหลือรายการละครั้งพอ
  const seen = new Set<string>();
  const contacts: ChatContact[] = [];
  for (const r of registrations) {
    if (seen.has(r.activity.id)) continue;
    seen.add(r.activity.id);
    contacts.push({
      activityId: r.activity.id,
      title: r.activity.title,
      organizerName: r.activity.organizer.name,
    });
  }

  return <ChatWorkspace initialThreads={threads} contacts={contacts} meName={user.name} />;
}
