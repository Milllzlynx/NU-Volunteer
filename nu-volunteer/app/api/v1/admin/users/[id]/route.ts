import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma, systemLog } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { readJson } from '@/lib/validation';

/**
 * PATCH /api/v1/admin/users/:id — เปลี่ยนบทบาท ระงับ/คืนสิทธิ์ หรือปิดคำขอลบบัญชี
 *
 * ข้อห้ามทั้งหมดบังคับที่นี่ ไม่ใช่แค่ซ่อนปุ่มบนหน้าจอ เพราะหน้าจอเป็นแค่คำแนะนำ
 * ส่วนกติกาที่ทำให้ระบบพังถาวรต้องกันที่ปลายทาง:
 *
 * 1. แอดมินแก้บทบาทหรือระงับบัญชีตัวเองไม่ได้ — กันการล็อกตัวเองออกจากระบบ
 * 2. ปลดแอดมินคนสุดท้ายไม่ได้ — ถ้าเหลือศูนย์คนจะไม่มีใครแต่งตั้งใครได้อีกเลย
 *
 * บัญชีที่มาจากการ seed แก้ได้ตามปกติ — ธง seeded มีไว้ให้ตัวสร้างข้อมูลรู้จักแถวของตัวเอง
 * ไม่ใช่เครื่องหมายว่าห้ามแตะ และบนเครื่องพัฒนาบัญชีเหล่านั้นคือข้อมูลทดสอบทั้งหมดที่มี
 *
 * ทุกการเปลี่ยนแปลงลง SystemLog พร้อมชื่อผู้สั่ง เพราะเป็นการกระทำที่ย้อนดูทีหลังได้ยาก
 * ถ้าไม่บันทึกไว้ (ใครเปลี่ยนบทบาทคนนี้ ตอนไหน)
 */

const ROLES = ['student', 'organizer', 'admin'];

export const PATCH = handler(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const admin = await requireAdmin();

  const body = await readJson<{ role?: unknown; active?: unknown; clearDeletion?: unknown }>(req);

  const target = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      deletionRequestedAt: true,
    },
  });
  if (!target) fail('NOT_FOUND');

  if (target.id === admin.id) {
    fail('VALIDATION_ERROR', 'เปลี่ยนบทบาทหรือระงับบัญชีของตัวเองไม่ได้');
  }

  const data: { role?: string; active?: boolean; deletionRequestedAt?: null; deletionReason?: null } = {};
  const changes: string[] = [];

  /* ── เปลี่ยนบทบาท ── */
  if (body.role !== undefined) {
    const role = String(body.role);
    if (!ROLES.includes(role)) fail('VALIDATION_ERROR', 'บทบาทไม่ถูกต้อง');

    if (role !== target.role) {
      // นับก่อนแก้ ไม่ใช่หลังแก้ — ถ้าคนนี้คือแอดมินคนสุดท้ายต้องหยุดตั้งแต่ตอนนี้
      if (target.role === 'admin') {
        const admins = await prisma.user.count({ where: { role: 'admin', active: true } });
        if (admins <= 1) fail('VALIDATION_ERROR', 'ต้องเหลือผู้ดูแลระบบอย่างน้อยหนึ่งคน');
      }
      data.role = role;
      changes.push(`บทบาท ${target.role} → ${role}`);
    }
  }

  /* ── ระงับ / คืนสิทธิ์ ── */
  if (body.active !== undefined) {
    const active = Boolean(body.active);
    if (active !== target.active) {
      if (!active && target.role === 'admin') {
        const admins = await prisma.user.count({ where: { role: 'admin', active: true } });
        if (admins <= 1) fail('VALIDATION_ERROR', 'ต้องเหลือผู้ดูแลระบบอย่างน้อยหนึ่งคน');
      }
      data.active = active;
      changes.push(active ? 'คืนสิทธิ์การใช้งาน' : 'ระงับบัญชี');
    }
  }

  /* ── ปิดคำขอลบบัญชี ── */
  if (body.clearDeletion) {
    if (target.deletionRequestedAt == null) {
      fail('VALIDATION_ERROR', 'บัญชีนี้ไม่ได้ยื่นคำขอลบไว้');
    }
    data.deletionRequestedAt = null;
    data.deletionReason = null;
    changes.push('ปิดคำขอลบบัญชี');
  }

  if (!changes.length) fail('VALIDATION_ERROR', 'ไม่มีอะไรเปลี่ยนแปลง');

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, role: true, active: true, deletionRequestedAt: true },
  });

  /*
    ระงับบัญชีแล้วต้องเตะออกจากทุกอุปกรณ์ทันที ไม่ใช่รอ token หมดอายุเอง
    getCurrentUser() ปฏิเสธผู้ใช้ที่ active=false อยู่แล้ว แต่ session ที่ค้างในฐานข้อมูล
    ควรถูกล้างไปด้วยเพื่อไม่ให้เหลือร่องรอยที่ทำให้เข้าใจผิดว่ายังใช้งานอยู่
  */
  if (data.active === false) {
    await prisma.session.deleteMany({ where: { userId: id } });
  }

  await systemLog('warning', `แก้ไขบัญชี ${target.name || target.email}: ${changes.join(' · ')}`, {
    actorId: admin.id,
    meta: { targetId: target.id, targetEmail: target.email, changes },
  });

  return NextResponse.json({ ok: true, user: { ...updated, deletionRequested: updated.deletionRequestedAt != null } });
});

