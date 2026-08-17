import { redirect } from 'next/navigation';
import { ActivityForm } from '@/components/organizer/ActivityForm';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import type { PublicCategory } from '@/components/landing/types';

export default async function NewActivityPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const rows = await prisma.category.findMany({
    where: { active: true },
    orderBy: [{ order: 'asc' }, { label: 'asc' }],
  });

  const categories: PublicCategory[] = rows.map((c) => ({
    id: c.id,
    label: c.label,
    labelEn: c.labelEn,
    color: c.color,
  }));

  return <ActivityForm categories={categories} />;
}
