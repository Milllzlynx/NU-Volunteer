import { NextResponse } from 'next/server';
import { handler } from '@/lib/errors';
import { publicUser, requireUser } from '@/lib/auth';

/* GET /api/v1/auth/me */
export const GET = handler(async () => {
  const user = await requireUser();
  return NextResponse.json({ ok: true, account: publicUser(user) });
});
