import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const metadata: Metadata = {
  title: 'สมัครสมาชิก · NU Volunteer',
};

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect('/');

  const faculties = await prisma.faculty.findMany({
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    select: { name: true },
  });

  return (
    <Shell>
      <RegisterForm
        faculties={faculties.map((f) => ({ value: f.name, label: f.name }))}
        emailDomain={process.env.EMAIL_DOMAIN || 'nu.ac.th'}
      />
    </Shell>
  );
}
