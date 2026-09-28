import { redirect } from 'next/navigation';
import { ChatWorkspace } from '@/components/chat/ChatWorkspace';
import { getCurrentUser } from '@/lib/auth';
import { listChatThreads } from '@/lib/chat';

/** สถานะออนไลน์กับจำนวนที่ยังไม่อ่านเปลี่ยนตลอด — หน้านี้ห้ามถูกแคช */
export const dynamic = 'force-dynamic';

/**
 * ห้องแชทฝั่งผู้ดูแลระบบ — กล่องข้อความร่วมของทีม
 *
 * ต่างจากอีกสองบทบาทตรงที่ห้องไม่ได้เป็นของแอดมินคนใดคนหนึ่ง: ห้องชนิด 'support'
 * มี responderId เป็น null แอดมินทุกคนจึงเห็นห้องเดียวกันและตอบได้ทุกคน
 * (chatScopeFor() ใน lib/chat.ts เติมเงื่อนไขนี้ให้เฉพาะบทบาทแอดมิน)
 *
 * ผลที่ตามมาโดยตั้งใจ: พอแอดมินคนหนึ่งเปิดอ่าน ข้อความนั้นนับเป็น "อ่านแล้ว" ของทั้งทีม
 * ป้ายตัวเลขของแอดมินคนอื่นจึงลดลงตาม — ตรงกับความหมายของกล่องข้อความร่วม
 * ที่ว่ามีคนรับเรื่องไปแล้ว ไม่ใช่ว่าทุกคนต้องอ่านเองอีกรอบ
 *
 * ไม่ส่ง contacts มาเพราะแอดมินเปิดห้องเองไม่ได้ — POST /chat/threads บังคับ
 * role=organizer ไว้สำหรับห้องชนิดนี้ ห้องทุกห้องจึงเริ่มจากฝั่งผู้จัดกิจกรรมเสมอ
 */
export default async function AdminChatPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const threads = await listChatThreads(user.id, user.role);

  return <ChatWorkspace initialThreads={threads} meName={user.name} variant="admin" />;
}
