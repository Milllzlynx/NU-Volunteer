# NU Volunteer — Auth Backend

Backend จริงสำหรับ Login / Register / Forgot / Reset ของ NU Volunteer
(ทดแทน mock ใน `nuv-api.js` โดยไม่ต้องแก้โค้ด UI — เปลี่ยนแค่จุด `transport()`)

## Stack
Express 4 · Prisma (SQLite ตอน dev / Postgres ตอน production) · bcryptjs (cost 12) ·
JWT access token (15 นาที) + refresh token แบบ rotation เก็บใน DB · nodemailer (SMTP/SendGrid/SES)

## เริ่มใช้งาน
```bash
cd backend
cp .env.example .env        # แล้วแก้ค่า secret / SMTP / DATABASE_URL
npm install
npx prisma db push          # สร้างตาราง (production ใช้ prisma migrate deploy)
npm run seed                # บัญชีทดสอบ 4 บัญชี (staging/dev เท่านั้น)
npm run dev                 # http://localhost:8080/api/v1
```

## เปิดใช้ฝั่ง frontend
ใส่ก่อนโหลด `nuv-api.js`:
```html
<script>window.NUV_API_BASE = 'https://api.nuv.nu.ac.th/api/v1';</script>
```
เมื่อมีค่านี้ `transport()` จะยิง `fetch` จริงพร้อม `credentials:'include'`
ถ้าไม่ตั้งค่า ระบบจะกลับไปใช้โหมดจำลองเดิม (ใช้สาธิต/ออกแบบ)

## Endpoints
| Method | Path | หมายเหตุ |
|---|---|---|
| POST | `/auth/register` | ตรวจโดเมน @nu.ac.th, ความแข็งแรงรหัสผ่าน, ToS; unique constraint กัน email ซ้ำ |
| POST | `/auth/login` | คืน `{account}` + ตั้ง httpOnly cookie `nuv_at`/`nuv_rt` |
| POST | `/auth/refresh` | หมุน refresh token (rotation) ออก access ใหม่ |
| GET | `/auth/me` | โปรไฟล์ปัจจุบันจาก token |
| GET | `/auth/sessions` | รายการอุปกรณ์ที่ล็อกอินอยู่ |
| POST | `/auth/password` | เปลี่ยนรหัสผ่าน + เพิกถอนเซสชันอื่นทั้งหมด |
| POST | `/auth/logout-other-sessions` | ออกจากระบบทุกอุปกรณ์อื่น |
| POST | `/auth/logout` | เพิกถอนเซสชันปัจจุบัน + ล้าง cookie |
| POST | `/auth/forgot` | สร้าง reset token (sha256 ใน DB, อายุ 30 นาที) + ส่งอีเมลจริง |
| POST | `/auth/reset` | ตรวจ token จาก DB, ตั้งรหัสใหม่, เพิกถอนทุกเซสชัน |
| GET | `/auth/check-email` | ใช้ในขั้นตอนสมัคร |

## Error codes (ตรงกับที่ UI แม็ปข้อความไว้แล้ว)
`INVALID_CREDENTIALS` · `EMAIL_TAKEN` · `EMAIL_DOMAIN` · `WEAK_PASSWORD` · `SAME_PASSWORD` ·
`TERMS_REQUIRED` · `TOKEN_INVALID` · `TOKEN_USED` · `TOKEN_EXPIRED` · `UNAUTHORIZED` ·
`ACCOUNT_DISABLED` · `RATE_LIMITED` · `CAPTCHA_REQUIRED` · `UPSTREAM_UNAVAILABLE`

รูปแบบ error body: `{ "ok": false, "code": "EMAIL_TAKEN", "message": "อีเมลนี้มีบัญชีอยู่แล้ว" }`

## บัญชีทดสอบ (staging/dev เท่านั้น)
| บทบาท | อีเมล | รหัสผ่าน |
|---|---|---|
| นิสิต | student@nu.ac.th | Test1234! |
| นิสิต (ผู้กู้ยืม กยศ.) | piyada.s@nu.ac.th | Test1234! |
| ผู้จัดกิจกรรม | organizer@nu.ac.th | Test1234! |
| แอดมิน | admin@nu.ac.th | Test1234! |

