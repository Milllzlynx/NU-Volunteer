# NU Volunteer — คู่มือ deploy (ฟรีทั้งหมด)

> อัปเดต สิงหาคม 2569 · ทุกตัวเลขในเอกสารนี้ตรวจสอบกับหน้า pricing/docs ของผู้ให้บริการแล้ว
> แต่ผู้ให้บริการเปลี่ยนเงื่อนไขได้ตลอด — ตรวจซ้ำก่อนพึ่งพาระยะยาว

> **เปลี่ยนฐานข้อมูลเป็น SQLite แล้ว** — เอกสารนี้เดิมวางไว้บน Vercel + Neon Postgres
> ตอนนี้ระบบใช้ SQLite ไฟล์เดียว (`prisma/schema.prisma` → `provider = "sqlite"`)
> ซึ่ง **รันบน Vercel ไม่ได้** ส่วนที่เกี่ยวกับ Neon/Vercel จึงถูกเขียนใหม่ตามด้านล่าง

## สรุปสแตกที่เลือก

| ส่วน | บริการ | หมายเหตุ | ทำไมเลือกตัวนี้ |
|---|---|---|---|
| เว็บ + API | **เครื่องเดียวที่รัน Node ได้** (เครื่องมหาวิทยาลัย / VPS เล็ก) | ต้องมีดิสก์ถาวรและรันแค่ instance เดียว | SQLite เป็นไฟล์บนดิสก์ ต้องให้โปรเซสเดียวถือไฟล์นั้น |
| ฐานข้อมูล | **SQLite** (`better-sqlite3`) | ไฟล์เดียว สำรองด้วยการก๊อปไฟล์ | ไม่ต้องดูแล server ฐานข้อมูล ไม่มีโควตา ไม่มีวันหมดอายุ |
| ไฟล์อัปโหลด | **Cloudflare R2** | 10 GB + ไม่คิดค่า egress | ระบบเก็บหลักฐาน/รูปกิจกรรม — แยกไฟล์ใหญ่ออกจากดิสก์แอป |
| อีเมล | **Brevo** | 300 ฉบับ/วัน (~9,000/เดือน) | รีเซ็ตรหัสผ่าน + แจ้งเตือน — โควตาสูงสุดในกลุ่มที่ยังฟรีถาวร |

### ข้อแลกเปลี่ยนของการใช้ SQLite

**ได้:** dev กับ prod เป็นเอนจินเดียวกัน (ไม่มี bug ที่โผล่เฉพาะตอน deploy), ตั้งค่าเครื่องใหม่จบใน
คำสั่งเดียว, สำรองข้อมูล = ก๊อปไฟล์, ไม่มีโควตา CU-hours หรือ project หลับ

**เสีย:** ผูกกับเครื่องเดียว — ขยายเป็นหลาย instance ไม่ได้ และ**ไฟล์ `.db` บนดิสก์ย้ายขึ้น
serverless (Vercel/Netlify) ไม่ได้** เพราะดิสก์หายทุก request และหลายโปรเซสเขียนไฟล์เดียวกันไม่ได้
ถ้าวันหนึ่งต้องขยาย ให้ย้ายกลับไป Postgres — สคีมานี้ไม่ได้ใช้ฟีเจอร์เฉพาะของเอนจินไหน
จึงย้ายได้ด้วยการเปลี่ยน `provider` + adapter (ดูหัวข้อท้ายไฟล์)

