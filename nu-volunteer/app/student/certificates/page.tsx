import { redirect } from 'next/navigation';
import { StudentCertificates } from '@/components/student/StudentCertificates';
import { getCurrentUser } from '@/lib/auth';
import { appBaseUrl, listCertificates } from '@/lib/certificates';

export default async function StudentCertificatesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const certificates = await listCertificates(user.id);

  return <StudentCertificates certificates={certificates} verifyBase={appBaseUrl()} />;
}
