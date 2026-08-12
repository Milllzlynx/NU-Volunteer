import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { handler } from '@/lib/errors';
import { normEmail } from '@/lib/validation';

/* GET /api/v1/auth/check-email?email= — ใช้ในขั้นตอนสมัคร */
export const GET = handler(async (req) => {
  const email = normEmail(new URL(req.url).searchParams.get('email'));
  if (!email) return NextResponse.json({ ok: true, exists: false });
  const u = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return NextResponse.json({ ok: true, exists: !!u });
});
