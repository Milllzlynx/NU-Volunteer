import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { readImageSrc } from '@/lib/imageSrc';
import { readJson } from '@/lib/validation';

/**
 * POST /api/v1/registrations/:id/evidence — นิสิตส่งหลักฐานการเข้าร่วม
 *
 * เก็บเป็น data URL เหมือนภาพอื่นทั้งระบบ ไม่ได้อัปโหลดเป็นไฟล์แยก
 * จึงตรวจด้วย readImageSrc ตัวเดียวกับที่ภาพกิจกรรมและรูปโปรไฟล์ใช้
 *
 * ส่งใหม่ได้เรื่อย ๆ ตราบใดที่ผู้จัดยังไม่ผ่านให้ — เก็บเป็นแถวใหม่ทุกครั้ง
 * ไม่ทับของเดิม เพราะประวัติว่าเคยส่งอะไรไปเป็นหลักฐานของทั้งสองฝ่ายเวลามีข้อโต้แย้ง
 */

/** ชนิดไฟล์จาก data URL — ใช้แสดงในหน้าตรวจของผู้จัด ไม่ได้ใช้ตัดสินใจอะไร */
function dataUrlMime(src: string): string {
  const m = /^data:([^;,]+)[;,]/.exec(src);
  return m ? m[1] : '';
}

/** ขนาดโดยประมาณของ base64 — 4 ตัวอักษรต่อ 3 ไบต์ */
function dataUrlBytes(src: string): number {
  const i = src.indexOf('base64,');
  if (i < 0) return 0;
  const chars = src.length - i - 'base64,'.length;
  return Math.round((chars * 3) / 4);
}

export const POST = handler(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireRole('student');
  const { id } = await ctx.params;

  const registration = await prisma.registration.findUnique({
    where: { id },
    include: { evidence: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });
  // ไม่บอกว่าใบลงทะเบียนของคนอื่นมีอยู่จริง — ตอบเหมือนไม่พบ เหมือนเส้นทางยกเลิก
  if (!registration || registration.userId !== user.id) fail('NOT_FOUND');

  /*
    ช่วงที่ส่งได้คือหลังเช็กเอาต์เท่านั้น ก่อนหน้านั้นยังไม่มีอะไรให้พิสูจน์
    และเมื่อผู้จัดรับรองชั่วโมงแล้ว (completed) เรื่องก็จบไปแล้ว
  */
  if (registration.status !== 'checked-out') {
    fail('VALIDATION_ERROR', 'ส่งหลักฐานได้หลังเช็กเอาต์ และก่อนที่ผู้จัดจะรับรองชั่วโมง');
  }

  const latest = registration.evidence[0];
  if (latest?.status === 'approved') {
    fail('VALIDATION_ERROR', 'หลักฐานของคุณผ่านการตรวจแล้ว ไม่ต้องส่งซ้ำ');
  }

  const body = await readJson<{ fileUrl?: unknown; fileName?: unknown; note?: unknown }>(req);
  const fileUrl = readImageSrc(body.fileUrl, 'หลักฐาน');
  if (!fileUrl) fail('VALIDATION_ERROR', 'กรุณาแนบรูปหลักฐาน');

  const evidence = await prisma.evidence.create({
    data: {
      registrationId: registration.id,
      fileUrl,
      fileName: String(body.fileName ?? '').trim().slice(0, 120),
      mimeType: dataUrlMime(fileUrl),
      sizeBytes: dataUrlBytes(fileUrl),
      note: String(body.note ?? '').trim().slice(0, 300),
    },
    select: { id: true, status: true, createdAt: true },
  });

  return NextResponse.json({ ok: true, evidence });
});
