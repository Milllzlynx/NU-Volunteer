/**
 * นำเข้ากิจกรรมจาก data/seed-activities.json (ครั้งเดียว)
 *
 *   npx tsx scripts/import-seed-activities.ts            # dry run — พิมพ์สรุป ไม่เขียนฐานข้อมูล
 *   npx tsx scripts/import-seed-activities.ts --commit   # เขียนจริง
 *
 * เขียนผ่าน Prisma ตรง ๆ เหมือน prisma/seed.ts
 *
 * วันที่ในไฟล์เป็น พ.ศ. แต่ฐานข้อมูลเก็บเวลาจริง (ค.ศ.) แล้วค่อยบวก 543 ตอนแสดง
 * จึงลบ 543 ก่อนบันทึก — 24/07/2569 ในไฟล์จะขึ้นเป็น 24/07/2569 ในแอปเหมือนเดิม
 *
 * ภาพ (ถ้ามี) วางไว้ที่ data/seed-activity-images/ — S1-2.jpg คือหน้าปกของชีต 1 ลำดับ 2,
 * S1-2-1.jpg ถึง -3 คือภาพประกอบ ย่อเป็น data URL ขนาดเดียวกับที่ฟอร์มย่อ (lib/imageFile.ts)
 *
 * รันซ้ำได้ — ข้ามกิจกรรมที่มีชื่อและเวลาเริ่มตรงกันอยู่แล้ว
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { prisma } from '@/lib/db';

type Cell = string | number | null;
type Sheet = { headers: string[]; rows: Cell[][] };

const DATA_FILE = 'data/seed-activities.json';
const IMAGE_DIR = 'data/seed-activity-images';
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;
/** ตรงกับ COVER_MAX_EDGE_PX และ MAX_EDGE_PX ใน lib/imageFile.ts */
const COVER_EDGE_PX = 1000;
const GALLERY_EDGE_PX = 1400;
const MAX_GALLERY = 3;

/** ชีตในไฟล์ → รหัสสั้นที่ใช้ตั้งชื่อภาพและอ้างถึงในตาราง FIXES */
const SHEET_KEYS: Record<string, string> = {
  'sheet1_กิจกรรมจิตอาสา': 'S1',
  'sheet2_กิจกรรมเลือกเสรี': 'S2',
};

/**
 * แก้วันที่ที่ขัดกันเองในต้นฉบับ — ต้องได้ เปิดรับสมัคร < ปิดรับสมัคร <= เริ่มกิจกรรม
 *
 * ชีต 2 เดิมเป็น Excel ที่บางช่องถูกอ่านวัน/เดือนสลับกัน จึงลองอ่านสลับก่อน
 * ถ้าสลับแล้วยังไม่ลงตัวค่อยปิดรับสมัครตอนกิจกรรมเริ่ม
 */
const FIXES: Record<string, { set: Record<string, string>; why: string }> = {
  'S2-1': {
    set: { ปิดรับสมัคร: '08/02/2569' },
    why: 'ปิดรับสมัคร 02/08 อยู่หลังวันจัด 04/04 → อ่านวัน/เดือนสลับเป็น 08/02/2569',
  },
  'S2-3': {
    set: { ปิดรับสมัคร: '07/08/2569' },
    why: 'ปิดรับสมัคร 08/07 อยู่ก่อนเปิด 20/07 → อ่านสลับเป็น 07/08/2569 (ก่อนวันจัด 08/08)',
  },
  'S2-7': {
    set: { ปิดรับสมัคร: 'START' },
    why: 'ปิดรับสมัคร 16/04 อยู่หลังเริ่ม 07/04 และอ่านสลับไม่ได้ → ปิดรับสมัครเมื่อกิจกรรมเริ่ม',
  },
  'S2-8': {
    set: { วันเริ่ม: '10/08/2569', วันสิ้นสุด: '11/08/2569', เปิดรับสมัคร: '07/08/2569', ปิดรับสมัคร: '10/08/2569' },
    why: 'กิจกรรมบริจาคโลหิต 08/10–08/11 กินเวลาทั้งเดือน → อ่านวัน/เดือนสลับทั้ง 4 ช่อง เป็นกิจกรรม 2 วัน 10–11/08/2569 รับสมัคร 07/08–10/08',
  },
  'S2-9': {
    set: { ปิดรับสมัคร: 'START' },
    why: 'ปิดรับสมัคร 31/10 อยู่หลังเริ่ม 05/01 → ปิดรับสมัครเมื่อกิจกรรมเริ่ม',
  },
  'S2-10': {
    set: { วันเริ่ม: '01/04/2569', ปิดรับสมัคร: 'START' },
    why: 'เริ่ม 04/01 อยู่ก่อนเปิดรับสมัคร 25/03 → อ่านสลับเป็น 01/04/2569; ปิดรับสมัคร 31/03/2570 อยู่หลังเริ่ม → ปิดเมื่อกิจกรรมเริ่ม',
  },
  'S2-11': {
    set: { เปิดรับสมัคร: '08/06/2569', ปิดรับสมัคร: '12/06/2569' },
    why: 'เปิด/ปิดรับสมัคร 06/08–06/12 อยู่หลังวันจัด 13/06 → อ่านสลับเป็น 08/06–12/06/2569',
  },
  'S2-12': {
    set: { เปิดรับสมัคร: '10/08/2569' },
    why: 'เปิดรับสมัคร 08/10 อยู่หลังปิด 18/08 และวันจัด 19/08 → อ่านสลับเป็น 10/08/2569',
  },
};

