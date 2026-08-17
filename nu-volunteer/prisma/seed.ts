/**
 * ข้อมูลตัวอย่างสำหรับการพัฒนา — รันด้วย `npm run db:seed`
 *
 * ปลอดภัยต่อการรันซ้ำ (upsert ตามคีย์ที่ไม่ซ้ำ) และจะไม่ทำงานเมื่อ SEED_ENABLED != true
 * ข้อมูลกิจกรรม/หมวดหมู่/คณะ ยกมาจากต้นแบบ (NU Volunteer.dc.html) ให้ตรงกับที่ออกแบบไว้
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient } from '../lib/generated/prisma/client';
import { academicYearOf } from '../lib/academic';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

/* เลือก adapter แบบเดียวกับ lib/db.ts — ใส่ข้อมูลตัวอย่างลง Turso ได้ด้วยคำสั่งเดิม */
const remote = url.startsWith('libsql://') || url.startsWith('http://') || url.startsWith('https://');
if (remote && !process.env.DATABASE_AUTH_TOKEN) {
  throw new Error('DATABASE_AUTH_TOKEN is not set (required for libsql:// URLs)');
}

const prisma = new PrismaClient({
  adapter: remote
    ? new PrismaLibSql({ url, authToken: process.env.DATABASE_AUTH_TOKEN })
    : new PrismaBetterSqlite3({ url }),
});

const CATEGORIES = [
  { id: 'acad', label: 'ด้านส่งเสริมวิชาการ', labelEn: 'Academic', color: '#B37CF6' },
  { id: 'service', label: 'ด้านบำเพ็ญประโยชน์', labelEn: 'Community service', color: '#63D2A1' },
  { id: 'morality', label: 'ด้านส่งเสริมคุณธรรม จริยธรรม', labelEn: 'Ethics & morality', color: '#F5A623' },
  { id: 'arts', label: 'ด้านส่งเสริมศิลปวัฒนธรรม', labelEn: 'Arts & culture', color: '#EC6FBB' },
  { id: 'health', label: 'ด้านส่งเสริมสุขภาพ กีฬา', labelEn: 'Health & sports', color: '#E97171' },
  { id: 'recreation', label: 'ด้านนันทนาการ', labelEn: 'Recreation', color: '#78B8FF' },
  { id: 'public', label: 'ด้านจิตสาธารณะ', labelEn: 'Public service', color: '#21B0B0' },
];

const FACULTIES: [string, string, string][] = [
  ['คณะเกษตรศาสตร์ ทรัพยากรธรรมชาติและสิ่งแวดล้อม', 'สีเขียว', '#1B8A3A'],
  ['คณะนิติศาสตร์', 'สีขาว', '#FFFFFF'],
  ['คณะบริหารธุรกิจ เศรษฐศาสตร์และการสื่อสาร', 'สีฟ้า', '#4FA8E8'],
  ['คณะพยาบาลศาสตร์', 'สีชมพู', '#F49AC1'],
  ['คณะแพทยศาสตร์', 'สีเขียวใบไม้', '#4CA64C'],
  ['คณะเภสัชศาสตร์', 'สีม่วง', '#7B3FA0'],
  ['คณะมนุษยศาสตร์', 'สีแสด', '#F07C1E'],
  ['คณะวิทยาศาสตร์', 'สีเหลือง', '#F2C314'],
  ['คณะวิทยาศาสตร์การแพทย์', 'สีแสดทอง', '#E0932A'],
  ['คณะวิศวกรรมศาสตร์', 'สีเลือดหมู', '#7B2D33'],
  ['คณะศึกษาศาสตร์', 'สีฟ้า', '#5BA7D6'],
  ['คณะสถาปัตยกรรมศาสตร์และการออกแบบ', 'สีเขียวตองอ่อน', '#A8D14B'],
  ['คณะสหเวชศาสตร์', 'สีน้ำเงิน', '#1F3F94'],
  ['คณะสัตวแพทยศาสตร์', 'สีแสดแดง', '#E2542B'],
  ['คณะสาธารณสุขศาสตร์', 'สีฟ้าน้ำทะเล', '#17A7A0'],
  ['คณะศิลปกรรมศาสตร์และวัฒนธรรมศาสตร์', 'สีม่วงลาเวนเดอร์', '#B49BE0'],
  ['คณะสังคมศาสตร์', 'สีบัวโรย', '#B48FA8'],
];

/** รหัสผ่านของทุกบัญชีตัวอย่าง — ใช้เฉพาะเครื่องพัฒนาเท่านั้น */
const DEMO_PASSWORD = 'Volunteer2569';

const STAFF = [
  { email: 'admin@nu.ac.th', name: 'ผู้ดูแลระบบ NU Volunteer', role: 'admin' },
  { email: 'organizer@nu.ac.th', name: 'กองกิจการนิสิต', role: 'organizer' },
  { email: 'orgsci@nu.ac.th', name: 'สโมสรนิสิตคณะวิทยาศาสตร์', role: 'organizer' },
];

