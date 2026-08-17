import type { Metadata } from 'next';
import { AdminUsers } from '@/components/admin/AdminUsers';
import { requireAdmin } from '@/lib/auth';

export const metadata: Metadata = { title: 'จัดการผู้ใช้งาน · NU Volunteer' };

/**
 * หน้าจัดการผู้ใช้งาน
 *
 * ข้อมูลโหลดฝั่งไคลเอนต์ผ่าน /api/v1/admin/users ไม่ใช่ตอนเรนเดอร์ฝั่งเซิร์ฟเวอร์
 * เพราะหน้านี้ต้องค้นหา กรอง และแบ่งหน้าตลอดเวลา — เรนเดอร์รอบแรกจากเซิร์ฟเวอร์
 * จะถูกทิ้งทันทีที่ผู้ใช้พิมพ์ตัวแรก
 *
 * ที่ต้องมาจากเซิร์ฟเวอร์คือ id ของแอดมินที่เปิดหน้านี้ ใช้ปิดปุ่มของแถวตัวเอง
 */
export default async function AdminUsersPage() {
  const admin = await requireAdmin();

  return <AdminUsers selfId={admin.id} />;
}
