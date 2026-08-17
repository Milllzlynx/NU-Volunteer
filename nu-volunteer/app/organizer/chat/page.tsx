import { redirect } from 'next/navigation';
import { ChatWorkspace } from '@/components/chat/ChatWorkspace';
import { getCurrentUser } from '@/lib/auth';
import { listChatThreads } from '@/lib/chat';

/** สถานะออนไลน์กับจำนวนที่ยังไม่อ่านเปลี่ยนตลอด — หน้านี้ห้ามถูกแคช */
export const dynamic = 'force-dynamic';

/**
 * ห้องแชทฝั่งผู้จัดกิจกรรม
 *
 * ไม่ต้องส่ง contacts มาเพราะผู้จัดเปิดห้องเองไม่ได้ — POST /chat/threads บังคับ role=student
 * ไว้โดยตั้งใจ ห้องทุกห้องจึงเริ่มจากนิสิตที่ลงทะเบียนกิจกรรมของผู้จัดคนนี้เท่านั้น
 * listChatThreads() กรองด้วย staffId ให้แล้ว ผู้จัดจึงเห็นเฉพาะห้องที่ตัวเองเป็นคู่สนทนา
 */
export default async function OrganizerChatPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const threads = await listChatThreads(user.id, user.role);

  return <ChatWorkspace initialThreads={threads} meName={user.name} variant="staff" />;
}
