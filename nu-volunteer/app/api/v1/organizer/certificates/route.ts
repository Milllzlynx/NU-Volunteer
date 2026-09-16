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
const MAX_REASON = 300;

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

/**
 * PATCH /api/v1/organizer/certificates — เพิกถอนใบประกาศหลายใบพร้อมกัน
 *
 * body: { action: 'revoke', ids: string[], reason: string }
 *
 * แยกจาก PATCH รายใบที่ /:id เพราะหน้าใบประกาศเลือกได้ทีละหลายสิบแถว การยิงทีละใบ
 * จากเบราว์เซอร์ช้าและพังกลางคันได้ — ล้มใบที่สิบจากยี่สิบใบแล้วผู้ใช้ไม่รู้ว่าใบไหนผ่านบ้าง
 *
 * ใช้เหตุผลเดียวกันทั้งชุด เพราะการเลือกหลายใบพร้อมกันมักมาจากเหตุเดียวกัน
 * ใบที่ถูกเพิกถอนไปแล้วหรือไม่ได้อยู่ในขอบเขตของผู้ใช้จะถูกข้ามและนับไว้ใน skipped
 * ไม่ใช่ทำให้ทั้งชุดล้ม — ผู้ใช้จะได้ไม่ต้องไล่หาว่าใบไหนเป็นตัวปัญหา
 */
export const PATCH = handler(async (req) => {
  const user = await requireStaff();
  const body = await readJson<{ action?: unknown; ids?: unknown; reason?: unknown }>(req);

  if (String(body.action ?? '') !== 'revoke') fail('VALIDATION_ERROR', 'คำสั่งไม่ถูกต้อง');

  const ids = Array.isArray(body.ids)
    ? [...new Set(body.ids.map((v) => String(v)).filter(Boolean))]
    : [];
  if (ids.length === 0) fail('VALIDATION_ERROR', 'ยังไม่ได้เลือกรายการ');
  if (ids.length > MAX_BATCH) fail('VALIDATION_ERROR', `เลือกได้ครั้งละไม่เกิน ${MAX_BATCH} รายการ`);

  const reason = String(body.reason ?? '').trim();
  if (!reason) fail('VALIDATION_ERROR', 'กรุณาระบุเหตุผลที่เพิกถอน');
  if (reason.length > MAX_REASON) fail('VALIDATION_ERROR', 'เหตุผลยาวเกินไป');

  const rows = await prisma.certificate.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      ref: true,
      userId: true,
      activityId: true,
      revokedAt: true,
      user: { select: { name: true } },
    },
  });

  // ตรวจสิทธิ์ครั้งเดียวต่อกิจกรรม ไม่ใช่ต่อใบ — ชุดหนึ่งมักมาจากกิจกรรมเดียวกัน
  const titles = new Map<string, string>();
  for (const activityId of new Set(rows.map((r) => r.activityId))) {
    const a = await requireOwnedActivity(user, activityId);
    titles.set(activityId, a.title);
  }

  const targets = rows.filter((r) => r.revokedAt == null);
  const skipped = ids.length - targets.length;
  const revokedAt = new Date();

  if (targets.length > 0) {
    await prisma.certificate.updateMany({
      where: { id: { in: targets.map((r) => r.id) } },
      data: { revokedAt, revokeReason: reason },
    });

    await prisma.notification.createMany({
      data: targets.map((r) => ({
        userId: r.userId,
        type: 'certificate',
        title: `ใบประกาศถูกเพิกถอน: ${titles.get(r.activityId) ?? ''}`,
        body: `รหัสอ้างอิง ${r.ref} · ${reason}`,
        link: '/student/certificates',
      })),
    });

    await systemLog('warning', `เพิกถอนใบประกาศ ${targets.length} ใบ`, {
      actorId: user.id,
      meta: { certificateIds: targets.map((r) => r.id), refs: targets.map((r) => r.ref), reason, skipped },
    });
  }

  return NextResponse.json({ ok: true, revoked: targets.length, skipped });
});