> **ขึ้น serverless ได้ ถ้าย้ายฐานข้อมูลไป Turso** — Turso คือ libSQL ซึ่งก็คือ SQLite
> ที่คุยผ่าน HTTP แทนการอ่านไฟล์ สคีมาและ migration ชุดเดิมใช้ได้ทั้งหมด
> ไม่ต้องแก้ `provider` ดูหัวข้อ [Netlify + Turso](#netlify--turso) ด้านล่าง

### ทำไมไม่ใช่ตัวอื่น

- **Vercel / Netlify / serverless ทุกเจ้า** — ใช้กับ SQLite **แบบไฟล์บนดิสก์** ไม่ได้ตามเหตุผลด้านบน
  (ใช้กับ Turso ได้ ดูหัวข้อ Netlify + Turso)
- **Render free web service** — หลับหลังไม่มีคนใช้ 15 นาที ตื่นครั้งละ ~1 นาที
  และ free tier **ไม่มี persistent disk** ไฟล์ `.db` จะหายทุกครั้งที่ deploy ใหม่
  ถ้าจะใช้ Render ต้องเป็นแพลนที่มี disk (เสียเงิน)
- **Railway / Fly.io** — เลิกให้ free tier แล้ว เหลือแค่เครดิตทดลอง (Fly มี volume ให้ SQLite ได้ แต่เสียเงิน)

---

## ขั้นตอน deploy

### 1. ตั้งค่าเครื่องตัวเอง (dev)

ฐานข้อมูลเป็นแค่ไฟล์ ไม่ต้องสมัครบริการอะไรเลย แก้ `.env` (ดูตัวอย่างเต็มที่ `.env.example`):

```bash
DATABASE_URL="file:./dev.db"
```

> path นับจาก root ของโปรเจกต์ ไฟล์ `dev.db` อยู่ใน `.gitignore` แล้ว
> (รวมถึงไฟล์คู่ `-wal` / `-shm` ที่ better-sqlite3 สร้างตอนเปิดโหมด WAL)

แล้วสร้างตารางและใส่ข้อมูลตัวอย่าง:

```bash
npm run db:migrate     # prisma migrate deploy — ใช้ migration ใน prisma/migrations/
npm run db:seed        # ต้องมี SEED_ENABLED=true
npm run dev
```

อยากเริ่มใหม่หมดเมื่อไหร่ก็ลบไฟล์ทิ้งแล้วรันสองคำสั่งข้างบนซ้ำ:

```bash
rm dev.db && npm run db:migrate && npm run db:seed
```

### 2. เตรียมเครื่อง production

ต้องเป็นเครื่องที่ **รัน Node ได้ + มีดิสก์ถาวร + รันแอปแค่ instance เดียว**
(เครื่องของกองบริการเทคโนโลยีสารสนเทศฯ หรือ VPS เล็ก ๆ ก็พอ — ระบบขนาดนี้ใช้ทรัพยากรน้อยมาก)

1. ติดตั้ง Node เวอร์ชันเดียวกับที่ dev ใช้ แล้ว `git clone` + `npm ci`
2. วางไฟล์ฐานข้อมูลไว้ **นอกโฟลเดอร์โปรเจกต์** จะได้ไม่หายตอน deploy ใหม่:

```bash
sudo mkdir -p /var/lib/nuv && sudo chown $USER /var/lib/nuv
```

3. ตั้ง `.env` บนเครื่องนั้น (ดูตารางข้อ 4) โดยชี้ `DATABASE_URL="file:/var/lib/nuv/nuv.db"`
4. `npm run db:migrate` → `npm run build` → `npm start`
5. ให้ระบบรันค้างด้วย `systemd` (หรือ `pm2`) และตั้ง reverse proxy (nginx/Caddy) ทำ HTTPS ให้

> **สำคัญ:** ตั้งให้รันแค่โปรเซสเดียว อย่าตั้ง cluster/หลาย worker — SQLite ให้เขียนได้ทีละ
> connection ถ้ารันหลายโปรเซสพร้อมกันจะเจอ `SQLITE_BUSY`

### 3. สำรองข้อมูล

ข้อดีที่สุดของ SQLite: สำรอง = ก๊อปไฟล์ แต่**อย่าใช้ `cp` ตอนแอปกำลังรัน** เพราะอาจได้ไฟล์ครึ่ง ๆ
ให้ใช้คำสั่ง backup ของ sqlite3 ที่ล็อกถูกต้อง:

```bash
sqlite3 /var/lib/nuv/nuv.db ".backup '/var/backups/nuv-$(date +%F).db'"
```

ใส่ใน cron ตามสเปก (daily 02:00 / weekly / monthly) แล้วส่งไฟล์ออกนอกเครื่องด้วย
— เก็บไว้เครื่องเดียวไม่นับว่าสำรอง

### 4. Environment variables บน production

| ตัวแปร | ค่า |
|---|---|
| `DATABASE_URL` | `file:/var/lib/nuv/nuv.db` (path เต็ม อยู่นอกโฟลเดอร์โปรเจกต์) |
| `APP_BASE_URL` | URL จริงของระบบ เช่น `https://volunteer.nu.ac.th` |
| `JWT_ACCESS_SECRET` | สุ่มใหม่ ≥32 ตัวอักษร |
| `JWT_REFRESH_SECRET` | สุ่มใหม่ ≥32 ตัวอักษร คนละค่ากับด้านบน |
| `COOKIE_SECURE` | `true` |
| `NODE_ENV` | `production` |
| `SEED_ENABLED` | `false` |
| `MAIL_TRANSPORT` | `smtp` |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | ค่าจาก Brevo |
| `CAPTCHA_PROVIDER` | `turnstile` (หรือ `off` ตอนทดสอบ) |

สุ่ม secret ด้วยคำสั่งนี้:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. สร้างตารางบนฐานข้อมูล production

รันบนเครื่อง production เอง (ไฟล์ฐานข้อมูลอยู่ที่นั่น จะรันจากเครื่องอื่นไม่ได้):

```bash
npm run db:migrate     # สร้างไฟล์ .db ให้เองถ้ายังไม่มี
```

> อย่ารัน `npm run db:seed` ใส่ production — ข้อมูลตัวอย่างห้ามขึ้นระบบจริง
> ตั้ง `SEED_ENABLED=false` ไว้กันพลาด (สคริปต์ seed จะไม่ทำงานเลยถ้าไม่ใช่ `true`)

---

## Netlify + Turso

ทางเลือกสำหรับกรณีที่ไม่มีเครื่องรัน Node ตลอดเวลา — ยกฐานข้อมูลออกไปไว้ที่ Turso
แล้วให้ Netlify รันเฉพาะแอป โค้ดไม่ต้องแก้เพิ่มแล้ว: `lib/db.ts` กับ `prisma/seed.ts`
เลือก adapter จาก scheme ของ `DATABASE_URL` ให้เอง (`file:` → better-sqlite3, `libsql:` → Turso)

### 1. สร้างฐานข้อมูลบน Turso

```bash
turso auth signup                       # หรือ turso auth login ถ้ามีบัญชีแล้ว
turso db create nu-volunteer
turso db show nu-volunteer --url        # ได้ libsql://nu-volunteer-<org>.turso.io
turso db tokens create nu-volunteer     # ได้ token สำหรับ DATABASE_AUTH_TOKEN
```

### 2. สร้างตารางบน Turso

migration ชุดเดิมใน `prisma/migrations/` ใช้ได้เลย เพราะยังเป็นสคีมา sqlite ตัวเดิม
รันจากเครื่องตัวเองโดยชี้ env ไปที่ Turso ชั่วคราว:

```bash
DATABASE_URL="libsql://…" DATABASE_AUTH_TOKEN="…" npm run db:migrate
```

> ถ้าอยากได้หมวดหมู่/คณะเริ่มต้นแต่ไม่เอาข้อมูลตัวอย่าง ให้ใส่มือผ่านหน้าแอดมิน
> อย่ารัน `db:seed` ใส่ฐานข้อมูลที่คนอื่นจะเข้าใช้จริง — ในนั้นมีบัญชีทดสอบพร้อมรหัสผ่านที่รู้กันทั้งไฟล์

### 3. ตั้งค่าและ deploy บน Netlify

`netlify.toml` ในรากโปรเจกต์ตั้ง build command กับปลั๊กอิน Next.js ไว้แล้ว
เหลือแค่ผูก repo กับใส่ environment variables ในหน้า **Site settings → Environment variables**:

| ตัวแปร | ค่า |
|---|---|
| `DATABASE_URL` | `libsql://nu-volunteer-<org>.turso.io` |
| `DATABASE_AUTH_TOKEN` | token จากขั้นที่ 1 |
| `APP_BASE_URL` | URL ของไซต์บน Netlify |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | ค่าสุ่มคนละค่า ≥ 32 ตัวอักษร |
| `COOKIE_SECURE` | `true` |
| `SEED_ENABLED` | `false` |
| ตัวแปรอีเมล (`MAIL_*`, `SMTP_*`) | ตามหัวข้อ Environment variables ด้านบน |

### ข้อควรรู้ก่อนเลือกทางนี้

- **ยังต้องรอบคอบเรื่องการเขียนพร้อมกัน** — Turso รับ connection พร้อมกันได้ก็จริง
  แต่ยังเป็น SQLite ที่เขียนได้ทีละ transaction ข้อจำกัดในหัวข้อถัดไปยังใช้ได้อยู่
- **รูปที่อัปโหลดเก็บเป็น data URL ในฐานข้อมูล** — บนไฟล์ในเครื่องไม่เป็นไร แต่พอเป็น Turso
  ทุกไบต์วิ่งข้ามเน็ตทุกครั้งที่อ่าน ถ้าจะใช้จริงจังควรย้ายไฟล์ไป R2 ตามหัวข้อด้านล่างก่อน
- **free tier ของ Turso** มีเพดานพื้นที่และจำนวน row ที่อ่าน/เขียนต่อเดือน — ตรวจ pricing ปัจจุบันก่อนพึ่งพา

---

## ข้อจำกัดที่ต้องออกแบบเผื่อไว้

### 1. เขียนได้ทีละ connection

SQLite ล็อกทั้งไฟล์ตอนเขียน ถ้ามีคนเขียนพร้อมกันเยอะ ๆ จะเจอ `SQLITE_BUSY`
ระดับการใช้งานของระบบนี้ (นิสิตกดลงทะเบียนกิจกรรม) ไม่ถึงขีดนั้น และ `lib/db.ts` ตั้งค่ารองรับไว้แล้ว:

| ค่า | สถานะ | ผล |
|---|---|---|
| `journal_mode = WAL` | ตั้งใน `lib/db.ts` ตอนสร้าง client | อ่านกับเขียนไม่บล็อกกัน — คนเปิดดูกิจกรรมไม่ต้องรอคนกดลงทะเบียน |
| busy timeout 5 วินาที | ส่งเป็น option ให้ adapter | เจอไฟล์ถูกล็อกแล้วรอ ไม่ error ทันที |
| `foreign_keys = ON` | better-sqlite3 เปิดให้เองทุก connection | `onDelete: Cascade` / `SetNull` ในสคีมาทำงานจริง (มี 23 จุด) |

> WAL เป็นค่าที่ SQLite เก็บถาวรใน header ของไฟล์ — ตั้งครั้งเดียวติดตลอดทุก connection
> เปิด WAL แล้วจะเห็นไฟล์คู่ `dev.db-wal` กับ `dev.db-shm` โผล่มาข้าง ๆ ไฟล์หลัก
> ทั้งคู่อยู่ใน `.gitignore` แล้ว และ**ต้องก๊อปไปด้วยถ้าจะย้ายไฟล์ฐานข้อมูลด้วยมือ**
> (หรือใช้ `sqlite3 .backup` ตามหัวข้อ 3 ซึ่งรวมให้เองอยู่แล้ว)

สิ่งที่ยังต้องระวังเอง: **รันแอปแค่โปรเซสเดียวเสมอ** (ห้าม cluster mode / หลาย worker)

ส่วน `synchronous` ยังเป็นค่า default `FULL` ซึ่งปลอดภัยที่สุด ถ้าเจอว่าเขียนช้าจริง ๆ
ค่อยลดเป็น `NORMAL` (ปลอดภัยกับ WAL เสี่ยงเฉพาะตอนไฟดับ ไม่ใช่ตอนแอปแครช)

### 2. อัปโหลดไฟล์ยังควรแยกไปไว้ R2

ถึงจะรันบนเครื่องตัวเองแล้ว (เขียนดิสก์ได้) ก็ยัง**ไม่ควรเก็บไฟล์หลักฐานลง SQLite หรือดิสก์แอป**
เพราะไฟล์ใหญ่ทำให้ไฟล์ `.db` บวมจนสำรองข้อมูลช้า และไฟล์บนดิสก์แอปจะหายตอน deploy ใหม่

ทางแก้เหมือนเดิม:
1. client ขอ **presigned URL** จาก API (`POST /uploads/sign` — ส่งกลับแค่ URL ไม่แตะไฟล์)
2. เบราว์เซอร์ `PUT` ไฟล์ขึ้น R2 ตรง ๆ
3. client ส่ง URL ที่ได้กลับมาบันทึกลง `Evidence.fileUrl`

ในฐานข้อมูลเก็บแค่ URL — สเปกกำหนดหลักฐานได้ถึง 6 MB ซึ่งไม่ควรวิ่งผ่าน API เลย

### 3. Cron ใช้ของระบบปฏิบัติการได้เลย

พอไม่ได้อยู่บน Vercel แล้ว ข้อจำกัด "cron วันละครั้ง" ก็หมดไป
ใช้ `cron` ของเครื่องตั้งสำรองข้อมูล daily 02:00 / weekly / monthly ได้ตรงเวลาจริง
(คำสั่งสำรองอยู่ในหัวข้อ 3 ด้านบน)

### 4. ต้องดูแลเครื่องเอง

แลกกับการไม่มีโควตาและไม่มี project หลับ คือต้องรับผิดชอบเอง: อัปเดต OS, ต่ออายุใบรับรอง HTTPS,
เฝ้าดูดิสก์เต็ม, และ**ทดสอบกู้คืนไฟล์สำรองจริง ๆ อย่างน้อยหนึ่งครั้ง** — ไฟล์สำรองที่ไม่เคยลองกู้
ไม่ต่างอะไรกับไม่มี

### 5. ถ้าวันหนึ่งต้องย้ายกลับไป Postgres

สคีมานี้ตั้งใจไม่ใช้ฟีเจอร์เฉพาะเอนจินไหน (ไม่มี enum, ไม่มี array, ไม่มีคอลัมน์ Json,
ฟิลด์รายการเก็บเป็น JSON string ผ่าน `lib/json.ts`) การย้ายกลับจึงทำได้ด้วย:

1. `prisma/schema.prisma` → `provider = "postgresql"`
2. `npm i @prisma/adapter-pg` แล้วสลับ adapter ใน `lib/db.ts` กับ `prisma/seed.ts`
3. สร้าง migration ใหม่: `npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script`
4. ย้ายข้อมูลเดิมออกจาก SQLite (เช่น เขียนสคริปต์อ่านผ่าน Prisma แล้วเขียนลงปลายทาง)

ข้อควรระวังตอนเขียนโค้ดใหม่ระหว่างนี้: อย่าใช้ `mode: 'insensitive'` ใน where filter
(SQLite ไม่รองรับ) และอย่าเขียน raw SQL แบบผูกกับ dialect — ตอนนี้ทั้งโปรเจกต์ยังไม่มีทั้งสองอย่าง

---

## ตรวจหลัง deploy

- [ ] เปิด URL จริงของระบบ แล้วหน้าแรกขึ้นครบ
- [ ] สมัครบัญชีใหม่ด้วยอีเมล `@nu.ac.th` จริง แล้วล็อกอินได้
- [ ] ลองสมัครด้วยอีเมลนอกโดเมน → ต้องได้ error `EMAIL_DOMAIN`
- [ ] กด "ลืมรหัสผ่าน" แล้วอีเมลเข้าจริง และลิงก์ใช้รีเซ็ตได้
- [ ] เปิด DevTools → Application → Cookies เห็น `nuv_at` / `nuv_rt` เป็น `HttpOnly` + `Secure`
- [ ] ปิดเบราว์เซอร์แล้วเปิดใหม่ ยังล็อกอินอยู่ (refresh token ทำงาน)
- [ ] ไฟล์ `.db` ถูกสร้างที่ path ตาม `DATABASE_URL` จริง และ**อยู่นอกโฟลเดอร์โปรเจกต์**
- [ ] `SEED_ENABLED=false` — ไม่มีบัญชีตัวอย่างหลุดขึ้นระบบจริง
- [ ] รัน deploy ใหม่หนึ่งรอบ แล้วข้อมูลที่สมัครไว้ยังอยู่ครบ (พิสูจน์ว่าไฟล์ไม่ได้อยู่ในที่ที่หาย)
- [ ] cron สำรองข้อมูลทำงาน และ**ลองกู้ไฟล์สำรองกลับมาเปิดได้จริง**
