import type { Metadata } from 'next';
import { Shell } from '@/components/layout/Shell';
import { ForgotForm } from '@/components/auth/ForgotForm';

export const metadata: Metadata = {
  title: 'ลืมรหัสผ่าน · NU Volunteer',
};

export default function ForgotPage() {
  return (
    <Shell>
      <ForgotForm />
    </Shell>
  );
}
