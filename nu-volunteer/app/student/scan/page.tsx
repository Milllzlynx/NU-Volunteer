import { redirect } from 'next/navigation';
import { StudentScan } from '@/components/student/StudentScan';
import { getCurrentUser } from '@/lib/auth';

export default async function StudentScanPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // ทุกอย่างของหน้านี้เกิดในเบราว์เซอร์ (กล้อง พิกัด) เซิร์ฟเวอร์แค่กันคนที่ยังไม่ล็อกอิน
  return <StudentScan />;
}
