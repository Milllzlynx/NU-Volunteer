import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { LoginForm } from '@/components/auth/LoginForm';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'เข้าสู่ระบบ · NU Volunteer',
};

export default async function LoginPage() {
  // เข้าสู่ระบบอยู่แล้วไม่ต้องเห็นฟอร์มอีก
  if (await getCurrentUser()) redirect('/');

  return (
    <Shell>
      <LoginForm />
    </Shell>
  );
}
