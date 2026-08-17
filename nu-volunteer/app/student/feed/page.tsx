import { redirect } from 'next/navigation';
import { StudentFeed } from '@/components/student/StudentFeed';
import { getCurrentUser } from '@/lib/auth';
import { buildTimeline } from '@/lib/timeline';

export default async function StudentFeedPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return <StudentFeed events={await buildTimeline(user.id, 200)} />;
}