const STUDENTS = [
  { email: 'student@nu.ac.th', name: 'ณัฐชา วิริยะกุล', studentId: '64100001', faculty: 'คณะวิทยาศาสตร์', loanStatus: 'yes' },
  { email: 'student2@nu.ac.th', name: 'ปุณยวีร์ ทองแท้', studentId: '64100002', faculty: 'คณะวิศวกรรมศาสตร์', loanStatus: 'no' },
  { email: 'student3@nu.ac.th', name: 'ธนกฤต แสงเงิน', studentId: '64100003', faculty: 'คณะศึกษาศาสตร์', loanStatus: 'yes' },
  { email: 'student4@nu.ac.th', name: 'อภิสิทธิ์ บุญมี', studentId: '64100004', faculty: 'คณะพยาบาลศาสตร์', loanStatus: 'yes' },
  { email: 'student5@nu.ac.th', name: 'ศิรประภา อินทร์ทอง', studentId: '64100005', faculty: 'คณะสังคมศาสตร์', loanStatus: 'no' },
  { email: 'student6@nu.ac.th', name: 'กันตพงศ์ ชัยวัฒน์', studentId: '64100006', faculty: 'คณะสาธารณสุขศาสตร์', loanStatus: 'no' },
];

/** แบนเนอร์ประกาศบนหน้าหลักของนิสิต — ctaTarget เป็นคีย์หน้าใน ROLE_NAV */
const BANNERS = [
  {
    id: 'b1',
    title: 'NU Run 2569 สมัครวันนี้',
    desc: 'เปิดรับสมัครกิจกรรมเดิน-วิ่งการกุศล NU Run ประจำปี 2569 จำนวนจำกัด รีบสมัครก่อนที่นั่งเต็ม',
    image: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=70',
    ctaLabel: 'สมัคร NU Run',
    ctaTarget: 'discover',
    type: 'general',
    visible: true,
  },
  {
    id: 'b2',
    title: 'อย่าลืมอัปโหลดหลักฐานกิจกรรม',
    desc: 'นิสิตที่เช็กเอาต์แล้วกรุณาอัปโหลดหลักฐานภายใน 7 วัน เพื่อรับชั่วโมงจิตอาสา',
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=70',
    ctaLabel: 'อัปโหลดหลักฐาน',
    ctaTarget: 'registrations',
    type: 'reminder',
    visible: true,
  },
  {
    id: 'b3',
    title: 'ปรับปรุงระบบชั่วคราว',
    desc: 'ระบบจะปิดปรับปรุงวันที่ 30 ก.ค. 2569 เวลา 00:00-04:00 น. ขออภัยในความไม่สะดวก',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=70',
    ctaLabel: 'ดูรายละเอียด',
    ctaTarget: 'guide',
    type: 'update',
    visible: true,
  },
  {
    id: 'b4',
    title: 'ค่ายอาสาภาคฤดูร้อน',
    desc: 'เปิดรับสมัครนิสิตเข้าร่วมค่ายอาสาภาคฤดูร้อน ประจำปีการศึกษา 2569',
    image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=70',
    ctaLabel: 'ดูกิจกรรม',
    ctaTarget: 'discover',
    type: 'general',
    visible: false,
  },
];

type ActivitySeed = {
  key: string;
  title: string;
  cat: string;
  org: string;
  orgEmail: string;
  location: string;
  photo: string;
  seatsTotal: number;
  hours: number;
  desc: string;
  /** จำนวนวันนับจากวันนี้ (ค่าติดลบ = กิจกรรมที่ผ่านไปแล้ว) */
  dayOffset: number;
  startHour: number;
  /** พิกัดสำหรับปุ่มเปิดแผนที่ในหน้ารายละเอียด */
  lat?: number;
  lng?: number;
  /** ภาพแผนที่ที่แสดงในหน้ารายละเอียด */
  mapImage?: string;
  /** จำนวนวันที่กิจกรรมกินเวลา (ค่ายค้างคืน) — ไม่ใส่ = จบภายในวันเดียว */
  spanDays?: number;
};

/**
 * สิทธิประโยชน์และสิ่งที่ต้องเตรียม — หน้ารายละเอียดกิจกรรมอ่านจากสองคอลัมน์นี้
 * ตั้งเป็นชุดกลางแล้วไล่แจกตามลำดับ เพราะเนื้อหาจริงผู้จัดเป็นคนกรอกเอง
 * ถ้าปล่อยว่างไว้ หัวข้อ "สิทธิประโยชน์" กับ "สิ่งที่ต้องเตรียม" จะไม่ขึ้นเลยตอนสาธิต
 */
const PERK_SETS: string[][] = [
  ['เกียรติบัตรและชั่วโมงจิตอาสา', 'อาหารกลางวันและเครื่องดื่มฟรี', 'อุปกรณ์และเสื้อกิจกรรม'],
  ['เกียรติบัตรและชั่วโมงจิตอาสา', 'ของที่ระลึกจากผู้จัด', 'รถรับส่งจากมหาวิทยาลัย'],
  ['เกียรติบัตรและชั่วโมงจิตอาสา', 'อาหารว่างระหว่างกิจกรรม', 'ประกันอุบัติเหตุระหว่างกิจกรรม'],
];

