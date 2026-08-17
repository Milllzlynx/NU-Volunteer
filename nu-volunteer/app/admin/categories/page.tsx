import type { Metadata } from 'next';
import { AdminCategories } from '@/components/admin/AdminCategories';
import { requireAdmin } from '@/lib/auth';

export const metadata: Metadata = { title: 'หมวดหมู่กิจกรรม · NU Volunteer' };

export default async function AdminCategoriesPage() {
  await requireAdmin();
  return <AdminCategories />;
}
