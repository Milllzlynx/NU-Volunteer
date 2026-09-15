import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';
import { issueCertificate, notifyCertificateIssued } from '@/lib/certificates';
import { prisma, systemLog } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { requireOwnedActivity } from '@/lib/organizer';
import { readJson } from '@/lib/validation';

/**
 * POST /api/v1/organizer/certificates — ออกใบประกาศให้ใบลงทะเบียนที่รับรองชั่วโมงแล้วแต่ยังไม่มีใบ
 *
 * body: { registrationIds: string[] }
 *
 * ปกติใบออกเองตอนรับรองชั่วโมง เส้นนี้มีไว้ตามเก็บใบที่ค้าง เช่น ชั่วโมงที่รับรองไว้
 * ก่อนระบบจะออกใบอัตโนมัติ — ใบที่ยังไม่เข้าเงื่อนไขหรือมีใบอยู่แล้วจะถูกข้ามและนับรวมไว้ในผลลัพธ์
 */

const MAX_BATCH = 200;

export const POST = handler(async (req) => {
  const user = await requireStaff();
  const body = await readJson<{ registrationIds?: unknown }>(req);

  const ids = Array.isArray(body.registrationIds)
    ? [...new Set(body.registrationIds.map((v) => String(v)).filter(Boolean))]
    : [];
  if (ids.length === 0) fail('VALIDATION_ERROR', 'ยังไม่ได้เลือกรายการ');
  if (ids.length > MAX_BATCH) fail('VALIDATION_ERROR', `เลือกได้ครั้งละไม่เกิน ${MAX_BATCH} รายการ`);

  const rows = await prisma.registration.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      userId: true,
      activityId: true,
      status: true,
      hoursApprovedAt: true,
      hoursAwarded: true,
      user: { select: { email: true } },
    },
  });

  // ตรวจสิทธิ์ครั้งเดียวต่อกิจกรรม ไม่ใช่ต่อใบ — ชุดหนึ่งมักมาจากกิจกรรมเดียวกัน
  const titles = new Map<string, string>();
  for (const activityId of new Set(rows.map((r) => r.activityId))) {
    const a = await requireOwnedActivity(user, activityId);
    titles.set(activityId, a.title);
  }

  let issued = 0;
  let skipped = ids.length - rows.length;

  for (const r of rows) {
    if (r.status !== 'completed' || !r.hoursApprovedAt || r.hoursAwarded <= 0) {
      skipped += 1;
      continue;
    }

    const certificate = await issueCertificate(r.id);
    if (!certificate.created) {
      skipped += 1;
      continue;
    }

    issued += 1;
    await notifyCertificateIssued({
      userId: r.userId,
      email: r.user.email,
      activityTitle: titles.get(r.activityId) ?? '',
      ref: certificate.ref,
    });
  }

  if (issued > 0) {
    await systemLog('info', `ออกใบประกาศ ${issued} ใบ`, {
      actorId: user.id,
      meta: { registrationIds: ids, issued, skipped },
    });
  }

  return NextResponse.json({ ok: true, issued, skipped });
});