const PREP_SETS: string[][] = [
  ['รองเท้าผ้าใบหรือรองเท้าที่เดินสะดวก', 'เสื้อแขนยาวกันแดด', 'หมวกและครีมกันแดด'],
  ['บัตรประจำตัวนิสิต', 'ขวดน้ำส่วนตัว', 'เสื้อสีสุภาพ'],
  ['ถุงมือผ้า', 'หมวกและครีมกันแดด', 'ผ้าเช็ดตัวผืนเล็ก'],
];

/** ภาพประกอบตัวอย่าง — ใช้ชุดเดียวกันทุกกิจกรรมเพื่อไม่ให้ seed ยาวเกินจำเป็น */
const GALLERY = [
  'https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=900&q=70',
];

const ACTIVITIES: ActivitySeed[] = [
  {
    key: 'seed-a1',
    title: 'ปลูกป่าชายเลนฟื้นฟูชายฝั่ง',
    cat: 'service',
    org: 'ชมรมอนุรักษ์สิ่งแวดล้อม มน.',
    orgEmail: 'organizer@nu.ac.th',
    location: 'อ.บางระกำ จ.พิษณุโลก',
    photo: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=70',
    seatsTotal: 50,
    hours: 6,
    desc: 'ร่วมกันปลูกต้นโกงกางฟื้นฟูพื้นที่ป่าชายเลนที่เสื่อมโทรม พร้อมเรียนรู้ระบบนิเวศชายฝั่งจากวิทยากรผู้เชี่ยวชาญ',
    dayOffset: 6,
    startHour: 7,
    lat: 16.7011,
    lng: 100.1183,
    mapImage: 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?auto=format&fit=crop&w=900&q=70',
  },
  {
    key: 'seed-a2',
    title: 'ค่ายอาสาสอนน้องคณิตศาสตร์',
    cat: 'acad',
    org: 'คณะวิทยาศาสตร์',
    orgEmail: 'orgsci@nu.ac.th',
    location: 'โรงเรียนบ้านคลองเตย จ.พิษณุโลก',
    photo: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=900&q=70',
    seatsTotal: 20,
    hours: 12,
    desc: 'สอนวิชาคณิตศาสตร์พื้นฐานให้นักเรียนชั้นประถมศึกษา พร้อมกิจกรรมนันทนาการ',
    dayOffset: 11,
    startHour: 8,
    spanDays: 3,
    mapImage: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=900&q=70',
  },
  {
    key: 'seed-a3',
    title: 'NU Run เดิน-วิ่งการกุศล',
    cat: 'health',
    org: 'กองกิจการนิสิต',
    orgEmail: 'organizer@nu.ac.th',
    location: 'สนามกีฬากลาง มหาวิทยาลัยนเรศวร',
    photo: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=900&q=70',
    seatsTotal: 200,
    hours: 4,
    desc: 'เดิน-วิ่งการกุศลระยะ 5 กม. รายได้สมทบทุนการศึกษาให้นิสิตที่ขาดแคลนทุนทรัพย์',
    dayOffset: 16,
    startHour: 5,
    lat: 16.7458,
    lng: 100.1936,
  },
  {
    key: 'seed-a4',
    title: 'บริจาคโลหิตประจำปี',
    cat: 'public',
    org: 'สภากาชาดไทย ร่วมกับ มน.',
    orgEmail: 'organizer@nu.ac.th',
    location: 'หอประชุมมหาวิทยาลัยนเรศวร',
    photo: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=900&q=70',
    seatsTotal: 80,
    hours: 4,
    desc: 'ร่วมบริจาคโลหิตกับสภากาชาดไทย หนึ่งการให้ของคุณช่วยชีวิตเพื่อนมนุษย์ได้ถึงสามคน',
    dayOffset: 21,
    startHour: 9,
  },
  {
    key: 'seed-a5',
    title: 'Workshop Coding เบื้องต้น',
    cat: 'acad',
    org: 'คณะวิศวกรรมศาสตร์',
    orgEmail: 'orgsci@nu.ac.th',
    location: 'อาคารเรียนรวม คณะวิศวกรรมศาสตร์',
    photo: 'https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?auto=format&fit=crop&w=900&q=70',
    seatsTotal: 30,
    hours: 8,
    desc: 'อบรมพื้นฐานการเขียนโปรแกรมให้น้องมัธยมที่สนใจด้านเทคโนโลยี',
    dayOffset: 26,
    startHour: 9,
  },
  {
    key: 'seed-a6',
    title: 'ค่ายศิลปะเพื่อน้อง',
    cat: 'arts',
    org: 'ชมรมศิลปะ มน.',
    orgEmail: 'organizer@nu.ac.th',
    location: 'โรงเรียนวัดจันทร์ตะวันออก จ.พิษณุโลก',
    photo: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=900&q=70',
    seatsTotal: 25,
    hours: 10,
    desc: 'สอนศิลปะและงานประดิษฐ์ให้น้องๆ พร้อมจัดแสดงผลงานปลายค่าย',
    dayOffset: 31,
    startHour: 8,
  },
  {
    key: 'seed-a7',
    title: 'อบรมปฐมพยาบาลเบื้องต้น',
    cat: 'health',
    org: 'คณะพยาบาลศาสตร์',
    orgEmail: 'orgsci@nu.ac.th',
    location: 'คณะพยาบาลศาสตร์ มหาวิทยาลัยนเรศวร',
    photo: 'https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=900&q=70',
    seatsTotal: 40,
    hours: 4,
    desc: 'เรียนรู้การปฐมพยาบาลและการช่วยฟื้นคืนชีพ (CPR) จากอาจารย์พยาบาลวิชาชีพ',
    dayOffset: 38,
    startHour: 13,
  },
  {
    key: 'seed-a8',
    title: 'กิจกรรมนันทนาการสานสัมพันธ์น้องใหม่',
    cat: 'recreation',
    org: 'กองกิจการนิสิต',
    orgEmail: 'organizer@nu.ac.th',
    location: 'หอประชุมมหาวิทยาลัยนเรศวร',
    photo: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=900&q=70',
    seatsTotal: 120,
    hours: 4,
    desc: 'กิจกรรมกลุ่มสัมพันธ์และเกมนันทนาการสำหรับนิสิตชั้นปีที่ 1',
    dayOffset: 45,
    startHour: 13,
  },
  {
    key: 'seed-a9',
    title: 'ค่ายคุณธรรมนำความรู้',
    cat: 'morality',
    org: 'ชมรมพุทธศาสนา มน.',
    orgEmail: 'organizer@nu.ac.th',
    location: 'วัดสระแก้วปทุมทอง จ.พิษณุโลก',
    photo: 'https://images.unsplash.com/photo-1545389336-cf090694435e?auto=format&fit=crop&w=900&q=70',
    seatsTotal: 60,
    hours: 8,
    desc: 'ปฏิบัติธรรมและกิจกรรมปลูกฝังจริยธรรมสำหรับนิสิต พร้อมบำเพ็ญประโยชน์ในวัด',
    dayOffset: 52,
    startHour: 8,
  },
  /* กิจกรรมที่ผ่านไปแล้ว — ใช้สร้างชั่วโมงสะสมและสถิติหน้าแรก */
  {
    key: 'seed-p1',
    title: 'เก็บขยะชายหาดคืนความสะอาดให้ธรรมชาติ',
    cat: 'service',
    org: 'ชมรมอนุรักษ์สิ่งแวดล้อม มน.',
    orgEmail: 'organizer@nu.ac.th',
    location: 'ชายหาดบางแสน จ.ชลบุรี',
    photo: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=900&q=70',
    seatsTotal: 45,
    hours: 6,
    desc: 'ลงมือเก็บขยะชายหาดและพื้นที่สาธารณะ พร้อมคัดแยกขยะรีไซเคิล',
    dayOffset: -21,
    startHour: 7,
  },
  {
    key: 'seed-p2',
    title: 'ติวเข้มน้องมัธยมก่อนสอบ TCAS',
    cat: 'acad',
    org: 'สโมสรนิสิตคณะศึกษาศาสตร์',
    orgEmail: 'orgsci@nu.ac.th',
    location: 'โรงเรียนพิษณุโลกพิทยาคม',
    photo: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=900&q=70',
    seatsTotal: 35,
    hours: 4,
    desc: 'ติวเนื้อหาและเทคนิคทำข้อสอบให้น้องมัธยมปลายก่อนสอบเข้ามหาวิทยาลัย',
    dayOffset: -14,
    startHour: 9,
  },
  {
    key: 'seed-p3',
    title: 'ตรวจสุขภาพเบื้องต้นชุมชนท่าโพธิ์',
    cat: 'health',
    org: 'คณะสหเวชศาสตร์',
    orgEmail: 'orgsci@nu.ac.th',
    location: 'ศาลาประชาคม ต.ท่าโพธิ์ จ.พิษณุโลก',
    photo: 'https://images.unsplash.com/photo-1587560699334-cc4ff634909a?auto=format&fit=crop&w=900&q=70',
    seatsTotal: 50,
    hours: 4,
    desc: 'วัดความดัน ตรวจน้ำตาลในเลือด และให้ความรู้ด้านสุขภาพแก่ผู้สูงอายุในชุมชน',
    dayOffset: -7,
    startHour: 8,
  },
];

