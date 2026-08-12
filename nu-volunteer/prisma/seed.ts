/**
 * ข้อมูลตัวอย่างสำหรับการพัฒนา — รันด้วย `npm run db:seed`
 *
 * ปลอดภัยต่อการรันซ้ำ (upsert ตามคีย์ที่ไม่ซ้ำ) และจะไม่ทำงานเมื่อ SEED_ENABLED != true
 * ข้อมูลกิจกรรม/หมวดหมู่/คณะ ยกมาจากต้นแบบ (NU Volunteer.dc.html) ให้ตรงกับที่ออกแบบไว้
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../lib/generated/prisma/client';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: url.replace(/^file:/, '') }) });

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
};

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

  for (const a of ACTIVITIES) {
    const past = a.dayOffset < 0;
    const startAt = at(a.dayOffset, a.startHour);
    const endAt = new Date(startAt.getTime() + a.hours * 3600_000);
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
      regOpenAt: at(a.dayOffset - 14, 9),
      regCloseAt: at(a.dayOffset - 1, 23),
      seatsTotal: a.seatsTotal,
      hours: a.hours,
      status: past ? 'done' : 'open',
      photo: a.photo,
      requiresApproval: true,
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

  const [users, activities, registrations] = await Promise.all([
    prisma.user.count(),
    prisma.activity.count(),
    prisma.registration.count(),
  ]);
  console.log(
    `[seed] เสร็จสิ้น — ผู้ใช้ ${users} · กิจกรรม ${activities} · การลงทะเบียน ${registrations}`,
  );
  console.log(`[seed] บัญชีตัวอย่างทั้งหมดใช้รหัสผ่าน: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
