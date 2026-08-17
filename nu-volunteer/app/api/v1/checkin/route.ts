import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { redeemCheckinCode, type ScanGeo } from '@/lib/checkin';
import { handler } from '@/lib/errors';
import { readJson } from '@/lib/validation';

/**
 * POST /api/v1/checkin — นิสิตแลกรหัสจาก QR ของผู้จัดเป็นการเช็กอิน/เช็กเอาต์
 *
 * ไม่รับ activityId จาก body เพราะรหัสบอกอยู่แล้วว่าเป็นของกิจกรรมไหนและทิศทางใด
 * พิกัดเป็นตัวเลือก ส่งมาก็ใช้ตรวจรัศมี ไม่ส่งก็เช็กอินได้ตามปกติ
 */
export const POST = handler(async (req) => {
  const user = await requireUser();

  const body = await readJson<{ code?: unknown; lat?: unknown; lng?: unknown }>(req);
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const geo: ScanGeo = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;

  const result = await redeemCheckinCode(user, String(body.code ?? ''), geo);

  return NextResponse.json({ ok: true, result }, { headers: { 'Cache-Control': 'no-store' } });
});