/**
 * DELETE /api/v1/admin/users/:id — ลบบัญชีถาวร
 *
 * ต่างจากการระงับบัญชีตรงที่ย้อนกลับไม่ได้ — การลบพาใบลงทะเบียน ใบประกาศ ชั่วโมงสะสม
 * รีวิว และประวัติแชทของคนนั้นหายไปด้วยทั้งหมด (onDelete: Cascade ใน schema)
 * ถ้าเป้าหมายคือแค่ไม่ให้เข้าใช้งาน ให้ใช้ "ระงับบัญชี" ซึ่งเก็บข้อมูลไว้ครบและกลับคืนได้
 *
 * ด่านที่กันไว้ที่นี่ ไม่ใช่แค่ซ่อนปุ่มบนหน้าจอ:
 *
 * 1. ลบบัญชีตัวเองไม่ได้ — คนที่กดจะหลุดออกจากระบบกลางคันและกู้คืนไม่ได้
 * 2. ลบแอดมินคนสุดท้ายไม่ได้ — เหลือศูนย์คนแล้วจะไม่มีใครแต่งตั้งใครได้อีก
 * 3. ลบเจ้าของกิจกรรมที่ยังมีกิจกรรมอยู่ไม่ได้ — Activity.organizer เป็นความสัมพันธ์แบบบังคับ
 *    ฐานข้อมูลจะปฏิเสธเอง แต่ดักไว้ก่อนเพื่อบอกให้ชัดว่าต้องย้ายหรือลบกิจกรรมก่อน
 * 4. ลบผู้ที่เคยปรับชั่วโมงให้คนอื่นไม่ได้ — HourAdjustment.author เป็นความสัมพันธ์แบบบังคับ
 *    เช่นกัน และรายการปรับชั่วโมงต้องคงชื่อผู้อนุมัติไว้เป็นหลักฐาน
 */
export const DELETE = handler(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const admin = await requireAdmin();

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, studentId: true },
  });
  if (!target) fail('NOT_FOUND');

  if (target.id === admin.id) {
    fail('VALIDATION_ERROR', 'ลบบัญชีของตัวเองไม่ได้');
  }

  if (target.role === 'admin') {
    const admins = await prisma.user.count({ where: { role: 'admin', active: true } });
    if (admins <= 1) fail('VALIDATION_ERROR', 'ต้องเหลือผู้ดูแลระบบอย่างน้อยหนึ่งคน');
  }

  // นับสิ่งที่จะหายไปด้วย — ใช้ทั้งเป็นด่านกันลบและเป็นหลักฐานใน SystemLog
  const [organized, adjustmentsMade, registrations, certificates] = await Promise.all([
    prisma.activity.count({ where: { organizerId: id } }),
    prisma.hourAdjustment.count({ where: { authorId: id } }),
    prisma.registration.count({ where: { userId: id } }),
    prisma.certificate.count({ where: { userId: id } }),
  ]);

  if (organized > 0) {
    fail(
      'VALIDATION_ERROR',
      `บัญชีนี้เป็นเจ้าของกิจกรรมอยู่ ${organized} รายการ — ย้ายผู้จัดหรือลบกิจกรรมเหล่านั้นก่อน`,
    );
  }

  if (adjustmentsMade > 0) {
    fail(
      'VALIDATION_ERROR',
      `บัญชีนี้เคยปรับชั่วโมงให้ผู้อื่นไว้ ${adjustmentsMade} รายการ ซึ่งต้องคงชื่อผู้อนุมัติไว้ — ใช้การระงับบัญชีแทน`,
    );
  }

  await prisma.user.delete({ where: { id } });

  await systemLog('warning', `ลบบัญชีถาวร: ${target.name || target.email}`, {
    actorId: admin.id,
    meta: {
      targetEmail: target.email,
      targetRole: target.role,
      studentId: target.studentId,
      // เก็บยอดที่หายไปด้วย เพราะแถวจริงถูกลบไปแล้ว ไล่ย้อนดูทีหลังไม่ได้
      removed: { registrations, certificates },
    },
  });

  return NextResponse.json({ ok: true, removed: { registrations, certificates } });
});
