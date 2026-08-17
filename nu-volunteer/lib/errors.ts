import { NextResponse } from 'next/server';

// error code เดียวกับที่ฝั่ง UI แม็ปข้อความไว้แล้ว — ห้ามเปลี่ยนชื่อ code
export const MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
  EMAIL_TAKEN: 'อีเมลนี้มีบัญชีอยู่แล้ว',
  EMAIL_DOMAIN: 'กรุณาใช้อีเมลมหาวิทยาลัย @nu.ac.th เท่านั้น',
  WEAK_PASSWORD: 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร และมีทั้งตัวอักษรและตัวเลข',
  SAME_PASSWORD: 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม',
  TERMS_REQUIRED: 'กรุณายอมรับข้อกำหนดการใช้งานก่อนสมัคร',
  TOKEN_INVALID: 'ลิงก์รีเซ็ตไม่ถูกต้องหรือถูกใช้ไปแล้ว',
  TOKEN_USED: 'ลิงก์รีเซ็ตไม่ถูกต้องหรือถูกใช้ไปแล้ว',
  TOKEN_EXPIRED: 'ลิงก์รีเซ็ตหมดอายุแล้ว',
  UNAUTHORIZED: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
  FORBIDDEN: 'คุณไม่มีสิทธิ์ใช้งานส่วนนี้',
  NOT_FOUND: 'ไม่พบข้อมูลที่ต้องการ',
  ACCOUNT_DISABLED: 'บัญชีนี้ถูกระงับการใช้งาน',
  RATE_LIMITED: 'พยายามมากเกินไป กรุณารอสักครู่แล้วลองใหม่',
  CAPTCHA_REQUIRED: 'กรุณายืนยันว่าคุณไม่ใช่บอท',
  UPSTREAM_UNAVAILABLE: 'ระบบไม่พร้อมใช้งานชั่วคราว',
  VALIDATION_ERROR: 'ข้อมูลที่ส่งมาไม่ถูกต้อง',

  // โดเมนกิจกรรม
  ACTIVITY_FULL: 'ที่นั่งเต็มแล้ว',
  ACTIVITY_CLOSED: 'กิจกรรมนี้ปิดรับสมัครแล้ว',
  REGISTRATION_NOT_OPEN: 'ยังไม่ถึงวันเปิดรับสมัครของกิจกรรมนี้',
  ALREADY_REGISTERED: 'คุณลงทะเบียนกิจกรรมนี้ไว้แล้ว',
  NOT_REGISTERED: 'ไม่พบการลงทะเบียนของคุณสำหรับกิจกรรมนี้',
  NOT_APPROVED: 'การลงทะเบียนยังไม่ได้รับอนุมัติ',
  CANCEL_REQUESTED: 'คุณส่งคำขอยกเลิกไว้แล้ว รอผู้จัดพิจารณา',
  CANCEL_TOO_LATE: 'ยกเลิกได้ก่อนวันจัดกิจกรรมอย่างน้อย 3 วัน',
  CANCEL_NOT_ALLOWED: 'กิจกรรมนี้ยกเลิกไม่ได้แล้ว',
  QR_INVALID: 'QR ไม่ถูกต้อง',
  QR_EXPIRED: 'QR หมดอายุแล้ว กรุณาสแกนรหัสใหม่จากผู้จัด',
  ALREADY_CHECKED_IN: 'คุณเช็กอินกิจกรรมนี้แล้ว',
  NOT_CHECKED_IN: 'ต้องเช็กอินก่อนจึงจะเช็กเอาต์ได้',
  ALREADY_CHECKED_OUT: 'คุณเช็กเอาต์กิจกรรมนี้แล้ว',
  OUT_OF_RANGE: 'คุณอยู่นอกพื้นที่จัดกิจกรรม',
  EVIDENCE_REQUIRED: 'ต้องอัปโหลดหลักฐานก่อน',
  REVIEW_NOT_ALLOWED: 'เขียนรีวิวได้เฉพาะผู้ที่เข้าร่วมกิจกรรมจนจบแล้วเท่านั้น',
  FILE_TOO_LARGE: 'ไฟล์มีขนาดใหญ่เกินกำหนด',
  UNSUPPORTED_FILE: 'ชนิดไฟล์นี้ไม่รองรับ',
  MAINTENANCE: 'ระบบกำลังปิดปรับปรุงชั่วคราว',
};

const STATUS: Record<string, number> = {
  INVALID_CREDENTIALS: 401,
  UNAUTHORIZED: 401,
  ACCOUNT_DISABLED: 403,
  FORBIDDEN: 403,
  REVIEW_NOT_ALLOWED: 403,
  NOT_FOUND: 404,
  EMAIL_TAKEN: 409,
  ALREADY_REGISTERED: 409,
  CANCEL_REQUESTED: 409,
  ALREADY_CHECKED_IN: 409,
  ALREADY_CHECKED_OUT: 409,
  ACTIVITY_FULL: 409,
  REGISTRATION_NOT_OPEN: 409,
  RATE_LIMITED: 429,
  CAPTCHA_REQUIRED: 428,
  FILE_TOO_LARGE: 413,
  MAINTENANCE: 503,
  UPSTREAM_UNAVAILABLE: 503,
};

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message?: string, status?: number) {
    super(message || MESSAGES[code] || code);
    this.code = code;
    this.status = status || STATUS[code] || 400;
  }
}

export function fail(code: string, message?: string): never {
  throw new ApiError(code, message);
}

/** รูปแบบ error body: { ok:false, code, message } — ตรงกับที่ nuv-api.js อ่าน */
export function errorResponse(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json(
      { ok: false, code: err.code, message: err.message },
      { status: err.status },
    );
  }
  console.error('[error]', err);
  return NextResponse.json(
    { ok: false, code: 'UPSTREAM_UNAVAILABLE', message: MESSAGES.UPSTREAM_UNAVAILABLE },
    { status: 500 },
  );
}

/** ครอบ route handler ให้ ApiError กลายเป็น response รูปแบบเดียวกันเสมอ */
export function handler<T extends unknown[]>(
  fn: (req: Request, ...args: T) => Promise<Response>,
) {
  return async (req: Request, ...args: T): Promise<Response> => {
    try {
      return await fn(req, ...args);
    } catch (e) {
      return errorResponse(e);
    }
  };
}