/** ข้อความเพิ่มท้ายคำอธิบาย สำหรับกิจกรรมที่หัวข้อกับเนื้อหาในประกาศต้นฉบับไม่ตรงกัน */
const DESCRIPTION_NOTES: Record<string, string> = {
  'S1-5':
    '(หมายเหตุ: ประกาศต้นฉบับใช้หัวข้อ "ขับขี่ปลอดภัย 19 มิ.ย." แต่เนื้อหาเป็นงานช่วยสำนักงานวันที่ 5 มิ.ย. — ข้อมูลกิจกรรมนี้ยึดตามเนื้อหา)',
};

/**
 * ภาพหน้าปกจาก Unsplash (ภาพฟรี ไม่ใช่ Unsplash+) — ลิงก์รูปแบบเดียวกับกิจกรรมตัวอย่างใน prisma/seed.ts
 * ใช้เมื่อไม่มีไฟล์ภาพของกิจกรรมนั้นใน data/seed-activity-images/
 */
const PHOTOS: Record<string, string> = {
  'S1-2': 'https://images.unsplash.com/photo-1786719664235-78cb91943275?auto=format&fit=crop&w=1200&q=70',
  'S1-3': 'https://images.unsplash.com/photo-1781039229695-2f29da1efd6c?auto=format&fit=crop&w=1200&q=70',
  'S1-4': 'https://images.unsplash.com/photo-1768158988974-4fb3e48d9c24?auto=format&fit=crop&w=1200&q=70',
  'S1-5': 'https://images.unsplash.com/photo-1780733066250-fe359ed8214c?auto=format&fit=crop&w=1200&q=70',
  'S1-6': 'https://images.unsplash.com/photo-1758599669406-d5179ccefcb9?auto=format&fit=crop&w=1200&q=70',
  'S1-7': 'https://images.unsplash.com/photo-1690378820474-b468b8ee64d3?auto=format&fit=crop&w=1200&q=70',
  'S1-8': 'https://images.unsplash.com/photo-1590682680695-43b964a3ae17?auto=format&fit=crop&w=1200&q=70',
  'S1-9': 'https://images.unsplash.com/photo-1748634569006-21bb45d7f5c5?auto=format&fit=crop&w=1200&q=70',
  'S1-10': 'https://images.unsplash.com/photo-1664382953481-141e97ad9825?auto=format&fit=crop&w=1200&q=70',
  'S1-11': 'https://images.unsplash.com/photo-1764874298962-ac0c84307fc0?auto=format&fit=crop&w=1200&q=70',
  'S1-12': 'https://images.unsplash.com/photo-1781038507273-1fdfa5646893?auto=format&fit=crop&w=1200&q=70',
  'S1-13': 'https://images.unsplash.com/photo-1771911655658-7420dae0322a?auto=format&fit=crop&w=1200&q=70',
  'S1-14': 'https://images.unsplash.com/photo-1785123059195-13accd32839b?auto=format&fit=crop&w=1200&q=70',
  'S1-15': 'https://images.unsplash.com/photo-1700165644892-3dd6b67b25bc?auto=format&fit=crop&w=1200&q=70',
  'S1-16': 'https://images.unsplash.com/photo-1763706320063-b210731b37a1?auto=format&fit=crop&w=1200&q=70',
  'S1-17': 'https://images.unsplash.com/photo-1577648875929-894904f7b051?auto=format&fit=crop&w=1200&q=70',
  'S1-18': 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=1200&q=70',
  'S1-19': 'https://images.unsplash.com/photo-1617117206620-b01f2919ff86?auto=format&fit=crop&w=1200&q=70',
  'S1-20': 'https://images.unsplash.com/photo-1595278069441-2cf29f8005a4?auto=format&fit=crop&w=1200&q=70',
  'S1-21': 'https://images.unsplash.com/photo-1536856136534-bb679c52a9aa?auto=format&fit=crop&w=1200&q=70',
  'S1-22': 'https://images.unsplash.com/photo-1546450985-dda6db4b7ec2?auto=format&fit=crop&w=1200&q=70',
  'S1-23': 'https://images.unsplash.com/photo-1687708522434-6197bb47c933?auto=format&fit=crop&w=1200&q=70',
  'S2-1': 'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?auto=format&fit=crop&w=1200&q=70',
  'S2-2': 'https://images.unsplash.com/photo-1688470923988-5d10b30d70d5?auto=format&fit=crop&w=1200&q=70',
  'S2-3': 'https://images.unsplash.com/photo-1743933399238-78d456f83812?auto=format&fit=crop&w=1200&q=70',
  'S2-4': 'https://images.unsplash.com/photo-1560493676-04071c5f467b?auto=format&fit=crop&w=1200&q=70',
  'S2-5': 'https://images.unsplash.com/photo-1773829020694-413e879d2957?auto=format&fit=crop&w=1200&q=70',
  'S2-6': 'https://images.unsplash.com/photo-1752650735509-58f11eaa2e10?auto=format&fit=crop&w=1200&q=70',
  'S2-7': 'https://images.unsplash.com/photo-1762341104168-63ddb56e9805?auto=format&fit=crop&w=1200&q=70',
  'S2-8': 'https://images.unsplash.com/photo-1615461066159-fea0960485d5?auto=format&fit=crop&w=1200&q=70',
  'S2-9': 'https://images.unsplash.com/photo-1771946309002-80d0d41affa7?auto=format&fit=crop&w=1200&q=70',
  'S2-10': 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=1200&q=70',
  'S2-11': 'https://images.unsplash.com/photo-1758270704787-615782711641?auto=format&fit=crop&w=1200&q=70',
  'S2-12': 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=70',
};

