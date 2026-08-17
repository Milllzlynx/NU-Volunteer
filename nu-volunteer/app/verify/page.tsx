import { Shell } from '@/components/layout/Shell';
import { VerifyPanel } from '@/components/certificate/VerifyPanel';
import { appBaseUrl } from '@/lib/certificates';

export const metadata = {
  title: 'ตรวจสอบใบประกาศนียบัตร · NU Volunteer',
  description:
    'ตรวจสอบความถูกต้องของใบประกาศนียบัตรกิจกรรมจิตอาสา มหาวิทยาลัยนเรศวร ด้วยรหัสอ้างอิงบนใบประกาศ โดยไม่ต้องเข้าสู่ระบบ',
};

/** หน้าเปล่าสำหรับกรอกรหัส — ลิงก์ที่มีรหัสอยู่แล้วจะเข้าที่ /verify/[ref] แทน */
export default function VerifyIndexPage() {
  return (
    <Shell>
      <VerifyPanel certificate={null} searchedRef="" verifyBase={appBaseUrl()} />
    </Shell>
  );
}
