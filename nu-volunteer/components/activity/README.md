# ActivityCard

การ์ดกิจกรรมที่ใช้ซ้ำได้ทุกหน้าที่แสดงรายการกิจกรรม

ตัวอย่างทุกสถานะดูได้ที่ `/dev/activity-card` (เปิดเฉพาะตอนพัฒนา)

---

## สไตล์

การ์ดใช้ **inline style จากโทเคนใน `lib/design.ts`** ไม่ใช่ utility class

เหตุผล: ชั้นสไตล์ 4 แบบ (พาสเทล · แคนดี้ · นีออน · มินิมอล) ใน `app/globals.css`
เลือกองค์ประกอบด้วย selector แบบ `[style*="..."]` รวม 30 จุด
ถ้าเปลี่ยนการ์ดไปใช้ utility class การ์ดจะไม่ตอบสนองต่อการสลับสไตล์อีกต่อไป
ขณะที่คอมโพเนนต์อื่นทั้งระบบยังตอบสนองอยู่ — ดู `DESIGN-SYSTEM.md` §1

ไอคอนใช้ `Icon` จาก `components/ui` (Material Symbols Rounded) ตามที่ทั้งระบบใช้

---

## การใช้งาน

### 1. ส่ง prop เอง

```tsx
import { ActivityCard } from '@/components/activity/ActivityCard';

<ActivityCard
  id="a1"
  title="ปลูกป่าชายเลนฟื้นฟูชายฝั่ง"
  category="ด้านบำเพ็ญประโยชน์"
  categoryColor="#63D2A1"
  location="อ.บางระกำ จ.พิษณุโลก"
  date="20 ส.ค. 2569"
  time="07:00 - 11:00"
  imageUrl="https://…"
  registeredSlots={32}
  totalSlots={50}
  hoursReward={6}
  href="/activities/a1"
  onRegister={() => register('a1')}
  onFavoriteClick={() => toggleFavorite('a1')}
/>
```

### 2. แปลงจาก `PublicActivity` (แนะนำสำหรับหน้าในระบบ)

หน้าไหนที่มี `PublicActivity` อยู่แล้วให้ใช้ตัวแปลง จะได้ไม่ต้องแตกฟิลด์เองทุกที่

```tsx
import { toActivityCardProps } from '@/lib/activityCard';

{activities.map((a) => (
  <ActivityCard
    key={a.id}
    {...toActivityCardProps(a, {
      isEn,
      registrationStatus: myStatus[a.id] ?? null,
      isFavorite: favorites.includes(a.id),
      onRegister: () => register(a.id),
      onFavoriteClick: () => toggleFavorite(a.id),
    })}
  />
))}
```

ตัวแปลงจะเลือกป้ายหมวดหมู่และวันที่ตามภาษาให้เอง และตั้ง `href` เป็น `/activities/<id>`

---

## Props

| Prop | ชนิด | จำเป็น | ความหมาย |
|---|---|:--:|---|
| `id` | `string` | ✅ | รหัสกิจกรรม |
| `title` | `string` | ✅ | ชื่อกิจกรรม |
| `category` | `string` | ✅ | ชื่อหมวดหมู่ที่แสดงบนป้าย |
| `categoryColor` | `string` | — | สีหมวดหมู่ (hex) ค่าเริ่มต้น `#63D2A1` |
| `location` | `string` | ✅ | สถานที่จัด — ว่างได้ แถวนี้จะถูกซ่อน |
| `date` | `string` | ✅ | วันที่ที่จัดรูปแบบแล้ว |
| `time` | `string` | — | ช่วงเวลาที่จัดรูปแบบแล้ว |
| `imageUrl` | `string \| null` | — | ไม่มีภาพจะแสดงพื้นไล่เฉดสีหมวดหมู่แทน |
| `registeredSlots` | `number` | ✅ | จำนวนที่ลงทะเบียนแล้ว |
| `totalSlots` | `number` | ✅ | ที่นั่งทั้งหมด — เป็น 0 จะไม่แสดงแถบที่นั่ง |
| `leftSlots` | `number` | — | ที่นั่งคงเหลือ ไม่ส่งมาจะคำนวณให้ |
| `hoursReward` | `number` | ✅ | ชั่วโมงจิตอาสาที่จะได้รับ |
| `maxHours` | `number` | — | ใส่เมื่อได้ไม่เท่ากันทุกคน จะแสดงเป็นช่วง เช่น `4-8 ชม.` |
| `status` | `'pending' \| 'registered' \| 'completed' \| null` | — | สถานะของผู้ใช้ต่อกิจกรรมนี้ |
| `isFavorite` | `boolean` | — | หัวใจเป็นสีแดงเมื่อ `true` |
| `loading` | `boolean` | — | `true` จะเรนเดอร์เป็นโครงร่างแทน |
| `href` | `string` | — | ปลายทางเมื่อคลิกภาพหรือชื่อกิจกรรม |
| `onFavoriteClick` | `() => void \| Promise<void>` | — | ไม่ส่งมาจะไม่มีปุ่มหัวใจ |
| `onRegister` | `() => void \| Promise<void>` | — | ไม่ส่งมาและมี `href` จะกลายเป็นปุ่ม "ดูรายละเอียด" |
| `onViewDetails` | `() => void` | — | ไม่ส่งมาจะใช้ `href` เป็นลิงก์แทน |
| `onViewParticipants` | `() => void` | — | ไม่ส่งมาจะลิงก์ไป `<href>#participants` |
| `onMessage` | `() => void` | — | ไม่ส่งมาจะลิงก์ไป `<href>#contact` |

