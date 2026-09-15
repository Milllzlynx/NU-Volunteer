import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';
import { issueCertificate, notifyCertificateIssued } from '@/lib/certificates';
import { prisma, systemLog } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { requireOwnedActivity } from '@/lib/organizer';
import { readJson } from '@/lib/validation';

/**
 * PATCH /api/v1/organizer/certificates/:id — เพิกถอน หรือออกใบใหม่แทนใบที่ถูกเพิกถอน
 *
 * body: { action: 'revoke', reason: string } | { action: 'reissue' }
 *
 * ผู้จัดทำได้เฉพาะใบของกิจกรรมตัวเอง แอดมินทำได้ทุกใบ (requireOwnedActivity)
 * ไม่มีการลบใบ — ใบที่ถูกเพิกถอนต้องยังเปิดบนหน้าตรวจสอบได้ ไม่อย่างนั้นคนที่ถือใบกระดาษ
 * ไปยื่นจะเห็นแค่ "ไม่พบ" แทนที่จะรู้ว่าใบนั้นถูกเพิกถอนแล้วเพราะอะไร
 *
 * การเพิกถอนไม่แตะชั่วโมงบนใบลงทะเบียน — ถ้าชั่วโมงผิดด้วย ให้ไม่รับรองจากหน้าอนุมัติชั่วโมง
 */

const ACTIONS = ['revoke', 'reissue'] as const;
type Action = (typeof ACTIONS)[number];

const MAX_REASON = 300;

export const PATCH = handler(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const user = await requireStaff();

  const body = await readJson<{ action?: unknown; reason?: unknown }>(req);
  const action = String(body.action ?? '') as Action;
  if (!ACTIONS.includes(action)) fail('VALIDATION_ERROR', 'คำสั่งไม่ถูกต้อง');

  const cert = await prisma.certificate.findUnique({
    where: { id },
    select: {
      id: true,
      ref: true,
      userId: true,
      activityId: true,
      registrationId: true,
      revokedAt: true,
      user: { select: { email: true, name: true } },
    },
  });
  if (!cert) fail('NOT_FOUND');

  const activity = await requireOwnedActivity(user, cert.activityId);

  if (action === 'revoke') {
    if (cert.revokedAt) fail('VALIDATION_ERROR', 'ใบประกาศนี้ถูกเพิกถอนไปแล้ว');

    const reason = String(body.reason ?? '').trim();
    if (!reason) fail('VALIDATION_ERROR', 'กรุณาระบุเหตุผลที่เพิกถอน');
    if (reason.length > MAX_REASON) fail('VALIDATION_ERROR', 'เหตุผลยาวเกินไป');

    await prisma.certificate.update({
      where: { id },
      data: { revokedAt: new Date(), revokeReason: reason },
    });

    await prisma.notification.create({
      data: {
        userId: cert.userId,
        type: 'certificate',
        title: `ใบประกาศถูกเพิกถอน: ${activity.title}`,
        body: `รหัสอ้างอิง ${cert.ref} · ${reason}`,
        link: '/student/certificates',
      },
    });

    await systemLog('warning', `เพิกถอนใบประกาศ ${cert.ref}: ${cert.user.name}`, {
      actorId: user.id,
      meta: { certificateId: id, ref: cert.ref, activityId: cert.activityId, reason },
    });

    return NextResponse.json({ ok: true });
  }

  /* ── ออกใบใหม่แทน ── */
  if (!cert.revokedAt) fail('VALIDATION_ERROR', 'ใบประกาศนี้ยังใช้งานได้อยู่');
  if (!cert.registrationId) {
    fail('VALIDATION_ERROR', 'ใบนี้มีใบใหม่ออกแทนไปแล้ว');
  }

  const certificate = await issueCertificate(cert.registrationId);

  await notifyCertificateIssued({
    userId: cert.userId,
    email: cert.user.email,
    activityTitle: activity.title,
    ref: certificate.ref,
    title: `ออกใบประกาศใหม่แล้ว: ${activity.title}`,
    body: `ใบใหม่รหัสอ้างอิง ${certificate.ref} ใช้แทนใบ ${cert.ref} ที่ถูกเพิกถอน`,
  });

  await systemLog('info', `ออกใบประกาศใหม่ ${certificate.ref} แทน ${cert.ref}`, {
    actorId: user.id,
    meta: { previousId: id, certificateId: certificate.id, activityId: cert.activityId },
  });

  return NextResponse.json({ ok: true, certificate });
});