const commit = process.argv.includes('--commit');

/** ข้อความ "-" ในไฟล์หมายถึงไม่มี */
function clean(v: unknown): string {
  const t = String(v ?? '').trim();
  return t === '-' ? '' : t;
}

/** "24/07/2569" (พ.ศ.) + "08:00" (เวลาไทย) → Date จริง */
function toDate(raw: unknown, time: string): Date | null {
  const s = clean(raw);
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) throw new Error(`อ่านวันที่ไม่ได้: "${s}"`);
  const pad = (n: string) => n.padStart(2, '0');
  return new Date(`${Number(m[3]) - 543}-${pad(m[2])}-${pad(m[1])}T${time}:00+07:00`);
}

/** ตัวเลขนำหน้าคือชั่วโมง — ถ้ามีข้อความอื่นปนอยู่ เก็บข้อความเต็มไว้ในหมายเหตุ */
function parseHours(raw: Cell): { hours: number; note: string } {
  if (typeof raw === 'number') return { hours: raw, note: '' };
  const s = clean(raw);
  const m = s.match(/^(\d+(?:\.\d+)?)/);
  const note = s && !/^\d+(?:\.\d+)?$/.test(s) ? `ชั่วโมงจิตอาสา: ${s}` : '';
  return { hours: m ? Number(m[1]) : 0, note };
}

/** 0 หรือว่างคือไม่จำกัด — ถ้าระบุหลายตัวเลข ("20 หรือ 30") ใช้ตัวมากสุดแล้วบอกไว้ในหมายเหตุ */
function parseSeats(raw: Cell): { seats: number; note: string } {
  if (typeof raw === 'number') return { seats: raw, note: '' };
  const s = clean(raw);
  const nums = (s.match(/\d+/g) ?? []).map(Number);
  if (nums.length <= 1) return { seats: nums[0] ?? 0, note: '' };
  const seats = Math.max(...nums);
  return { seats, note: `จำนวนรับในประกาศไม่ชัดเจน ("${s}") — ใช้ ${seats} คนไปก่อน` };
}

