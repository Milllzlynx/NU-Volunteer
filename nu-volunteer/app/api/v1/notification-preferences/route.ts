import { NextResponse } from 'next/server';
import { DEFAULT_PREFS, clampLeadDays, getPrefs } from '@/lib/alerts';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handler } from '@/lib/errors';
import { readJson } from '@/lib/validation';

/* GET /api/v1/notification-preferences — ค่าปัจจุบัน (ยังไม่เคยตั้ง = ค่าเริ่มต้น) */
export const GET = handler(async () => {
  const user = await requireUser();
  return NextResponse.json({ ok: true, prefs: await getPrefs(user.id) });
});

/* PATCH /api/v1/notification-preferences — แก้เฉพาะคีย์ที่ส่งมา */
export const PATCH = handler(async (req) => {
  const user = await requireUser();
  const body = await readJson<Record<string, unknown>>(req);
  const current = await getPrefs(user.id);

  const bool = (key: keyof typeof DEFAULT_PREFS) =>
    typeof body[key] === 'boolean' ? (body[key] as boolean) : (current[key] as boolean);

  const next = {
    activityReminder: bool('activityReminder'),
    deadlineReminder: bool('deadlineReminder'),
    systemNotice: bool('systemNotice'),
    chatMessage: bool('chatMessage'),
    emailEnabled: bool('emailEnabled'),
    leadDays:
      typeof body.leadDays === 'number' ? clampLeadDays(body.leadDays) : current.leadDays,
  };

  await prisma.notificationPreference.upsert({
    where: { userId: user.id },
    update: next,
    create: { userId: user.id, ...next },
  });

  return NextResponse.json({ ok: true, prefs: next });
});
