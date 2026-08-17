import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { MAX_AVATAR_CHARS, readImageSrc } from '@/lib/imageSrc';
import { readJson } from '@/lib/validation';

const NAME_MAX = 80;
const BIO_MAX = 300;
const PHONE_MAX = 20;

/**
 * PATCH /api/v1/profile — แก้ข้อมูลโปรไฟล์ของตัวเอง
 *
 * แก้ได้เฉพาะฟิลด์ที่เป็นของผู้ใช้เอง — อีเมล บทบาท และรหัสนิสิตแก้ที่นี่ไม่ได้
 * (อีเมลใช้ยืนยันตัวตน ส่วนบทบาท/รหัสนิสิตเป็นข้อมูลที่มหาวิทยาลัยกำหนด)
 */
export const PATCH = handler(async (req) => {
  const user = await requireUser();
  const body = await readJson<Record<string, unknown>>(req);

  const data: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) fail('VALIDATION_ERROR', 'กรุณากรอกชื่อ');
    if (name.length > NAME_MAX) fail('VALIDATION_ERROR', `ชื่อต้องไม่เกิน ${NAME_MAX} ตัวอักษร`);
    data.name = name;
  }

  if (body.bio !== undefined) {
    const bio = String(body.bio).trim();
    if (bio.length > BIO_MAX) fail('VALIDATION_ERROR', `แนะนำตัวต้องไม่เกิน ${BIO_MAX} ตัวอักษร`);
    data.bio = bio;
  }

  if (body.phone !== undefined) {
    const phone = String(body.phone).trim();
    if (phone && !/^[0-9+\-\s]{6,20}$/.test(phone)) fail('VALIDATION_ERROR', 'เบอร์โทรไม่ถูกต้อง');
    if (phone.length > PHONE_MAX) fail('VALIDATION_ERROR', 'เบอร์โทรยาวเกินไป');
    data.phone = phone || null;
  }

  if (body.faculty !== undefined) {
    const faculty = String(body.faculty).trim();
    data.faculty = faculty || null;
  }

  if (body.avatarUrl !== undefined) {
    // รับได้ทั้งลิงก์ http(s) ของเดิม และ data:image/* ที่มาจากตัวอัปโหลดในหน้าโปรไฟล์
    // ตัวตรวจกลางกัน javascript: กับ data: ชนิดอื่นให้แล้ว (lib/imageSrc.ts)
    data.avatarUrl = readImageSrc(body.avatarUrl, 'รูปโปรไฟล์', { maxChars: MAX_AVATAR_CHARS });
  }

  if (typeof body.shareContact === 'boolean') data.shareContact = body.shareContact;

  if (!Object.keys(data).length) fail('VALIDATION_ERROR', 'ไม่มีข้อมูลที่จะบันทึก');

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
    select: {
      id: true,
      name: true,
      bio: true,
      phone: true,
      faculty: true,
      avatarUrl: true,
      shareContact: true,
    },
  });

  return NextResponse.json({ ok: true, profile: updated });
});
