import { fail } from '@/lib/errors';

/**
 * ตรวจค่าลิงก์และค่าภาพที่รับมาจากฟอร์ม
 *
 * ทุกที่ในระบบที่ให้ผู้ใช้ใส่ภาพเองใช้ตัวตรวจชุดนี้ร่วมกัน — ภาพกิจกรรม ภาพแผนที่
 * รูปโปรไฟล์ ภาพข่าว และภาพแบนเนอร์ ถ้าแต่ละที่ตรวจกันเอง สุดท้ายจะมีที่ที่ลืมตรวจ
 * แล้วกลายเป็นช่องโหว่ที่เดียวก็พอ
 */

/**
 * ภาพที่ผู้ใช้อัปโหลดถูกเก็บเป็น data URL — จำกัดชนิดไว้เท่าที่ฝั่งฟอร์มสร้างได้จริง
 *
 * จุดสำคัญคือ `image/` ที่ตายตัว ไม่ใช่ data: อะไรก็ได้ — `data:text/html` คือ
 * ตัวที่กลายเป็น XSS ได้จริงเมื่อถูกเปิดตรง ๆ ส่วน data:image/* ที่ลงเอยใน <img src>
 * เบราว์เซอร์ตีความเป็นภาพเท่านั้น สคริปต์ข้างในไม่ทำงาน
 */
const DATA_IMAGE = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/;

/**
 * ขนาดสูงสุดของภาพหนึ่งใบที่ยอมให้เก็บ นับเป็นจำนวนตัวอักษรของ data URL
 *
 * ฝั่งฟอร์มย่อภาพให้เหลือหลักร้อยกิโลไบต์อยู่แล้ว (lib/imageFile.ts) ค่านี้จึงเป็น
 * เพดานกันพลาดสำหรับคนที่ยิง API ตรง ไม่ใช่ขนาดที่ตั้งใจให้ใช้จริง
 * ปล่อยให้ใหญ่กว่านี้แถวเดียวก็ทำให้หน้าที่แสดงภาพนั้นส่ง HTML หนักจนสังเกตได้
 */
export const MAX_IMAGE_CHARS = 3_000_000;

/**
 * เพดานสำหรับรูปโปรไฟล์ เล็กกว่าที่อื่นเพราะรูปโปรไฟล์ถูกฝังซ้ำหลายจุดต่อหนึ่งหน้า
 * (รายชื่อผู้เข้าร่วม ห้องแชท รายการรออนุมัติ) ไม่ใช่ภาพเดียวต่อหนึ่งหน้าแบบภาพหน้าปก
 */
export const MAX_AVATAR_CHARS = 200_000;

/**
 * อ่านลิงก์จากฟอร์ม — เว้นว่างได้ แต่ถ้ากรอกต้องเป็น http/https เต็มรูปแบบ
 *
 * ใช้กับค่าที่ลงเอยใน href ซึ่งผู้ใช้กดแล้วเบราว์เซอร์พาไปตามนั้นจริง
 * ถ้าปล่อยสตริงอะไรก็ผ่าน คนหนึ่งก็วาง `javascript:` ลงในลิงก์แผนที่ได้ทันที
 */
export function readHttpUrl(raw: unknown, field: string): string | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;

  let parsed: URL;
  try {
    parsed = new URL(s);
  } catch {
    fail('VALIDATION_ERROR', `${field}ต้องเป็นลิงก์เต็ม เช่น https://...`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    fail('VALIDATION_ERROR', `${field}รองรับเฉพาะลิงก์ http หรือ https`);
  }
  if (s.length > 2000) fail('VALIDATION_ERROR', `${field}ยาวเกินไป`);
  return s;
}

/**
 * อ่านค่าภาพ — รับได้ทั้งลิงก์ http/https และ data URL ของภาพที่อัปโหลดเข้ามา
 *
 * ต่างจาก readHttpUrl ตรงที่ค่านี้ลงเอยใน src ของ <img> เท่านั้น ไม่ใช่ href
 * ยังรับลิงก์ http อยู่เพราะข้อมูลเดิมในระบบเก็บเป็นลิงก์ไว้ก่อนจะมีตัวอัปโหลด
 * และการแก้ระเบียนเดิมโดยไม่แตะรูปต้องไม่ถูกปฏิเสธ
 */
export function readImageSrc(
  raw: unknown,
  field: string,
  opts: { maxChars?: number } = {},
): string | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;

  if (s.startsWith('data:')) {
    if (!DATA_IMAGE.test(s)) fail('VALIDATION_ERROR', `${field}เป็นไฟล์ภาพที่ระบบไม่รองรับ`);
    if (s.length > (opts.maxChars ?? MAX_IMAGE_CHARS)) {
      fail('VALIDATION_ERROR', `${field}มีขนาดใหญ่เกินไป`);
    }
    return s;
  }
  return readHttpUrl(s, field);
}
