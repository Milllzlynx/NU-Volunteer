import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';
import { manualCheckin } from '@/lib/checkin';
import { fail, handler } from '@/lib/errors';
import { readJson } from '@/lib/validation';

/**
 * PATCH /api/v1/organizer/registrations/:id/checkin — ผู้จัดกดเช็กอิน/เช็กเอาต์ให้นิสิต
 *
 * แยกจาก PATCH ของใบลงทะเบียนที่ข้าง ๆ กัน เพราะนั่นเป็นการ "พิจารณาใบสมัคร"
 * ซึ่งรับเฉพาะใบที่ยังรออนุมัติ ส่วนอันนี้ทำกับใบที่อนุมัติไปแล้วและกำลังอยู่หน้างาน
 *
 * ไม่รับเวลาจากผู้เรียก — ใช้เวลาปัจจุบันของเซิร์ฟเวอร์เหมือนตอนสแกน QR
 * เพื่อไม่ให้มีสองแหล่งความจริงว่านิสิตเข้างานตอนไหน
 */

const KINDS = ['in', 'out'] as const;
type Kind = (typeof KINDS)[number];

export const PATCH = handler(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const user = await requireStaff();

  const body = await readJson<{ kind?: unknown }>(req);
  const kind = String(body.kind ?? '') as Kind;
  if (!KINDS.includes(kind)) fail('VALIDATION_ERROR', 'ต้องระบุว่าเช็กอินหรือเช็กเอาต์');

  const result = await manualCheckin(user, id, kind);

  return NextResponse.json({ ok: true, result }, { headers: { 'Cache-Control': 'no-store' } });
});
