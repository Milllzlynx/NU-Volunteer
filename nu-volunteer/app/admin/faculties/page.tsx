import type { Metadata } from 'next';
import { AdminFaculties } from '@/components/admin/AdminFaculties';
import { requireAdmin } from '@/lib/auth';

export const metadata: Metadata = { title: 'คณะ · NU Volunteer' };

export default async function AdminFacultiesPage() {
  await requireAdmin();
  return <AdminFaculties />;
}