async function toDataUrl(file: string, edge: number): Promise<string> {
  const buf = await sharp(file)
    .rotate()
    .resize(edge, edge, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

/** หาไฟล์ภาพของกิจกรรม — S1-2.jpg คือหน้าปก, S1-2-1.jpg ถึง -3 คือภาพประกอบ */
function findImages(files: string[], key: string) {
  const base = (f: string) => f.replace(IMAGE_EXT, '');
  const cover = files.find((f) => base(f) === key) ?? null;
  const gallery = files
    .filter((f) => new RegExp(`^${key}-[1-9]$`).test(base(f)))
    .sort()
    .slice(0, MAX_GALLERY);
  return { cover, gallery };
}

const fmt = (d: Date | null) =>
  d
    ? new Intl.DateTimeFormat('th-TH', {
        timeZone: 'Asia/Bangkok',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d)
    : '—';

async function main() {
  const sheets: Record<string, Sheet> = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const imageFiles = fs.existsSync(IMAGE_DIR)
    ? fs.readdirSync(IMAGE_DIR).filter((f) => IMAGE_EXT.test(f))
    : [];

  const categories = await prisma.category.findMany({ select: { id: true, label: true } });
  const staff = await prisma.user.findMany({
    where: { role: { in: ['organizer', 'admin'] } },
    select: { id: true, email: true, name: true },
  });

  const now = Date.now();
  const plans = [];
  const problems: string[] = [];

  for (const [sheetName, sheet] of Object.entries(sheets)) {
    for (const cells of sheet.rows) {
      const r: Record<string, Cell> = Object.fromEntries(sheet.headers.map((h, i) => [h, cells[i] ?? null]));
      const key = `${SHEET_KEYS[sheetName]}-${r.ลำดับ}`;
      const log: string[] = [];

      const fix = FIXES[key];
      if (fix) {
        for (const [col, value] of Object.entries(fix.set)) if (value !== 'START') r[col] = value;
        log.push(`แก้: ${fix.why}`);
      }

      const category = categories.find((c) => c.label === clean(r.หมวดหมู่));
      if (!category) problems.push(`${key}: ไม่พบหมวดหมู่ "${r.หมวดหมู่}"`);

      const orgName = clean(r.หน่วยงาน);
      const owner =
        staff.find((u) => u.name === orgName) ?? staff.find((u) => u.name === `สโมสรนิสิต${orgName}`);
      if (!owner) problems.push(`${key}: ไม่พบบัญชีผู้จัด "${orgName}"`);

      const { hours, note: hoursNote } = parseHours(r.ชั่วโมง);
      const { seats: seatsTotal, note: seatsNote } = parseSeats(r.จำนวนที่นั่ง);

      const startAt = toDate(r.วันเริ่ม, clean(r.เวลาเริ่ม) || '00:00');
      if (!startAt) {
        problems.push(`${key}: ไม่มีวันเริ่มกิจกรรม`);
        continue;
      }
      let endAt = toDate(r.วันสิ้นสุด || r.วันเริ่ม, clean(r.เวลาสิ้นสุด) || '23:59')!;
      if (!clean(r.วันสิ้นสุด) && !clean(r.เวลาสิ้นสุด) && hours > 0) {
        endAt = new Date(startAt.getTime() + hours * 3600_000);
        log.push(`ไม่มีเวลาสิ้นสุด → เริ่ม + ${hours} ชม.`);
      }

      const regOpenAt = toDate(r.เปิดรับสมัคร, '00:00');
      let regCloseAt = toDate(r.ปิดรับสมัคร, '23:59');
      if (fix?.set.ปิดรับสมัคร === 'START') regCloseAt = startAt;
      // ปิดรับสมัครวันเดียวกับวันจัด — ปิดตอนกิจกรรมเริ่ม ไม่ใช่ 23:59 ของวันนั้น
      if (regCloseAt && regCloseAt > startAt && regCloseAt.getTime() - startAt.getTime() < 86_400_000) {
        regCloseAt = startAt;
        log.push('ปิดรับสมัครวันเดียวกับวันจัด → ปิดเมื่อกิจกรรมเริ่ม');
      }

      if (endAt <= startAt) problems.push(`${key}: เวลาสิ้นสุดไม่หลังเวลาเริ่ม`);
      if (regOpenAt && regCloseAt && regCloseAt <= regOpenAt) problems.push(`${key}: ปิดรับสมัครไม่หลังเปิด`);
      if (regCloseAt && regCloseAt > startAt) problems.push(`${key}: ปิดรับสมัครหลังกิจกรรมเริ่ม`);
      if (regOpenAt && regOpenAt > startAt) problems.push(`${key}: เปิดรับสมัครหลังกิจกรรมเริ่ม`);

      const bring = clean(r.สิ่งที่ต้องเตรียม);
      const remark = clean(r.หมายเหตุ);
      const notes = [
        bring && `สิ่งที่ต้องเตรียม: ${bring}`,
        remark && `หมายเหตุ: ${remark}`,
        hoursNote,
        seatsNote,
      ]
        .filter(Boolean)
        .join('\n');

      const description = [clean(r.รายละเอียด), DESCRIPTION_NOTES[key]].filter(Boolean).join('\n\n');
      const perks = clean(r.สิทธิประโยชน์);

      plans.push({
        key,
        log,
        ownerEmail: owner?.email,
        images: findImages(imageFiles, key),
        data: {
          title: clean(r.ชื่อกิจกรรม),
          categoryId: category?.id ?? '',
          organizerId: owner?.id ?? '',
          orgName,
          description,
          location: clean(r.สถานที่),
          mapLink: clean(r.แผนที่) || null,
          startAt,
          endAt,
          regOpenAt,
          regCloseAt,
          seatsTotal,
          hours,
          // ยังไม่จบ = open — กิจกรรมต่อเนื่องที่เริ่มไปแล้วแต่ยังไม่ถึงวันสิ้นสุดก็ยังเปิดอยู่
          status: endAt.getTime() > now ? 'open' : 'done',
          perks: JSON.stringify(perks ? [perks] : []),
          notes,
        },
      });
    }
  }

  console.log(`ฐานข้อมูล: ${process.env.DATABASE_URL?.replace(/\/\/([^.]{0,6})[^/]*/, '//$1…')}`);
  console.log(`โหมด: ${commit ? 'COMMIT' : 'DRY RUN (ไม่เขียนฐานข้อมูล)'}\n`);
  if (problems.length) {
    console.log('ปัญหาที่ต้องแก้ก่อน:\n' + problems.map((p) => `  ✗ ${p}`).join('\n') + '\n');
    if (commit) throw new Error('ยกเลิก — มีปัญหาที่ยังไม่ได้แก้');
  }

  let created = 0;
  let skipped = 0;
  let updated = 0;
  for (const p of plans) {
    const d = p.data;
    const exists = await prisma.activity.findFirst({
      where: { title: d.title, startAt: d.startAt, deletedAt: null },
      select: { id: true, photo: true },
    });
    console.log(`${p.key.padEnd(6)} [${d.status.toUpperCase()}] ${d.title}`);
    console.log(
      `       ${d.categoryId} · ${p.ownerEmail} · ${d.hours} ชม. · ที่นั่ง ${d.seatsTotal || 'ไม่จำกัด'}`,
    );
    console.log(`       กิจกรรม  ${fmt(d.startAt)} → ${fmt(d.endAt)}`);
    console.log(`       รับสมัคร ${fmt(d.regOpenAt)} → ${fmt(d.regCloseAt)}`);
    if (d.notes) console.log(`       notes    ${d.notes.replace(/\n/g, ' ⏎ ')}`);
    const { cover, gallery } = p.images;
    const photoUrl = PHOTOS[p.key] ?? null;
    if (cover || gallery.length) console.log(`       ภาพ     ${[cover, ...gallery].filter(Boolean).join(', ')}`);
    else if (photoUrl) console.log(`       ภาพ     ${photoUrl.split('?')[0]}`);
    for (const l of p.log) console.log(`       ✎ ${l}`);

    const at = (f: string) => path.join(IMAGE_DIR, f);
    const photo = async () => (cover ? await toDataUrl(at(cover), COVER_EDGE_PX) : photoUrl);

    if (exists) {
      // กิจกรรมที่นำเข้าไปแล้วแต่ยังไม่มีภาพ — เติมภาพให้ ไม่แตะภาพที่ผู้จัดใส่เองภายหลัง
      if (!exists.photo && (cover || photoUrl)) {
        console.log('       ↷ มีอยู่แล้ว — เติมภาพหน้าปก');
        if (commit) await prisma.activity.update({ where: { id: exists.id }, data: { photo: await photo() } });
        updated++;
      } else {
        console.log('       ↷ มีอยู่แล้ว — ข้าม');
        skipped++;
      }
    } else if (commit) {
      await prisma.activity.create({
        data: {
          ...d,
          photo: await photo(),
          gallery: JSON.stringify(await Promise.all(gallery.map((f) => toDataUrl(at(f), GALLERY_EDGE_PX)))),
        },
      });
      created++;
    }
  }

  const open = plans.filter((p) => p.data.status === 'open').length;
  console.log(`\nรวม ${plans.length} กิจกรรม (open ${open}, done ${plans.length - open})`);
  console.log(`${commit ? '' : '(จะ) '}สร้าง ${created}, เติมภาพ ${updated}, ข้าม ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