### หมายเหตุเรื่อง `leftSlots`

ข้อกำหนดเดิมระบุให้เป็นค่าที่ต้องส่งมา แต่ที่นี่ทำเป็น optional
เพราะค่านี้คำนวณได้จาก `totalSlots - registeredSlots` การมีแหล่งความจริงสองที่
เปิดช่องให้ตัวเลขบนแถบกับตัวเลขข้างแถบไม่ตรงกัน ส่งมาเองได้ถ้าหน้านั้นนับด้วยกติกาต่างออกไป

### หมายเหตุเรื่อง `status`

ระบบมีสถานะการลงทะเบียนจริง 8 แบบใน `REG_STATUS` (`lib/design.ts`)
แต่การ์ดแสดงแค่ 3 แบบตามข้อกำหนด `toCardStatus()` ใน `lib/activityCard.ts` เป็นตัวยุบให้:

| สถานะจริง | บนการ์ด |
|---|---|
| `pending` | `pending` |
| `approved` · `checked-in` · `checked-out` | `registered` |
| `completed` | `completed` |
| `rejected` · `cancelled` · `no-show` | ไม่แสดงป้าย |

สถานะที่ไม่แสดงป้ายเป็นเรื่องที่ต้องอธิบายด้วยบริบท (เหตุผลที่ถูกปฏิเสธ ใครยกเลิก)
จึงให้ผู้ใช้ไปดูที่หน้าการลงทะเบียนแทนการย่อเหลือคำเดียวบนการ์ด

---

## สถานะอื่นของคอมโพเนนต์

```tsx
import { ActivityCardSkeleton, ActivityCardEmpty } from '@/components/activity/ActivityCard';

// ระหว่างรอข้อมูล
{loading ? <ActivityCardSkeleton /> : <ActivityCard {...props} />}

// ไม่มีกิจกรรมเลย — กินความกว้างทั้งกริดด้วย gridColumn: '1 / -1'
<ActivityCardEmpty
  title="ยังไม่มีกิจกรรมที่เปิดรับสมัคร"
  desc="เมื่อมีผู้จัดประกาศกิจกรรมใหม่ รายการจะขึ้นที่นี่"
/>
```

---

## กริดที่แนะนำ

```tsx
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
```

`auto-fill` กับความกว้างขั้นต่ำ 300px ให้ผลเป็น 1 คอลัมน์บนมือถือ 2 บนแท็บเล็ต และ 3 ขึ้นไปบนเดสก์ท็อป
โดยไม่ต้องเขียน breakpoint เอง

---

## การเข้าถึง

- ปุ่มไอคอนทุกปุ่มมี `aria-label` และ `title`
- หัวใจใช้ `aria-pressed` บอกสถานะ
- แถบที่นั่งเป็น `role="progressbar"` พร้อม `aria-valuenow` / `aria-valuemax`
- ป้ายสถานะมีข้อความกำกับเสมอ ไม่สื่อด้วยสีอย่างเดียว
- ภาพหัวการ์ดเป็น `alt=""` เพราะเป็นภาพประกอบ ข้อมูลอยู่ในข้อความข้างล่างครบแล้ว
- ภาพโหลดแบบ `loading="lazy"`
- เอฟเฟกต์ซูมภาพและปุ่มยุบถูกปิดทั้งหมดเมื่อผู้ใช้ตั้งค่าลดการเคลื่อนไหว
  (ทั้ง `prefers-reduced-motion` และ `data-nuv-motion="reduced"` ของระบบ)
