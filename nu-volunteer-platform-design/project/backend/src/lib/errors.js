// error code เดียวกับที่ฝั่ง UI แม็ปข้อความไว้แล้ว — ห้ามเปลี่ยนชื่อ code
export const MESSAGES = {
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
  ACCOUNT_DISABLED: 'บัญชีนี้ถูกระงับการใช้งาน',
  RATE_LIMITED: 'พยายามมากเกินไป กรุณารอสักครู่แล้วลองใหม่',
  CAPTCHA_REQUIRED: 'กรุณายืนยันว่าคุณไม่ใช่บอท',
  UPSTREAM_UNAVAILABLE: 'ระบบไม่พร้อมใช้งานชั่วคราว',
};

const STATUS = {
  INVALID_CREDENTIALS: 401, UNAUTHORIZED: 401, ACCOUNT_DISABLED: 403,
  EMAIL_TAKEN: 409, RATE_LIMITED: 429, CAPTCHA_REQUIRED: 428,
  UPSTREAM_UNAVAILABLE: 503,
};

export class ApiError extends Error {
  constructor(code, message, status) {
    super(message || MESSAGES[code] || code);
    this.code = code;
    this.status = status || STATUS[code] || 400;
  }
}

export function fail(code, message) { throw new ApiError(code, message); }

export function errorHandler(err, req, res, _next) {
  const code = err.code && MESSAGES[err.code] ? err.code : 'UPSTREAM_UNAVAILABLE';
  const status = err.status || STATUS[code] || 500;
  if (status >= 500) console.error('[error]', err);
  res.status(status).json({ ok: false, code, message: err.message || MESSAGES[code] });
}
