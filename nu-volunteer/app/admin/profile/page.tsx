import type { Metadata } from 'next';
import { AdminProfile } from '@/components/admin/AdminProfile';
import { DATE_EN, DATE_TH } from '@/lib/activities';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const metadata: Metadata = { title: 'โปรไฟล์ · NU Volunteer' };

/**
 * โปรไฟล์ของผู้ดูแลระบบ
 *
 * ตัวเลขบนหน้านี้เป็นของทั้งระบบ ดึงชุดเดียวกับแดชบอร์ดเพื่อไม่ให้สองหน้าบอกไม่ตรงกัน
 * ยกเว้น myActions ที่เป็นของแอดมินคนที่เปิดหน้าอยู่โดยเฉพาะ
 */
export default async function AdminProfilePage() {
  const user = await requireAdmin();

  const [users, activities, hours, myActions] = await Promise.all([
    prisma.user.count(),
    prisma.activity.count(),
    prisma.registration.aggregate({ _sum: { hoursAwarded: true } }),
    prisma.systemLog.count({ where: { actorId: user.id } }),
  ]);

  return (
    <AdminProfile
      profile={{
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        joinedTh: DATE_TH.format(user.createdAt),
        joinedEn: DATE_EN.format(user.createdAt),
      }}
      stats={{
        users,
        activities,
        hoursAwarded: Math.round(hours._sum.hoursAwarded ?? 0),
        myActions,
      }}
    />
  );
}
