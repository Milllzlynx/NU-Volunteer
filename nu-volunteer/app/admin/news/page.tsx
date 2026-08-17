import type { Metadata } from 'next';
import { AdminNews } from '@/components/admin/AdminNews';
import { requireAdmin } from '@/lib/auth';

export const metadata: Metadata = { title: 'ข่าวสารประชาสัมพันธ์ · NU Volunteer' };

export default async function AdminNewsPage() {
  await requireAdmin();
  return <AdminNews />;
}
