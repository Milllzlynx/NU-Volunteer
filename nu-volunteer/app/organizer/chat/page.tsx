import { redirect } from 'next/navigation';
import { ChatWorkspace } from '@/components/chat/ChatWorkspace';
import type { ChatContact } from '@/components/chat/ChatWorkspace';
import { getCurrentUser } from '@/lib/auth';
import { listChatThreads } from '@/lib/chat';

/** สถานะออนไลน์กับจำนวนที่ยังไม่อ่านเปลี่ยนตลอด — หน้านี้ห้ามถูกแคช */
export const dynamic = 'force-dynamic';

/**
 * ห้องแชทฝั่งผู้จัดกิจกรรม
 *
 * หน้านี้รวมห้องสองชนิดที่ผู้จัดอยู่คนละฝั่งกัน
 *   - ห้องของนิสิต: นิสิตเป็นฝ่ายเปิด (POST /chat/threads บังคับ role=student ไว้)
 *     ผู้จัดจึงเปิดห้องหานิสิตเองไม่ได้ ได้แต่ตอบห้องที่ถูกทักเข้ามา
 *   - ห้องที่ถามทีมผู้ดูแลระบบ: ผู้จัดเป็นฝ่ายเปิดเอง มีห้องเดียวต่อผู้จัดหนึ่งคน
 *     จึงส่ง contacts มาให้ปุ่ม "เริ่มบทสนทนาใหม่" ขึ้นได้
 *
 * แอดมินเข้าหน้านี้ได้ด้วย (ดู app/organizer/layout.tsx) แต่ไม่มีตัวเลือกติดต่อผู้ดูแลระบบ
 * เพราะแอดมินเป็นฝ่ายผู้ตอบของห้องชนิดนั้นอยู่แล้ว — ห้องของแอดมินอยู่ที่ /admin/chat
 */
export default async function OrganizerChatPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const threads = await listChatThreads(user.id, user.role);

  const contacts: ChatContact[] =
    user.role === 'organizer'
      ? [{ kind: 'support', title: 'ทีมผู้ดูแลระบบ', subtitle: 'ตอบโดยผู้ดูแลคนใดก็ได้' }]
      : [];

  return (
    <ChatWorkspace
      initialThreads={threads}
      contacts={contacts}
      meName={user.name}
      variant="staff"
    />
  );
}
