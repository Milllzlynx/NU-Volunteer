import type { Metadata } from 'next';
import { GuideBook } from '@/components/guide/GuideBook';
import { requireAdmin } from '@/lib/auth';
import { ROLE_NAV } from '@/lib/design';
import { GUIDE_FAQ, guideFor } from '@/lib/guide';
import { AVAILABLE_PAGES } from '@/lib/routes';

export const metadata: Metadata = { title: 'คู่มือผู้ใช้งาน · NU Volunteer' };

/**
 * คู่มือของผู้ดูแลระบบ — โครงเดียวกับคู่มือของอีกสองบทบาท
 *
 * ที่อยู่และชื่อเมนูดึงจาก ROLE_NAV ตัวเดียวกับแถบข้าง คู่มือจึงเรียกชื่อหน้าตรงกับที่ผู้ใช้เห็นเสมอ
 * และ AVAILABLE_PAGES ทำให้หัวข้อที่พูดถึงหน้าที่ยังไม่ได้สร้างไม่มีปุ่มพาไปหน้า 404
 */
export default async function AdminGuidePage() {
  const user = await requireAdmin();

  const nav = ROLE_NAV[user.role] ?? [];
  const navHrefs = Object.fromEntries(nav.map((i) => [i.key, i.href]));
  const navLabels = Object.fromEntries(nav.map((i) => [i.key, { th: i.label, en: i.labelEn }]));

  return (
    <GuideBook
      sections={guideFor(user.role)}
      faqs={GUIDE_FAQ}
      role={user.role}
      available={AVAILABLE_PAGES[user.role] ?? []}
      navHrefs={navHrefs}
      navLabels={navLabels}
    />
  );
}
