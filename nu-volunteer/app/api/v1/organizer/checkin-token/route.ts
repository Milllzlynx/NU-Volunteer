import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { requireStaff } from '@/lib/auth';
import { currentCheckinToken, isCheckinKind, type CheckinKind } from '@/lib/checkin';
import { publishCheckin } from '@/lib/checkinBus';
import { fail, handler } from '@/lib/errors';
import { requireOwnedActivity } from '@/lib/organizer';
import type { UserModel as User } from '@/lib/generated/prisma/models';

/** ความกว้างของภาพ QR ที่สร้าง — หน้าเว็บย่อ/ขยายด้วย CSS อีกที เลยสร้างใหญ่ไว้ก่อนให้คมบนจอใหญ่ */
const QR_PIXELS = 600;

/** อ่านและตรวจพารามิเตอร์ร่วมของทั้งสองเมท็อด แล้วคืนกิจกรรมที่ผู้เรียกมีสิทธิ์จัดการ */
async function readTarget(req: Request, user: User): Promise<{ activityId: string; kind: CheckinKind }> {
  const url = new URL(req.url);
  const activityId = url.searchParams.get('activityId') ?? '';
  const kind = url.searchParams.get('kind') ?? 'in';

  if (!activityId) fail('VALIDATION_ERROR', 'ต้องระบุกิจกรรมที่จะออก QR');
  if (!isCheckinKind(kind)) fail('VALIDATION_ERROR', 'ประเภทการสแกนต้องเป็น in หรือ out');

  // ตรวจความเป็นเจ้าของก่อนเสมอ ไม่งั้นผู้จัดคนหนึ่งจะออก QR ให้กิจกรรมของหน่วยงานอื่นได้
  await requireOwnedActivity(user, activityId);
  return { activityId, kind };
}

async function respond(activityId: string, kind: CheckinKind, force: boolean) {
  const token = await currentCheckinToken(activityId, kind, force);
  const image = await QRCode.toDataURL(token.payload, {
    width: QR_PIXELS,
    margin: 1,
    errorCorrectionLevel: 'M',
  });

  return NextResponse.json(
    { ok: true, token, image },
    // รหัสมีอายุสั้นและเปลี่ยนตลอด ห้ามให้ตัวกลางไหนเก็บไว้ตอบซ้ำ
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

/**
 * GET /api/v1/organizer/checkin-token?activityId=...&kind=in|out
 *
 * คืนรหัสที่ใช้อยู่ตอนนี้พร้อมภาพ QR สำเร็จรูป
 *
 * วาด QR ฝั่งเซิร์ฟเวอร์แล้วส่งเป็น data URL เพราะไลบรารีวาด QR ไม่ต้องไปโผล่ในบันเดิลของเบราว์เซอร์
 * และหน้าจอฝั่งผู้จัดไม่ต้องรู้วิธีเข้ารหัส แค่เอา <img> ไปแปะ
 */
export const GET = handler(async (req) => {
  const user = await requireStaff();
  const { activityId, kind } = await readTarget(req, user);
  return respond(activityId, kind, false);
});

/**
 * POST /api/v1/organizer/checkin-token?activityId=...&kind=in|out — บังคับเปลี่ยนรหัสเดี๋ยวนี้
 *
 * แยกเป็น POST ไม่ใช่พารามิเตอร์ของ GET เพราะการกดปุ่มนี้ "ยกเลิก" รหัสเดิมทิ้ง
 * ซึ่งเป็นการเปลี่ยนสถานะ ไม่ใช่การอ่าน — และจะได้ไม่มีทางถูกยิงซ้ำโดยการรีเฟรชหน้า
 *
 * ประกาศให้จออื่นของกิจกรรมเดียวกันรู้ด้วย เพราะทุกจอกำลังโชว์รหัสที่เพิ่งถูกยกเลิกไป
 */
export const POST = handler(async (req) => {
  const user = await requireStaff();
  const { activityId, kind } = await readTarget(req, user);

  const res = await respond(activityId, kind, true);
  publishCheckin({ type: 'token', activityId, kind, at: Date.now() });
  return res;
});
