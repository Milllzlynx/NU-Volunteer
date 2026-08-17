import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handler } from '@/lib/errors';
import { readActivityInput } from '@/lib/organizer';
import { readJson } from '@/lib/validation';

/**
 * POST /api/v1/organizer/activities — สร้างกิจกรรมใหม่
 *
 * กิจกรรมผูกกับผู้สร้างเสมอ ไม่รับ organizerId จาก body
 * ไม่งั้นผู้จัดคนหนึ่งจะสร้างกิจกรรมในนามหน่วยงานอื่นได้
 */
export const POST = handler(async (req) => {
  const user = await requireStaff();
  const body = await readJson<Record<string, unknown>>(req);
  const input = await readActivityInput(body);

  const activity = await prisma.activity.create({
    data: { ...input, organizerId: user.id },
    select: { id: true, title: true, status: true },
  });

  return NextResponse.json({ ok: true, activity });
});
