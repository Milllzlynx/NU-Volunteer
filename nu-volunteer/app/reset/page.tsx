import type { Metadata } from 'next';
import { Shell } from '@/components/layout/Shell';
import { ResetForm } from '@/components/auth/ResetForm';

export const metadata: Metadata = {
  title: 'ตั้งรหัสผ่านใหม่ · NU Volunteer',
};

/** ลิงก์จากอีเมล: /reset?token=... (ดู lib/mailer.ts และ /api/v1/auth/forgot) */
export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <Shell>
      <ResetForm token={token ?? ''} />
    </Shell>
  );
}
