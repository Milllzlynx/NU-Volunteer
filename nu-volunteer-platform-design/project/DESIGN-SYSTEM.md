# NU Volunteer — Design System

> เอกสารนี้ดึงค่าจริงจากโค้ดของระบบ (`NU Volunteer.dc.html`, `NUV_*.dc.html`) — ปรับปรุงล่าสุด สิงหาคม 2026

## สารบัญ
1. [หลักการออกแบบโดยรวม](#1-หลักการออกแบบโดยรวม)
2. [ระบบสี (Color System)](#2-ระบบสี-color-system)
3. [ตัวอักษร (Typography)](#3-ตัวอักษร-typography)
4. [Layout & Spacing](#4-layout--spacing)
5. [Component Library](#5-component-library)
6. [ไอคอนและภาพประกอบ](#6-ไอคอนและภาพประกอบ)
7. [Accessibility Guidelines](#7-accessibility-guidelines)
8. [Naming Convention](#8-naming-convention)

---

## 1. หลักการออกแบบโดยรวม

โทนรวมของระบบคือ **"พาสเทลโปร่ง เป็นมิตร เข้าถึงง่าย"** สร้างจาก 3 องค์ประกอบ:

1. **พื้นหลังไล่เฉดนุ่ม** — gradient พาสเทลบวก blob เบลอขนาดใหญ่ (opacity ต่ำ, blur 100–160px)
2. **การ์ดกระจกโค้งมน** — `rgba(255,255,255,.62)` + `backdrop-filter: blur(26px) saturate(180%)`
   ขอบบาง 1px และเงาฟุ้งนุ่ม
3. **สีความหมายชัดเจน** — สถานะทุกชนิดใช้ชุดสี success/warning/danger/info เดียวกันทั้งระบบ

```css
/* การ์ดมาตรฐาน (glass card) */
background: rgba(255,255,255,.62);
backdrop-filter: blur(26px) saturate(180%);
border: 1px solid rgba(255,255,255,.75);
border-radius: 20px;
box-shadow: 0 10px 30px rgba(31,41,55,.08);
```

### ระบบ "Tweaks" — 4 สไตล์
สลับได้จากปุ่มสไตล์บนแถบหัวเรื่อง ค่าเก็บใน `localStorage['nuv-style-tweak']`
และประกาศเป็น attribute `html[data-nuv-mood="…"]` ซึ่งเป็น layer ที่ทับบนสีบทบาท **โดยไม่แตะสีความหมาย**

| สไตล์ | คีย์ | บุคลิก | radius การ์ด | เงา |
|---|---|---|---|---|
| พาสเทล (ค่าเริ่มต้น) | `pastel` | สีอ่อนนุ่มนวล มุมโค้งกว้าง เงาบางเบา | 20px | ฟุ้งนุ่ม |
| แคนดี้ | `candy` | สีสดใส เงามีสี ตัวอักษรหนาขึ้น | 28px | มีสี (ชมพู/ม่วง) |
| นีออน | `neon` | ขอบเรืองแสง (เปิดโหมดมืดอัตโนมัติ) | 18px | glow แทนเงาทึบ |
| มินิมอล | `minimal` | ลดสี เน้นเส้นขอบ ไม่มีเงา | 12px | `0 1px 2px` |

```js
// สลับสไตล์
document.documentElement.setAttribute('data-nuv-mood', 'candy');
localStorage.setItem('nuv-style-tweak', 'candy');
```

---

## 2. ระบบสี (Color System)

### 2.1 สีแบรนด์และธีมตามบทบาท
สีหลักของแบรนด์คือ gradient **ชมพู-แดง → ม่วง** ใช้กับปุ่มหลัก โลโก้ และองค์ประกอบ active ทั้งระบบ

```css
background: linear-gradient(135deg, #E97171, #A774F7);   /* brand gradient */
```

| บทบาท | โทนที่ใช้แยกความต่าง | ค่า |
|---|---|---|
| นิสิต (student) | ชมพู-แดง → ม่วง (แบรนด์หลัก) | `#E97171` → `#A774F7` |
| ผู้จัดกิจกรรม (organizer) | เน้นเขียวใบไม้ในตัวชี้วัด/สถานะการอนุมัติ | `#63D2A1` / `#0F8A63` |
| แอดมิน (admin) | เน้นน้ำเงิน-ม่วงเข้มในหัวการ์ดและอวาตาร์ | `#1F2937` → `#A774F7`, ฟ้า `#7AB8FF` |

> หมายเหตุการใช้งานจริง: ปุ่มหลักและ nav ที่ active ใช้ gradient แบรนด์เดียวกันทุกบทบาท
> ส่วนที่แยกบทบาทคือ **แถบเมนู (`ROLE_NAV`), ป้ายบทบาท (`ROLE_LABEL`) และสีเน้นของการ์ดสรุป**

### 2.2 สีเชิงความหมาย (Semantic colors)

| ความหมาย | ตัวอักษร | พื้นหลัง badge | ใช้กับ |
|---|---|---|---|
| success | `#0F8A63` | `rgba(99,210,161,.18)` | เปิดรับสมัคร, เสร็จสิ้น, อุทธรณ์ผ่าน, ส่งอีเมลสำเร็จ, อุปกรณ์นี้ |
| warning | `#B45309` | `rgba(245,166,35,.18)` | ใกล้เต็ม, รอหลักฐาน, รอพิจารณา, กำลังส่ง |
| danger | `#C2410C` | `rgba(233,113,113,.18)` | ที่นั่งเต็ม, ยกเลิก, อุทธรณ์ไม่ผ่าน, ส่งล้มเหลว |
| info | `#7AB8FF` | `rgba(122,184,255,.14)` | ข้อความ/แชท, ข้อมูลทั่วไป |
| accent-purple | `#7C2FD9` | `rgba(167,116,247,.18)` | เช็กอินแล้ว, การเตือนความจำ |
| neutral | `#57534E` | `rgba(31,41,55,.12)` | ไม่มาตามนัด, สถานะปิด |
| kyf / deadline | `#E4572E` | `rgba(228,87,46,.13)` | เกณฑ์ กยศ., กำหนดส่ง |

```js
// รูปแบบที่ใช้จริงในโค้ด (สถานะที่นั่ง)
open:   {label:'เปิดรับสมัคร', color:'#0F8A63', bg:'rgba(99,210,161,.18)', dot:'#63D2A1'}
almost: {label:'ใกล้เต็ม',    color:'#B45309', bg:'rgba(245,166,35,.18)', dot:'#F5A623'}
full:   {label:'ที่นั่งเต็ม',  color:'#C2410C', bg:'rgba(233,113,113,.18)', dot:'#E97171'}
```

### 2.3 สีพื้นและตัวอักษร

| บทบาทค่าสี | ค่า | ใช้กับ |
|---|---|---|
| หัวข้อ/ตัวอักษรหลัก | `#1F2937` | หัวข้อ, ค่าในการ์ด |
| ตัวอักษรรอง | `#4B5563` / `#6B7280` | คำอธิบาย, ป้ายกำกับ |
| ตัวอักษรจาง | `#9CA3AF` | hint, placeholder, ป้ายในตารางบนมือถือ |
| พื้นหน้าเว็บ | `#E9ECF3` | `body` |
| พื้นหลัง (พาสเทล) | `linear-gradient(140deg,#FDF8F8 0%,#F3F8FF 48%,#F8F5FF 100%)` | ชั้นพื้นหลัง |
| พื้นหลัง (แคนดี้) | `linear-gradient(140deg,#FFF3F1 0%,#EEF5FF 46%,#F7EEFF 100%)` | |
| พื้นหลัง (มินิมอล) | `linear-gradient(140deg,#FCFCFD 0%,#FAFAFB 52%,#FBFBFC 100%)` | |
| พื้นหลัง (นีออน) | `linear-gradient(140deg,#F4EEFF 0%,#EAF2FF 48%,#FFF0F4 100%)` | ใช้คู่โหมดมืด |
| ลิงก์ | `#B37CF6` / hover `#8b2fe0` | `a`, `a:hover` |

### 2.4 ตัวแปร/แอตทริบิวต์ระดับระบบ
ระบบไม่ใช้ CSS custom properties เป็นตัวหลัก แต่ใช้ **attribute บน `<html>`** เป็นสวิตช์ธีม
และเขียนค่าสีเป็น literal ในสไตล์ของแต่ละองค์ประกอบ (เพื่อให้ทุกอย่างพร้อมแสดงผลทันที)

| ตัวควบคุม | ค่า | ความหมาย |
|---|---|---|
| `html[data-nuv-theme]` | `light` | `dark` | โหมดสว่าง/มืด (เก็บที่ `localStorage['nuv-theme']`) |
| `html[data-nuv-mood]` | `pastel` | `candy` | `neon` | `minimal` | สไตล์ Tweak (`localStorage['nuv-style-tweak']`) |
| `.nuv-shell` | — | คอนเทนเนอร์รากที่ธีมมืดใช้กลับสี |
| `.nuv-noinv` | — | ยกเว้นไม่ให้ถูกกลับสีในโหมดมืด (รูปภาพ/QR) |

### 2.5 แนวทาง Dark mode
โหมดมืดใช้การกลับสีทั้งชั้น (`filter: invert(1) hue-rotate(180deg)` บน `.nuv-shell`) แล้ว **กลับคืน**
เฉพาะสื่อที่ห้ามเพี้ยน (`img`, `video`, `canvas`, `image-slot`, `svg image`) — ให้ผลลัพธ์สม่ำเสมอทุกหน้าโดยไม่ต้องดูแลชุดสีคู่ขนาน
พื้นหลังเอกสารตั้งเป็น `#12151C` · สไตล์ **นีออน** ถูกออกแบบมาให้ใช้คู่โหมดมืด และจะเปิดโหมดมืดให้อัตโนมัติเมื่อเลือก

---

## 3. ตัวอักษร (Typography)

```css
font-family: 'Mitr','Noto Sans Thai','Inter',system-ui,sans-serif;
font-weight: 300;          /* น้ำหนักพื้นฐานของทั้งระบบ */
letter-spacing: .01em;
```

**Mitr** เป็นฟอนต์หลัก (ออกแบบมาสำหรับไทย+ละติน) มี **Noto Sans Thai** เป็นสำรอง

| ระดับ | ขนาด | น้ำหนัก | สี |
|---|---|---|---|
| หัวข้อหน้า | 21–24px | 600 | `#1F2937` |
| หัวข้อการ์ด | 16–17px | 600 | `#1F2937` |
| ตัวเลขในการ์ดสรุป (metric) | 24–28px | 600 | `#1F2937` |
| เนื้อหา | 13.5–14.5px | 400 | `#1F2937` / `#4B5563` |
| ป้ายกำกับ/คำอธิบาย | 12–12.5px | 400 | `#6B7280` |
| hint / meta | 11–11.5px | 400 | `#9CA3AF` |
| badge | 11–12px | 500 | ตามสีความหมาย |
| line-height | 1.5–1.8 (ภาษาไทยต้องการช่องไฟสูงกว่าอังกฤษ) | | |

### รองรับไทย/อังกฤษ
ข้อความทุกจุดผ่านพจนานุกรมคีย์ภาษาไทย → อังกฤษ (`APP_EN`) และฟังก์ชันช่วย `T()` / `PT()`
คีย์คือ **ข้อความไทยตัวเต็ม** ทำให้โค้ดอ่านออกโดยไม่ต้องเปิดตารางแปล

```js
const APP_EN = { "พื้นที่จัดเก็บเต็ม ไม่สามารถบันทึกรูปได้": "Storage is full — the image could not be saved", … };
PT('เปลี่ยนสไตล์เป็น')      // → 'Style changed to' เมื่อ lang === 'en'
```
ข้อความยาวใช้ `text-wrap: pretty` เสมอ เพื่อกันบรรทัดสุดท้ายเหลือคำเดียว

---

## 4. Layout & Spacing

### Breakpoints
| ช่วง | ขนาด | พฤติกรรม |
|---|---|---|
| มือถือ | `< 640px` | sidebar ยุบเป็นเมนูสไลด์, ตารางกลายเป็นการ์ด, padding ลดลง, แถบตัวกรองเลื่อนแนวนอน |
| แท็บเล็ต | 640–1024px | กริด 2 คอลัมน์, sidebar แบบย่อ (ไอคอนอย่างเดียว) |
| เดสก์ท็อป | `> 1024px` | sidebar เต็ม + เนื้อหากริด `repeat(auto-fit, minmax(280px, 1fr))` |

### Spacing scale
ระยะห่างใช้ค่าคู่ในสเกล **6 / 9 / 12 / 16 / 22 / 26px** เป็นหลัก และวางกลุ่มองค์ประกอบด้วย flex/grid + `gap` เสมอ

| จุด | ค่ามาตรฐาน | ค่าบนมือถือ |
|---|---|---|
| padding การ์ด | 22–26px | 15–18px |
| padding หน้า | `22px 26px 60px` (ปกติ) · `34px 40px 80px` (โปร่ง) · `14px 18px 44px` (กระชับ) | |
| gap ระหว่างการ์ด | 14–16px | 12px |
| gap ในแถว (ไอคอน+ข้อความ) | 7–12px | เท่าเดิม |
| padding ปุ่ม | `12px 20px` | ปุ่มไอคอนเป็น 44×44px |

### Border radius ตามสไตล์
| องค์ประกอบ | pastel | candy | neon | minimal |
|---|---|---|---|---|
| การ์ด (glass) | 20px | 28px | 18px | 12px |
| ปุ่ม | 13–14px | 15px | 12px | 9px |
| input / textarea | 13–14px | 15px | 12px | 9px |
| badge / chip | 999px (ทุกสไตล์) | | | |
| อวาตาร์ | 12–14px หรือ 50% | | | |

---

## 5. Component Library

### 5.1 ปุ่ม (Button)
```html
<!-- primary -->
<button style="display:flex;align-items:center;gap:7px;padding:12px 20px;border-radius:13px;
  border:none;background:linear-gradient(135deg,#E97171,#A774F7);color:#fff;font-weight:500;font-size:13.5px;cursor:pointer"
  style-hover="transform:translateY(-2px);box-shadow:0 12px 28px rgba(167,116,247,.35)">บันทึก</button>

<!-- secondary -->
<button style="padding:12px 20px;border-radius:13px;border:1px solid rgba(31,41,55,.12);
  background:rgba(255,255,255,.55);color:#4B5563;font-size:13.5px;cursor:pointer">ยกเลิก</button>
```
| variant | ใช้เมื่อ | hover | disabled |
|---|---|---|---|
| primary | การกระทำหลัก 1 ปุ่มต่อหน้าจอ | ยก 2px + เงาสีม่วง | `opacity:.5; cursor:not-allowed` |
| secondary | ยกเลิก/รอง | พื้นทึบขึ้นเป็น `.95` | เหมือน primary |
| icon-only (`.nuv-iconbtn`) | แถบเครื่องมือ, ตาราง | พื้นสว่างขึ้น + ยก 2px | — |
- ปุ่มไอคอนต้องมี `title` **และ** `aria-label` เสมอ (บนมือถือ `.nuv-blabel` จะซ่อนคำกำกับ)
- focus: ใช้ค่า outline ปริยายของเบราว์เซอร์ ห้ามลบทิ้ง

### 5.2 Badge สถานะ
```html
<span style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:999px;
  font-size:12px;font-weight:500;color:#0F8A63;background:rgba(99,210,161,.18)">
  <span style="width:6px;height:6px;border-radius:50%;background:#63D2A1"></span>เปิดรับสมัคร</span>
```
ทุก badge ใช้ชุดสีจาก §2.2 — จุดสี (dot) ใช้เมื่อเป็นสถานะที่นั่ง, ไอคอนใช้เมื่อเป็นสถานะการลงทะเบียน

### 5.3 การ์ดกิจกรรม (Activity card)
โครงสร้าง: ภาพ hero (สูง 132px บนมือถือ, เต็มความกว้าง) → หมวดหมู่ + badge ที่นั่ง → ชื่อกิจกรรม (600/16px)
→ แถวเมตา (วันเวลา · สถานที่ · ชั่วโมง พร้อมไอคอน 16px) → แถบปุ่ม
บนมือถือใช้คลาส `.nuv-listcard` เพื่อ stack ภาพ/ข้อความ/ปุ่มเป็นแนวตั้ง

### 5.4 การ์ด metric สรุป
กริด `repeat(auto-fit,minmax(280px,1fr))` · ไอคอนในกล่องสีอ่อน 44×44px · ตัวเลข 24–28px/600 · คำอธิบาย 12px/`#6B7280`

### 5.5 แถบตัวกรอง (Filter tabs)
ใช้คลาส `.nuv-tabs` — แถบเดียวเลื่อนแนวนอนบนมือถือ (ซ่อน scrollbar) ปุ่มที่เลือกใช้ gradient แบรนด์ + ตัวอักษรขาว
ปุ่มที่ไม่ได้เลือกเป็นพื้นขาวโปร่ง + ขอบ `rgba(31,41,55,.1)`

### 5.6 โมดัล (Modal)
พื้นหลังฉาก `rgba(30,37,48,.45)` · การ์ดขาว radius 26px · แอนิเมชัน `nuvPop .22s ease`
หัวโมดัลมีไอคอนในกล่อง gradient 44×44px · แถบปุ่มล่างเป็น sticky เมื่อเนื้อหายาว (สัดส่วน `flex:1` / `flex:2`)

### 5.7 ฟอร์ม input
```css
padding: 12px 14px; border-radius: 13px;
border: 1px solid rgba(31,41,55,.12);
background: rgba(255,255,255,.6); font-family: inherit; font-size: 13.5px;
```
- label ด้านบน 12px/`#6B7280` · ข้อความ error 12px สี `#C2410C` ใต้ช่อง
- input ที่ผิดพลาดเปลี่ยนสีขอบเป็น `rgba(233,113,113,.6)`
- ตัววัดความแข็งแรงรหัสผ่าน: แถบ 3 ระดับ (อ่อน/กลาง/แข็งแรง) ใช้ danger → warning → success

### 5.8 ตาราง responsive → การ์ด
เดสก์ท็อป: แถวข้อมูล `.nuv-trow` (min-width 620px, เลื่อนแนวนอนได้)
มือถือ: เพิ่ม `.nuv-cardify` — แต่ละเซลล์มี `data-th="ชื่อคอลัมน์"` แล้ว CSS จะสร้างป้ายกำกับหน้าค่าให้อัตโนมัติ
```html
<div class="nuv-trow nuv-cardify">
  <div data-th="กิจกรรม">ปลูกป่าชุมชน</div>
  <div data-th="ชั่วโมง">6 ชม.</div>
</div>
```

---

## 6. ไอคอนและภาพประกอบ

- **ไอคอน**: Material Symbols Rounded (คลาส `.msr`, เวอร์ชันทึบใช้ `.msr.fill`)
  ขนาดมาตรฐาน **16px** (ในแถวเมตา) · **19–20px** (เมนู/ปุ่ม) · **24px** (หัวโมดัล)
  ควบคุมน้ำหนักด้วย `font-variation-settings:'FILL' 0,'wght' 300`
- **ภาพประกอบ**: ใช้ `<image-slot>` เป็น placeholder แบบลากวางได้ ทุกช่องต้องมี `id` ไม่ซ้ำและข้อความบอกว่าควรใส่ภาพอะไร
  กิจกรรมหนึ่งรายการมี 4 ช่อง: hero · gallery 1 · gallery 2 · map (แผนที่ fallback เป็นภาพนิ่งเมื่อโหลดแผนที่จริงไม่ได้)
- **สถานะกำลังโหลด**: ใช้ skeleton `.nuv-sk` (shimmer 1.25s) แทน spinner ทุกครั้งที่โครงหน้ารู้ล่วงหน้า

---

## 7. Accessibility Guidelines

| หัวข้อ | มาตรฐานที่ต้องผ่าน |
|---|---|
| คอนทราสต์ตัวอักษร | ≥ 4.5:1 สำหรับตัวอักษรปกติ, ≥ 3:1 สำหรับ ≥18px — ต้องผ่านในทั้ง 4 สไตล์และทั้งโหมดสว่าง/มืด |
| สีที่ตรวจแล้วผ่าน | `#1F2937`, `#4B5563`, `#6B7280` บนพื้นขาวโปร่ง · สีความหมายทั้งชุด (`#0F8A63`/`#B45309`/`#C2410C`) บนพื้น badge ของตัวเอง |
| ห้ามใช้ | `#9CA3AF` กับข้อความสำคัญ (ใช้เฉพาะ hint/meta) |
| touch target | ≥ **44×44px** บนมือถือ — บังคับผ่าน `.nuv-iconbtn` และ `.nuv-listcard-actions > button` |
| ปุ่มไอคอน | ต้องมี `aria-label` (และ `title` สำหรับ tooltip บนเดสก์ท็อป) |
| สถานะไม่พึ่งสีอย่างเดียว | ทุก badge มีข้อความกำกับเสมอ; สถานะที่นั่งเพิ่มไอคอน/จุดสี |
| โฟกัส | ห้ามตั้ง `outline:none` โดยไม่มีสถานะโฟกัสทดแทน |
| ภาษา | ข้อความทุกจุดต้องมีคีย์ในพจนานุกรม `APP_EN` ห้ามฝังข้อความไทยที่แปลไม่ได้ |

---

## 8. Naming Convention

| ประเภท | รูปแบบ | ตัวอย่าง |
|---|---|---|
| ไฟล์คอมโพเนนต์ | `NUV_<ชื่อหน้า>.dc.html` | `NUV_Student.dc.html`, `NUV_Overlays.dc.html` |
| คลาส CSS ที่ใช้ร่วม | `nuv-<หน้าที่>` (kebab-case) | `.nuv-tabs`, `.nuv-listcard`, `.nuv-cardify`, `.nuv-iconbtn`, `.nuv-noprint` |
| attribute ธีม | `data-nuv-<หมวด>` | `data-nuv-theme`, `data-nuv-mood` |
| คีย์ localStorage | `nuv-<ชื่อ>` | `nuv-theme`, `nuv-style-tweak`, `nuv-lang`, `nuv-last-role`, `nuv-accounts` |
| ตัวแปรสไตล์ในโลจิก | `<ชื่อ>Style` | `submitStyle`, `cardStyle`, `badgeStyle`, `avatarStyle` |
| ตัวแปรป้ายข้อความ | `<ชื่อ>Label` | `roleLabel`, `statusLabel`, `exportCsvLabel` |
| handler | `on<เหตุการณ์>` | `onCloseModal`, `onConfirmRegister`, `onToggleMood` |
| แผนที่ค่าคงที่ | `SCREAMING_SNAKE` | `ROLE_NAV`, `MOOD_LABEL`, `NOTIF_LABEL`, `CHAT_SEED` |
| error code (API) | `SCREAMING_SNAKE` | `INVALID_CREDENTIALS`, `EMAIL_DOMAIN`, `TOKEN_EXPIRED` |

**กฎการเขียนสไตล์**: ทุกสไตล์เขียนแบบ inline บนองค์ประกอบ (ไม่ใช้ stylesheet คลาสสำหรับสีหรือระยะ)
ยกเว้น 3 กรณีที่อยู่ใน `<helmet><style>` เท่านั้น — `@keyframes`, media query สำหรับ responsive/print,
และ layer ของสไตล์ Tweak/โหมดมืดที่ต้องทับทั้งหน้า
