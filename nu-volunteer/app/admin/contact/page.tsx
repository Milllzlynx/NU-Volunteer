import type { Metadata } from 'next';
import { AdminContact } from '@/components/admin/AdminContact';
import { requireAdmin } from '@/lib/auth';

export const metadata: Metadata = { title: 'กล่องข้อความ · NU Volunteer' };

/**
 * กล่องข้อความถึงผู้ดูแลระบบ
 *
 * ข้อมูลโหลดฝั่งไคลเอนต์ผ่าน /api/v1/admin/contact เหมือนหน้าจัดการผู้ใช้งาน
 * เพราะหน้านี้ค้นหาและสลับตัวกรองตลอด และสถานะอ่านแล้วเปลี่ยนระหว่างใช้งาน —
 * ผลเรนเดอร์รอบแรกจากเซิร์ฟเวอร์จะเก่าทันทีที่เปิดข้อความแรก
 */
export default async function AdminContactPage() {
  await requireAdmin();

  return <AdminContact />;
}