function at(dayOffset: number, hour: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function main() {
  if (process.env.SEED_ENABLED !== 'true') {
    console.log('[seed] ข้าม — ต้องตั้ง SEED_ENABLED=true ก่อนจึงจะใส่ข้อมูลตัวอย่างได้');
    return;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[seed] ห้ามรันบน production');
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const c of CATEGORIES) {
    await prisma.category.upsert({
      where: { id: c.id },
      update: { label: c.label, labelEn: c.labelEn, color: c.color },
      create: { ...c, order: CATEGORIES.indexOf(c), active: true },
    });
  }

  for (const [i, [name, colorName, color]] of FACULTIES.entries()) {
    await prisma.faculty.upsert({
      where: { name },
      update: { colorName, color, order: i },
      create: { name, colorName, color, order: i },
    });
  }

  for (const s of [...STAFF, ...STUDENTS]) {
    const student = 'studentId' in s ? s : null;
    await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        email: s.email,
        passwordHash,
        role: 'role' in s ? s.role : 'student',
        name: s.name,
        studentId: student?.studentId ?? null,
        faculty: student?.faculty ?? null,
        loanStatus: student?.loanStatus ?? null,
        seeded: true,
      },
    });
  }

  const organizers = new Map(
    (
      await prisma.user.findMany({
        where: { email: { in: STAFF.map((s) => s.email) } },
        select: { id: true, email: true },
      })
    ).map((u) => [u.email, u.id]),
  );

  const students = await prisma.user.findMany({
    where: { email: { in: STUDENTS.map((s) => s.email) } },
    select: { id: true },
    orderBy: { email: 'asc' },
  });

  /** กิจกรรมที่อยู่ไกลที่สุด — ตัวเดียวที่จงใจปล่อยให้ "ยังไม่เปิดรับสมัคร" */
  const FURTHEST_OFFSET = Math.max(...ACTIVITIES.map((a) => a.dayOffset));

  for (const a of ACTIVITIES) {
    const past = a.dayOffset < 0;
    const startAt = at(a.dayOffset, a.startHour);
    // ค่ายค้างคืนจบคนละวันกับวันเริ่ม ส่วนกิจกรรมทั่วไปจบภายในวันเดียวตามจำนวนชั่วโมง
    const endAt = a.spanDays && a.spanDays > 1
      ? at(a.dayOffset + a.spanDays - 1, a.startHour + Math.min(8, a.hours))
      : new Date(startAt.getTime() + a.hours * 3600_000);
    const organizerId = organizers.get(a.orgEmail) ?? organizers.get('organizer@nu.ac.th')!;

    const data = {
      title: a.title,
      categoryId: a.cat,
      organizerId,
      orgName: a.org,
      description: a.desc,
      location: a.location,
      startAt,
      endAt,
      /**
       * เปิดรับสมัครล่วงหน้า 14 วันตามกติกาจริง แต่ต้องไม่หลุดไปอยู่ในอนาคต
       *
       * กิจกรรมตัวอย่างกระจายไปไกลถึง 52 วันข้างหน้า ถ้าคิดจาก dayOffset - 14 ตรง ๆ
       * กิจกรรมส่วนใหญ่จะยังไม่ถึงวันเปิดรับตั้งแต่วินาทีที่ seed เสร็จ กดสมัครไม่ได้สักอัน
       * ข้อมูลตัวอย่างที่สมัครไม่ได้เลยทำให้ทดสอบการลงทะเบียนไม่ได้ จึงหนีบให้เปิดแล้วเสมอ
       *
       * ยกเว้นกิจกรรมที่ไกลที่สุดหนึ่งรายการ ปล่อยให้ยังไม่เปิดรับตามจริง
       * จะได้มีตัวอย่างของสถานะ "ยังไม่เปิดรับสมัคร" ไว้ดูบนหน้าจอด้วย
       */
      regOpenAt: at(
        a.dayOffset === FURTHEST_OFFSET ? a.dayOffset - 14 : Math.min(a.dayOffset - 14, -1),
        9,
      ),
      regCloseAt: at(a.dayOffset - 1, 23),
      seatsTotal: a.seatsTotal,
      hours: a.hours,
      status: past ? 'done' : 'open',
      photo: a.photo,
      requiresApproval: true,
      // ไล่แจกชุดข้อมูลตามลำดับกิจกรรม ผลลัพธ์จึงเหมือนเดิมทุกครั้งที่ seed
      perks: JSON.stringify(PERK_SETS[ACTIVITIES.indexOf(a) % PERK_SETS.length]),
      prep: JSON.stringify(PREP_SETS[ACTIVITIES.indexOf(a) % PREP_SETS.length]),
      gallery: JSON.stringify(GALLERY),
      lat: a.lat ?? null,
      lng: a.lng ?? null,
      mapImage: a.mapImage ?? null,
    };

    // ใช้ title เป็นคีย์ประจำตัวของข้อมูลตัวอย่าง (schema ไม่มี unique อื่นให้ใช้)
    const existing = await prisma.activity.findFirst({ where: { title: a.title } });
    const activity = existing
      ? await prisma.activity.update({ where: { id: existing.id }, data })
      : await prisma.activity.create({ data });

    // ผู้เข้าร่วม: กระจายนิสิตแบบคงที่ (ผลลัพธ์เหมือนเดิมทุกครั้งที่ seed)
    const joinCount = past ? students.length : 1 + (ACTIVITIES.indexOf(a) % students.length);
    for (let i = 0; i < joinCount; i++) {
      const student = students[i];
      const status = past ? 'completed' : i % 3 === 0 ? 'pending' : 'approved';
      await prisma.registration.upsert({
        where: { userId_activityId: { userId: student.id, activityId: activity.id } },
        update: {},
        create: {
          userId: student.id,
          activityId: activity.id,
          status,
          approvedAt: status === 'pending' ? null : startAt,
          checkedInAt: past ? startAt : null,
          checkedOutAt: past ? endAt : null,
          hoursComputed: past ? a.hours : 0,
          hoursAwarded: past ? a.hours : 0,
          hoursApprovedAt: past ? endAt : null,
        },
      });
    }
  }

  for (const [i, b] of BANNERS.entries()) {
    const { id, ...rest } = b;
    await prisma.banner.upsert({
      where: { id },
      update: { ...rest, order: i },
      create: { id, ...rest, order: i },
    });
  }

  // เกณฑ์ชั่วโมง กยศ. — แอดมินแก้ค่านี้ได้ในหน้าตั้งค่า
  await prisma.setting.upsert({
    where: { key: 'kyf.hoursGoal' },
    update: {},
    create: { key: 'kyf.hoursGoal', value: '36' },
  });

  // ใบประกาศออกให้กิจกรรมที่เสร็จสิ้นและรับรองชั่วโมงแล้ว
  const completed = await prisma.registration.findMany({
    where: { status: 'completed', hoursApprovedAt: { not: null } },
    select: { id: true, userId: true, activityId: true, hoursAwarded: true, hoursApprovedAt: true },
  });
  for (const r of completed) {
    await prisma.certificate.upsert({
      where: { registrationId: r.id },
      update: {},
      create: {
        // ref คงที่ต่อการลงทะเบียนหนึ่งใบ เพื่อให้ seed ซ้ำได้โดยไม่ชนคีย์
        ref: `NUV-${academicYearOf(r.hoursApprovedAt!).year}-${r.id.slice(-5).toUpperCase()}`,
        userId: r.userId,
        activityId: r.activityId,
        registrationId: r.id,
        hours: r.hoursAwarded,
        issuedAt: r.hoursApprovedAt!,
      },
    });
  }

  // ใบที่ถูกเพิกถอนหนึ่งใบ — ไม่อย่างนั้นหน้าใบประกาศกับหน้าตรวจสอบสาธารณะ
  // จะไม่มีทางแสดงสถานะ "ถูกเพิกถอน" ให้เห็นเลยตอนสาธิต
  // เหตุผลตั้งเป็นการแก้ข้อมูลซ้ำซ้อน ไม่ใช่กรณีทุจริต เพราะเป็นข้อมูลตัวอย่าง
  // ใบของบัญชีเดโมหลัก เพื่อให้เห็นสถานะนี้ได้ทั้งหน้าใบประกาศของนิสิตและหน้าตรวจสอบ
  const oldestCertificate = await prisma.certificate.findFirst({
    where: { revokedAt: null, user: { email: STUDENTS[0].email } },
    orderBy: { issuedAt: 'asc' },
    select: { id: true },
  });
  if (oldestCertificate) {
    await prisma.certificate.update({
      where: { id: oldestCertificate.id },
      data: {
        revokedAt: at(-5, 10),
        revokeReason: 'ออกซ้ำซ้อนกับใบเดิมของกิจกรรมเดียวกัน — ให้ใช้ใบที่ออกภายหลังแทน',
      },
    });
  }

  // รีวิวของกิจกรรมที่จบไปแล้ว — ไม่มีข้อมูลนี้ หัวข้อ "รีวิวจากผู้เข้าร่วม"
  // ในหน้ารายละเอียดจะไม่ขึ้นเลยตอนสาธิต
  const REVIEW_TEXTS: [number, string][] = [
    [5, 'จัดงานเป็นระบบมาก พี่ ๆ ทีมงานดูแลดีตลอดวัน ได้ความรู้กลับไปเยอะ'],
    [4, 'กิจกรรมสนุกและได้ช่วยชุมชนจริง ๆ ถ้ามีน้ำดื่มเพิ่มอีกหน่อยจะดีมาก'],
    [5, 'ประทับใจครับ ได้เพื่อนใหม่ด้วย แล้วจะมาร่วมอีกแน่นอน'],
  ];
  const reviewable = await prisma.registration.findMany({
    where: { status: 'completed' },
    select: { userId: true, activityId: true, hoursApprovedAt: true },
    take: 12,
  });
  for (const [i, r] of reviewable.entries()) {
    const [stars, comment] = REVIEW_TEXTS[i % REVIEW_TEXTS.length];
    await prisma.review.upsert({
      where: { activityId_userId: { activityId: r.activityId, userId: r.userId } },
      update: {},
      create: {
        activityId: r.activityId,
        userId: r.userId,
        stars,
        comment,
        createdAt: r.hoursApprovedAt ?? new Date(),
      },
    });
  }

  // รายการโปรด — ให้นิสิตแต่ละคนบันทึกกิจกรรมที่ยังเปิดรับสมัครไว้คนละ 2 รายการ
  const upcoming = await prisma.activity.findMany({
    where: { status: 'open' },
    orderBy: { startAt: 'asc' },
    select: { id: true },
    take: 6,
  });
  for (const [i, student] of students.entries()) {
    for (const offset of [0, 1]) {
      const activity = upcoming[(i + offset) % upcoming.length];
      if (!activity) continue;
      await prisma.favorite.upsert({
        where: { userId_activityId: { userId: student.id, activityId: activity.id } },
        update: {},
        create: { userId: student.id, activityId: activity.id },
      });
    }
  }

  // หลักฐานของกิจกรรมที่ผ่านไปแล้ว — ไล่สถานะให้ครบทั้งผ่าน/รอตรวจ/ไม่ผ่าน เพื่อให้เห็นทุกหน้าตาในหน้าการลงทะเบียน
  const EVIDENCE_PHOTO =
    'https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=600&q=70';
  const EVIDENCE_CYCLE = ['approved', 'pending', 'rejected'];
  for (const [i, r] of completed.entries()) {
    const status = EVIDENCE_CYCLE[i % EVIDENCE_CYCLE.length];
    const already = await prisma.evidence.findFirst({ where: { registrationId: r.id } });
    if (already) continue;
    await prisma.evidence.create({
      data: {
        registrationId: r.id,
        fileUrl: EVIDENCE_PHOTO,
        fileName: 'evidence.jpg',
        mimeType: 'image/jpeg',
        status,
        note: status === 'rejected' ? 'ภาพไม่ชัด มองไม่เห็นป้ายกิจกรรม' : '',
        reviewedAt: status === 'pending' ? null : r.hoursApprovedAt,
        createdAt: r.hoursApprovedAt ?? new Date(),
      },
    });
  }

  // การแจ้งเตือนของนิสิตคนแรก — ให้ตัวเลขบนแถบหัวเรื่องมีข้อมูลจริงให้แสดง
  //
  // ค้นด้วยอีเมลตรง ๆ ไม่ใช้ students[0] เพราะรายการนั้นเรียงตามอีเมล
  // ซึ่งได้ student2@ มาก่อน student@ ('2' มาก่อน '@' ในลำดับอักขระ)
  // ข้อมูลตัวอย่างจึงเคยไปตกอยู่กับนิสิตคนที่สองแทนบัญชีเดโมหลัก
  const demoStudent = await prisma.user.findUnique({
    where: { email: STUDENTS[0].email },
    select: { id: true },
  });
  if (demoStudent) {
    const NOTIFICATIONS = [
      { type: 'approval', title: 'การสมัครได้รับการอนุมัติแล้ว', body: 'ผู้จัดอนุมัติการเข้าร่วมกิจกรรมของคุณแล้ว', read: false },
      { type: 'reminder', title: 'อย่าลืมกิจกรรมพรุ่งนี้', body: 'กรุณาเช็กอินที่จุดลงทะเบียนก่อนเริ่มกิจกรรม', read: false },
      { type: 'certificate', title: 'ใบประกาศพร้อมให้ดาวน์โหลด', body: 'ชั่วโมงจิตอาสาของคุณได้รับการรับรองแล้ว', read: true },
    ];
    for (const n of NOTIFICATIONS) {
      const already = await prisma.notification.findFirst({
        where: { userId: demoStudent.id, title: n.title },
      });
      if (!already) await prisma.notification.create({ data: { userId: demoStudent.id, ...n } });
    }

    // นัดหมายส่วนตัวบนปฏิทิน — คละทั้งแบบทั้งวันและระบุเวลา กระจายรอบ ๆ วันนี้
    // ให้หน้าปฏิทินมีของให้ดูทันทีที่เปิด สีอ้างอิงจานสีเดียวกับ EVENT_COLORS ใน route
    //
    // นัดหมายแบบทั้งวันตั้งไว้ตอนเช้า (ไม่ใช่เที่ยงคืน) เพราะการจัดกลุ่มลงช่องวันคิดตามเวลาไทย
    // ถ้าเครื่องที่รัน seed อยู่คนละเขตเวลา เวลาเที่ยงคืนอาจเลื่อนไปโผล่ผิดวัน
    const CALENDAR_EVENTS = [
      {
        title: 'อ่านหนังสือที่หอสมุด',
        note: 'เตรียมสอบกลางภาค — ชั้น 3 โซนเงียบ',
        startAt: at(0, 9),
        endAt: at(0, 12),
        allDay: false,
        color: '#F5A623',
      },
      {
        title: 'ประชุมเตรียมค่ายอาสา',
        note: 'แบ่งหน้าที่และเช็กอุปกรณ์ก่อนลงพื้นที่',
        startAt: at(1, 14),
        endAt: at(1, 16),
        allDay: false,
        color: '#A774F7',
      },
      {
        title: 'ส่งรายงานชั่วโมงจิตอาสา',
        note: 'กำหนดส่งวันสุดท้าย อย่าลืมแนบหลักฐาน',
        startAt: at(3, 9),
        endAt: null,
        allDay: true,
        color: '#E97171',
      },
      {
        title: 'นัดติวเพื่อนก่อนสอบ',
        note: '',
        startAt: at(-2, 17),
        endAt: at(-2, 19),
        allDay: false,
        color: '#7AB8FF',
      },
      {
        title: 'กลับบ้านต่างจังหวัด',
        note: 'ไม่รับกิจกรรมช่วงนี้',
        startAt: at(8, 9),
        endAt: null,
        allDay: true,
        color: '#63D2A1',
      },
    ];
    // CalendarEvent ไม่มีคีย์ที่ไม่ซ้ำให้ upsert — เช็กจากชื่อของเจ้าของเหมือนการแจ้งเตือนด้านบน
    for (const e of CALENDAR_EVENTS) {
      const already = await prisma.calendarEvent.findFirst({
        where: { userId: demoStudent.id, title: e.title },
      });
      if (!already) await prisma.calendarEvent.create({ data: { userId: demoStudent.id, ...e } });
    }

    // ── ห้องแชทกับผู้จัดกิจกรรมที่ลงทะเบียนไว้ ──
    //
    // ห้องแรกจบด้วยข้อความจากผู้จัดที่ยังไม่ได้อ่าน เพื่อให้ป้ายตัวเลขบนเมนูมีของจริงให้แสดง
    // ห้องที่สองอ่านครบแล้ว จะได้เห็นทั้งสองสถานะบนหน้าจอเดียว
    const chatSeeds = await prisma.registration.findMany({
      where: { userId: demoStudent.id },
      orderBy: { createdAt: 'asc' },
      take: 2,
      select: { activity: { select: { id: true, organizerId: true } } },
    });

    const CONVERSATIONS = [
      [
        { fromStaff: false, text: 'สวัสดีครับ อยากสอบถามเรื่องจุดนัดพบของกิจกรรมครับ', at: at(-2, 10) },
        { fromStaff: true, text: 'สวัสดีค่ะ นัดรวมตัวที่ลานหน้าอาคารเรียนรวม เวลา 08.00 น. นะคะ', at: at(-2, 11) },
        { fromStaff: false, text: 'รับทราบครับ ต้องเตรียมอะไรไปเป็นพิเศษไหมครับ', at: at(-2, 11) },
        { fromStaff: true, text: 'เตรียมหมวก ครีมกันแดด และขวดน้ำส่วนตัวมาด้วยนะคะ เดี๋ยวทางเรามีอาหารกลางวันให้ค่ะ', at: at(-1, 9) },
      ],
      [
        { fromStaff: true, text: 'แจ้งเตือนล่วงหน้านะคะ กิจกรรมจะเริ่มลงทะเบียนหน้างานเวลา 07.30 น. ค่ะ', at: at(-4, 15) },
        { fromStaff: false, text: 'ขอบคุณครับ แล้วเจอกันครับ', at: at(-4, 16) },
      ],
    ];

    for (const [i, seed] of chatSeeds.entries()) {
      const script = CONVERSATIONS[i];
      if (!script) break;

      const existing = await prisma.chatThread.findFirst({
        where: {
          activityId: seed.activity.id,
          studentId: demoStudent.id,
          staffId: seed.activity.organizerId,
        },
        select: { id: true },
      });
      if (existing) continue;

      const last = script[script.length - 1];
      const thread = await prisma.chatThread.create({
        data: {
          activityId: seed.activity.id,
          studentId: demoStudent.id,
          staffId: seed.activity.organizerId,
          lastMessageAt: last.at,
        },
        select: { id: true },
      });

      for (const m of script) {
        const fromOther = m.fromStaff;
        await prisma.chatMessage.create({
          data: {
            threadId: thread.id,
            senderId: fromOther ? seed.activity.organizerId : demoStudent.id,
            text: m.text,
            createdAt: m.at,
            // ข้อความของเราถือว่าอีกฝ่ายอ่านแล้ว ส่วนของอีกฝ่ายให้ค้างไว้เฉพาะข้อความสุดท้ายของห้องแรก
            readAt: fromOther && i === 0 && m === last ? null : m.at,
          },
        });
      }
    }
  }

  const [users, activities, registrations, certificates, evidence, calendarEvents] = await Promise.all([
    prisma.user.count(),
    prisma.activity.count(),
    prisma.registration.count(),
    prisma.certificate.count(),
    prisma.evidence.count(),
    prisma.calendarEvent.count(),
  ]);
  console.log(
    `[seed] เสร็จสิ้น — ผู้ใช้ ${users} · กิจกรรม ${activities} · การลงทะเบียน ${registrations} · ใบประกาศ ${certificates} · หลักฐาน ${evidence} · นัดหมาย ${calendarEvents}`,
  );
  console.log(`[seed] บัญชีตัวอย่างทั้งหมดใช้รหัสผ่าน: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
