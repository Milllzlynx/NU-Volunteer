import { redirect } from 'next/navigation';
import { GuideBook } from '@/components/guide/GuideBook';
import { getCurrentUser } from '@/lib/auth';
import { ROLE_NAV } from '@/lib/design';
import { GUIDE_FAQ, guideFor } from '@/lib/guide';
import { AVAILABLE_PAGES } from '@/lib/routes';

export default async function OrganizerGuidePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // ที่อยู่และชื่อเมนูดึงจาก ROLE_NAV ตัวเดียวกับแถบข้าง คู่มือจึงเรียกชื่อหน้าตรงกับที่ผู้ใช้เห็นเสมอ
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