## ความปลอดภัยที่ตั้งไว้แล้ว
- bcrypt cost 12 — ไม่มีการเก็บรหัสผ่าน plain text ที่ใดเลย
- refresh token เก็บเป็น sha256 ใน DB (ตัว token อยู่ใน httpOnly cookie เท่านั้น)
- `tokensValidFrom` ทำให้ access token เก่าใช้ไม่ได้ทันทีเมื่อเปลี่ยนรหัสผ่าน
- rate limit: login/register 5 ครั้ง/นาที/IP+email, forgot 3 ครั้ง/15 นาที — นับเฉพาะครั้งที่ล้มเหลว
- CAPTCHA (Turnstile/reCAPTCHA) เริ่มบังคับหลังล้มเหลว 3 ครั้งจาก IP เดิมใน 15 นาที
- `AuthLog` บันทึกทุกความพยายาม (ผูกกับ System Log ฝั่งแอดมิน)
- helmet + CORS allow-list + บังคับ HTTPS + secure/SameSite cookie ใน production

## Checklist ก่อนขึ้น production
- [ ] `SEED_ENABLED=false`, ปิดบัญชีทดสอบ
- [ ] เปลี่ยน `JWT_*_SECRET` เป็นค่าสุ่ม ≥32 ตัวอักษร
- [ ] เปลี่ยน provider ใน `schema.prisma` เป็น `postgresql` + `prisma migrate deploy`
- [ ] `COOKIE_SECURE=true`, `CORS_ORIGINS` เฉพาะโดเมนจริง
- [ ] ทดสอบส่งอีเมลจริงผ่าน SMTP มหาวิทยาลัย

---

## Pre-launch checklist — ข้อมูลตัวอย่างและระบบเดโม

ก่อนเปิดใช้งานจริง ทีมเนื้อหา/ทีมระบบต้องเคาะรายการนี้ให้ครบ (ห้ามปล่อยข้อมูลปลอมขึ้น production)

- [ ] **กิจกรรมตัวอย่าง** ("ปลูกป่าชายเลนฟื้นฟูชายฝั่ง", "ค่ายอาสาสอนน้องคณิตศาสตร์" ฯลฯ) — เลือกอย่างใดอย่างหนึ่ง:
      ① ลบทั้งหมด เริ่มด้วยฐานข้อมูลว่าง หรือ ② คงไว้แล้วแก้ข้อมูลทุกช่อง (วันเวลา สถานที่ ผู้จัด จำนวนที่นั่ง รูปภาพ) ให้ตรงความจริง
- [ ] **ผู้ใช้ตัวอย่าง** ในรายชื่อผู้ใช้งาน — ลบออกทั้งหมด เหลือเฉพาะบัญชีจริง
- [ ] **รีวิว / ข่าวสาร / ข้อความติดต่อ / แชท** ที่เป็นข้อมูลตั้งต้น — ลบออก
- [ ] `SEED_ENABLED=false` และปิดบัญชีทดสอบทั้ง 4 บัญชี
- [ ] ตั้ง `window.NUV_API_BASE` บนโดเมนจริง (ทำให้โหมดจำลองปิดถาวร — `?mock=1` ใช้ไม่ได้บน host ที่ไม่ใช่ localhost/dev/staging/test)
- [ ] ยืนยันว่าหน้า Login ไม่มีทางลัดเข้าระบบ (ปุ่มทดลองตามบทบาทถูกถอดออกแล้ว)
- [ ] ยืนยันว่าโซนอันตรายมีเฉพาะ "ล้างข้อมูลทั้งหมด" (ต้องพิมพ์ `NU VOLUNTEER` ยืนยัน) ไม่มีปุ่มคืนค่าข้อมูลตัวอย่าง
- [ ] ทดสอบ end-to-end ด้วยบัญชีที่สมัครใหม่จริงบน production
