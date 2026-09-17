/**
 * บัญชีนิสิตทดสอบสำหรับสาธิตและทดสอบ — สองแบบ
 *
 *   npx tsx scripts/seed-test-student.ts [--profile full|half]            # dry run — ไม่เขียนฐานข้อมูล
 *   npx tsx scripts/seed-test-student.ts --profile half --commit          # เขียนจริง
 *   npx tsx scripts/seed-test-student.ts --profile half --remove --commit # ลบบัญชีและทุกอย่างที่ผูกอยู่
 *
 * ไม่ระบุ --profile = full รหัสผ่านอ่านจาก TEST_STUDENT_PASSWORD ใน .env (ใช้ร่วมกันทั้งสองบัญชี)
 *
 * full — เข้าร่วมทุกกิจกรรม:
 * - จบแล้ว → อนุมัติ เช็กอิน/เช็กเอาต์ตามเวลากิจกรรม รับรองชั่วโมงเต็ม และออกใบประกาศ
 *   (กิจกรรม 0 ชั่วโมงรับรองได้แต่ไม่มีใบ — ตรงกับ /api/v1/organizer/hours/:id)
 * - ยังไม่จบ → อนุมัติการลงทะเบียนอย่างเดียว เข้าร่วมสิ่งที่ยังไม่เกิดขึ้นไม่ได้
 *
 * half — นิสิตที่เข้าร่วมพอประมาณ: ราวครึ่งหนึ่งของเกณฑ์ชั่วโมง ไม่มา/ไม่อนุมัติไม่มาก:
 * - เลือกราวครึ่งหนึ่งของแต่ละหมวดหมู่ ด้วยค่าแฮชของรหัสกิจกรรม — กิจกรรมใหม่ไม่ทำให้ตัวที่เลือกไว้แล้วสลับ
 * - กิจกรรมที่จบแล้วในปีการศึกษาปัจจุบัน รับรองชั่วโมงเฉพาะพอให้ได้ราวครึ่งหนึ่งของเกณฑ์ชั่วโมง
 *   (เลือกจากชั่วโมงน้อยไปมาก ให้ใกล้เป้าที่สุด)
 * - ที่จบแล้วที่เหลือเป็น "ไม่มาตามนัด" กับ "ไม่อนุมัติ" อย่างละเท่า ๆ กัน รวมไม่เกิน MAX_FAILED
 *   ที่เกินจากนั้นไม่สมัครเลย สัดส่วนการลงทะเบียนรวมจึงต่ำกว่าครึ่ง
 * - กิจกรรมที่ยังไม่จบแบ่ง "อนุมัติแล้ว" กับ "รออนุมัติ" (รออนุมัติเฉพาะที่ยังไม่ปิดรับสมัคร)
 * - กิจกรรมที่ไม่ได้เลือก → ไม่มีใบลงทะเบียน
 *
 * รันซ้ำไม่เปลี่ยนสิ่งที่เกิดขึ้นแล้ว: ใบที่รับรองชั่วโมง ใบประกาศ และใบไม่มา/ไม่อนุมัติคงเดิม
 * ใบอนุมัติ/รออนุมัติของกิจกรรมที่จบหลังรันครั้งก่อนจะได้ผลลัพธ์ (เข้าร่วม ไม่มา หรือไม่อนุมัติ)
 * ชั่วโมงนับเป้าต่อปีการศึกษา — ปีใหม่เติมใหม่ ไม่แตะชั่วโมงของปีก่อน
 *
 * ทั้งสองแบบข้ามกิจกรรมที่ยกเลิก ฉบับร่าง และยังไม่ถึงวันเปิดรับสมัคร
 * ไม่ส่งอีเมล สร้างเฉพาะการแจ้งเตือนในระบบ ลงเวลาย้อนหลังตามวันที่ของกิจกรรม
 * ใบประกาศลงวันที่ออกเป็นเวลาสิ้นสุดกิจกรรม รหัสอ้างอิงจึงได้ปีการศึกษาของกิจกรรมนั้น
 *
 * รันซ้ำได้ — เติมเฉพาะส่วนที่ยังขาด เช่น กิจกรรมใหม่ หรือกิจกรรมที่เพิ่งจบหลังรันครั้งก่อน
 * ข้อมูลบัญชี (ชื่อ รหัสนิสิต คณะ สถานะ กยศ.) ที่ต่างจาก PROFILES จะถูกแก้ให้ตรง — ไม่แตะรหัสผ่าน
 */
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { academicYearOf, DEFAULT_HOURS_GOAL, HOURS_GOAL_KEY } from '@/lib/academic';
import { NOT_DELETED } from '@/lib/activities';
import { newRef } from '@/lib/certificates';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/tokens';

type ProfileKey = 'full' | 'half';

const PROFILES: Record<ProfileKey, { email: string; name: string; studentId: string; faculty: string; loanStatus: string }> = {
  full: {
    email: 'test.student@nu.ac.th',
    name: 'นิสิตทดสอบ ระบบ',
    studentId: '00000001',
    faculty: 'คณะวิทยาศาสตร์',
    loanStatus: 'yes',
  },
  half: {
    email: 'test.student2@nu.ac.th',
    name: 'นิสิตทดสอบ ครึ่งทาง',
    studentId: '00000002',
    faculty: 'คณะวิศวกรรมศาสตร์',
    loanStatus: 'no',
  },
};

/** สถานะเป้าหมายของใบลงทะเบียนในแต่ละกิจกรรม — none คือไม่มีใบ */
type Target = 'skip' | 'none' | 'full' | 'approved' | 'pending' | 'no-show' | 'rejected';

const args = process.argv.slice(2);
const commit = args.includes('--commit');
const remove = args.includes('--remove');
const profileArg = args[args.indexOf('--profile') + 1];
const profile: ProfileKey = args.includes('--profile') ? (profileArg as ProfileKey) : 'full';
if (!(profile in PROFILES)) throw new Error(`--profile ต้องเป็น full หรือ half (ได้ "${profileArg}")`);
const ACCOUNT = PROFILES[profile];

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** การแจ้งเตือนที่เก่ากว่านี้ถือว่าอ่านแล้ว — ไม่งั้นกระดิ่งขึ้นเลขร้อยกว่าตั้งแต่เข้าระบบครั้งแรก */
const READ_AFTER_MS = 7 * DAY;
/** เหตุผลบนใบที่ไม่อนุมัติ — ข้อความกลาง ๆ ที่ผู้จัดใช้จริงได้ */
const REJECT_REASON = 'จำนวนผู้สมัครเกินกว่าที่ผู้จัดรับได้ ขอบคุณที่สนใจเข้าร่วม';
/** ใบที่ถือว่าได้ที่นั่งหรือผ่านขั้นอนุมัติแล้ว — ใช้นับที่นั่งเต็ม */
const SEAT_TAKEN = ['pending', 'approved', 'checked-in', 'checked-out', 'completed'];
/**
 * profile half: ใบ "ไม่มาตามนัด" กับ "ไม่อนุมัติ" รวมกันไม่เกินนี้ — ที่เกินไม่สมัครเลย
 * ให้ดูเป็นนิสิตที่เข้าร่วมพอประมาณ ไม่ใช่คนที่สมัครแล้วไม่มาเกือบทุกครั้ง
 */
const MAX_FAILED = 8;

const round1 = (n: number) => Math.round(n * 10) / 10;
const minDate = (...ds: Date[]) => new Date(Math.min(...ds.map((d) => d.getTime())));
/** ลำดับที่คงที่ต่อกิจกรรม — ค่าแฮชไม่เปลี่ยนเมื่อมีกิจกรรมอื่นเพิ่มหรือหายไป */
const rank = (id: string) => createHash('sha256').update(`nuv-test-half:${id}`).digest('hex');

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

const LABEL: Record<Target, string> = {
  skip: 'ข้าม',
  none: 'ไม่สมัคร',
  full: 'เข้าร่วม',
  approved: 'อนุมัติ',
  pending: 'รออนุมัติ',
  'no-show': 'ไม่มา',
  rejected: 'ไม่อนุมัติ',
};

async function removeAccount() {
  const user = await prisma.user.findUnique({
    where: { email: ACCOUNT.email },
    select: { id: true, _count: { select: { registrations: true, certificates: true, notifications: true } } },
  });
  if (!user) return console.log(`ไม่มีบัญชี ${ACCOUNT.email} — ไม่มีอะไรให้ลบ`);
  console.log(
    `จะลบ ${ACCOUNT.email}: ใบลงทะเบียน ${user._count.registrations}, ใบประกาศ ${user._count.certificates}, การแจ้งเตือน ${user._count.notifications}`,
  );
  if (!commit) return console.log('DRY RUN — เพิ่ม --commit เพื่อลบจริง');
  // ใบประกาศผูกกับใบลงทะเบียนแบบไม่ cascade — ลบก่อนให้ชัดเจน ที่เหลือหายไปพร้อมบัญชี
  await prisma.certificate.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
  console.log('ลบแล้ว');
}

type Activity = Awaited<ReturnType<typeof loadActivities>>[number];

function loadActivities(userId: string) {
  return prisma.activity.findMany({
    where: NOT_DELETED,
    orderBy: { startAt: 'asc' },
    select: {
      id: true,
      title: true,
      status: true,
      categoryId: true,
      startAt: true,
      endAt: true,
      regOpenAt: true,
      regCloseAt: true,
      hours: true,
      seatsTotal: true,
      _count: { select: { registrations: { where: { status: { in: SEAT_TAKEN } } } } },
      // ยังไม่มีบัญชี = ยังไม่มีใบลงทะเบียน — id ว่างไม่ตรงกับใครเลย
      registrations: {
        where: { userId },
        select: { id: true, status: true, certificate: { select: { id: true } } },
      },
    },
  });
}

/** กิจกรรมที่นิสิตมีสิทธิ์สมัครได้จริง — ไม่ยกเลิก ไม่ใช่ฉบับร่าง และถึงวันเปิดรับสมัครแล้ว */
function eligible(a: Activity, now: Date) {
  const ended = a.endAt < now;
  const notOpenYet = !ended && a.regOpenAt != null && a.regOpenAt > now;
  return !(a.status === 'cancelled' || a.status === 'draft' || notOpenYet);
}

function planFull(activities: Activity[], now: Date): Map<string, Target> {
  return new Map(
    activities.map((a) => [a.id, !eligible(a, now) ? 'skip' : a.endAt < now ? 'full' : 'approved']),
  );
}

async function planHalf(activities: Activity[], now: Date): Promise<Map<string, Target>> {
  const plan = new Map<string, Target>(activities.map((a) => [a.id, eligible(a, now) ? 'none' : 'skip']));
  const pool = activities.filter((a) => plan.get(a.id) === 'none');
  const statusOf = (a: Activity) => a.registrations[0]?.status;
  // ใบที่มีอยู่แล้วคือตัวที่เคยเลือกไว้ — เรียงไว้หน้าสุดเสมอ รันซ้ำจะได้ไม่หลุดจากการเลือก
  const byKeepThenRank = (x: Activity, y: Activity) =>
    Number(!statusOf(x)) - Number(!statusOf(y)) || rank(x.id).localeCompare(rank(y.id));

  // ราวครึ่งหนึ่งของแต่ละหมวดหมู่ — หมวดที่มีจำนวนคี่ปัดขึ้นสลับกับปัดลง ให้รวมแล้วใกล้ครึ่งที่สุด
  const byCategory = new Map<string, Activity[]>();
  for (const a of pool) byCategory.set(a.categoryId, [...(byCategory.get(a.categoryId) ?? []), a]);
  let roundUp = true;
  const picked: Activity[] = [];
  for (const [, list] of [...byCategory.entries()].sort(([x], [y]) => x.localeCompare(y))) {
    const sorted = [...list].sort(byKeepThenRank);
    let take = list.length / 2;
    if (!Number.isInteger(take)) {
      take = roundUp ? Math.ceil(take) : Math.floor(take);
      roundUp = !roundUp;
    }
    take = Math.max(take, sorted.filter(statusOf).length);
    picked.push(...sorted.slice(0, take));
  }

  const goalSetting = await prisma.setting.findUnique({ where: { key: HOURS_GOAL_KEY } });
  const goal = Number(goalSetting?.value) || DEFAULT_HOURS_GOAL;
  const hoursTarget = goal / 2;
  const ay = academicYearOf(now);
  const ended = picked.filter((a) => a.endAt < now);

  // ผลที่เกิดขึ้นแล้วคงไว้ตามเดิม — ชั่วโมง ใบประกาศ และประวัติไม่มา/ไม่อนุมัติไม่เปลี่ยนย้อนหลัง
  // ชั่วโมงนับต่อปีการศึกษา ปีใหม่จึงเริ่มเติมจากศูนย์โดยไม่แตะชั่วโมงของปีก่อน
  let earned = 0;
  let failed = 0;
  const failedCount: Record<'no-show' | 'rejected', number> = { 'no-show': 0, rejected: 0 };
  for (const a of ended) {
    const s = statusOf(a);
    if (s === 'completed') {
      plan.set(a.id, 'full');
      if (a.endAt >= ay.start) earned += a.hours;
    } else if (s === 'no-show' || s === 'rejected') {
      plan.set(a.id, s);
      failedCount[s]++;
      failed++;
    }
  }

  // เติมชั่วโมงจากกิจกรรมในปีการศึกษานี้ เริ่มจากชั่วโมงน้อย รับเฉพาะตัวที่ทำให้ใกล้ครึ่งเกณฑ์ขึ้น
  // (เกินเป้าเล็กน้อยได้ ถ้าใกล้กว่าหยุดไว้ต่ำกว่าเป้า)
  const candidates = ended
    .filter((a) => plan.get(a.id) === 'none' && a.endAt >= ay.start)
    .sort((x, y) => x.hours - y.hours || rank(x.id).localeCompare(rank(y.id)));
  for (const a of candidates) {
    if (Math.abs(earned + a.hours - hoursTarget) >= Math.abs(earned - hoursTarget)) continue;
    plan.set(a.id, 'full');
    earned += a.hours;
  }

  // ที่เหลือของที่จบแล้ว: ไม่มา/ไม่อนุมัติไม่เกิน MAX_FAILED ใบ ตัวที่เกินไม่สมัครเลย
  // ยกเว้นใบที่มีอยู่แล้ว (อนุมัติหรือรออนุมัติไว้ก่อนกิจกรรมจบ) ซึ่งต้องมีผลลัพธ์เสมอ
  for (const a of ended.filter((x) => plan.get(x.id) === 'none').sort(byKeepThenRank)) {
    const prev = statusOf(a);
    if (failed >= MAX_FAILED && !prev) continue;
    // ใบที่อนุมัติไปแล้วถูกไม่อนุมัติย้อนหลังไม่ได้ ใบที่ยังรออนุมัติก็ "ไม่มา" ไม่ได้
    const s =
      prev === 'approved' ? 'no-show'
      : prev === 'pending' ? 'rejected'
      : failedCount['no-show'] <= failedCount.rejected ? 'no-show' : 'rejected';
    plan.set(a.id, s);
    failedCount[s]++;
    failed++;
  }

  // ที่ยังไม่จบ: ใบเดิมคงสถานะ ใบใหม่แบ่งอนุมัติกับรออนุมัติเท่า ๆ กัน (รออนุมัติเฉพาะที่ยังไม่ปิดรับสมัคร)
  const futureCount = { approved: 0, pending: 0 };
  const future = picked.filter((x) => x.endAt >= now).sort((x, y) => x.startAt.getTime() - y.startAt.getTime());
  for (const a of future) {
    const s = statusOf(a);
    if (s === 'approved' || s === 'pending') {
      plan.set(a.id, s);
      futureCount[s]++;
    }
  }
  for (const a of future.filter((x) => plan.get(x.id) === 'none')) {
    const closed = a.regCloseAt != null && a.regCloseAt <= now;
    const s = !closed && futureCount.pending < futureCount.approved ? 'pending' : 'approved';
    plan.set(a.id, s);
    futureCount[s]++;
  }

  console.log(
    `เลือกตามหมวดหมู่ ${picked.length} จาก ${pool.length} กิจกรรมที่สมัครได้ · ไม่มา/ไม่อนุมัติไม่เกิน ${MAX_FAILED} ใบ · เป้าชั่วโมงปีการศึกษา ${ay.year}: ${hoursTarget} จากเกณฑ์ ${goal} → ได้ ${round1(earned)} ชม.\n`,
  );
  return plan;
}

/** ใบเดิมอยู่ที่สถานะเป้าหมายแล้ว — ไม่ต้องแตะ */
function reached(current: Activity['registrations'][number] | undefined, target: Target, certificate: boolean) {
  if (!current) return target === 'none';
  if (target === 'full') return current.status === 'completed' && (!certificate || current.certificate != null);
  return current.status === target;
}

async function main() {
  if (remove) return removeAccount();

  const now = new Date();
  const existing = await prisma.user.findUnique({
    where: { email: ACCOUNT.email },
    select: { id: true, role: true, name: true, studentId: true, faculty: true, loanStatus: true },
  });
  if (existing && existing.role !== 'student') throw new Error(`${ACCOUNT.email} มีอยู่แล้วแต่ไม่ใช่บัญชีนิสิต — หยุด`);

  const idTaken = await prisma.user.findFirst({
    where: { studentId: ACCOUNT.studentId, NOT: { email: ACCOUNT.email } },
    select: { email: true },
  });
  if (idTaken) throw new Error(`รหัสนิสิต ${ACCOUNT.studentId} ถูกใช้โดย ${idTaken.email} แล้ว — หยุด`);

  const password = process.env.TEST_STUDENT_PASSWORD ?? '';
  if (commit && !existing && password.length < 8) {
    throw new Error('ตั้ง TEST_STUDENT_PASSWORD (อย่างน้อย 8 ตัว) ก่อนสร้างบัญชี');
  }

  console.log(`ฐานข้อมูล: ${process.env.DATABASE_URL?.replace(/\/\/([^.]{0,6})[^/]*/, '//$1…')}`);
  console.log(`โหมด: ${commit ? 'COMMIT' : 'DRY RUN (ไม่เขียนฐานข้อมูล)'} · profile ${profile}`);
  console.log(
    `บัญชี: ${ACCOUNT.name} · ${ACCOUNT.email} · รหัส ${ACCOUNT.studentId} · ${ACCOUNT.faculty} · กยศ. ${ACCOUNT.loanStatus} — ${existing ? 'มีอยู่แล้ว (ไม่แตะรหัสผ่าน)' : 'จะสร้างใหม่'}`,
  );

  // ข้อมูลบัญชีที่ไม่ตรงกับ PROFILES — แก้ตรงนี้ที่เดียว ย้อนกลับได้ด้วยการแก้ค่าใน PROFILES แล้วรันใหม่
  const accountChanges = existing
    ? (['name', 'studentId', 'faculty', 'loanStatus'] as const).filter((k) => existing[k] !== ACCOUNT[k])
    : [];
  for (const k of accountChanges) console.log(`  แก้บัญชี ${k}: ${existing![k] ?? '—'} → ${ACCOUNT[k]}`);
  if (existing && !accountChanges.length) console.log('  ข้อมูลบัญชีตรงกับ PROFILES แล้ว');
  if (commit && existing && accountChanges.length) {
    await prisma.user.update({
      where: { id: existing.id },
      data: Object.fromEntries(accountChanges.map((k) => [k, ACCOUNT[k]])),
    });
  }

  const activities = await loadActivities(existing?.id ?? '');
  const plan = profile === 'full' ? planFull(activities, now) : await planHalf(activities, now);
  if (profile === 'full') console.log('');

  let userId = existing?.id ?? '';
  if (commit && !existing) {
    const user = await prisma.user.create({
      data: {
        ...ACCOUNT,
        role: 'student',
        passwordHash: await hashPassword(password),
        seeded: true,
      },
      select: { id: true },
    });
    userId = user.id;
  }

  const tally: Record<Target | 'unchanged', number> = {
    skip: 0, none: 0, full: 0, approved: 0, pending: 0, 'no-show': 0, rejected: 0, unchanged: 0,
  };
  let certs = 0;
  let hours = 0;
  let notificationCount = 0;

  for (const a of activities) {
    const target = plan.get(a.id)!;
    const current = a.registrations[0];
    const certificate = target === 'full' && a.hours > 0;

    if (target === 'skip' || target === 'none') {
      tally[target]++;
      if (target === 'skip') console.log(`  ${LABEL.skip.padEnd(9)} [${a.status}] ${a.title}`);
      if (current) console.log(`            ⚠ มีใบลงทะเบียน ${current.status} อยู่แล้ว — ไม่แตะ`);
      continue;
    }
    if (reached(current, target, certificate)) {
      tally.unchanged++;
      console.log(`  ${'มีแล้ว'.padEnd(9)} [${a.status}] ${a.title}`);
      continue;
    }

    // ลงทะเบียนตอนเปิดรับสมัคร ถ้าไม่ระบุวันเปิดให้ถือว่าสมัครไว้หนึ่งสัปดาห์ก่อนวันงาน
    // ต้องไม่เลยวันปิดรับสมัคร วันเริ่มกิจกรรม หรือเวลาปัจจุบัน
    const regAt = minDate(
      a.regOpenAt ?? new Date(a.startAt.getTime() - 7 * DAY),
      a.regCloseAt ?? a.startAt,
      a.startAt,
      now,
    );
    const decidedAt = minDate(new Date(regAt.getTime() + HOUR), a.regCloseAt ?? a.startAt, a.startAt, now);
    const hoursComputed = round1(Math.min(Math.max((a.endAt.getTime() - a.startAt.getTime()) / HOUR, 0), a.hours));

    tally[target]++;
    if (certificate) certs++;
    if (target === 'full') hours += a.hours;

    const label = target === 'full' ? (certificate ? 'เต็ม+ใบ' : 'เต็ม ไม่มีใบ') : LABEL[target];
    const detail: Record<Exclude<Target, 'skip' | 'none'>, string> = {
      full: ` · อนุมัติ ${fmt(decidedAt)} · เช็กอิน ${fmt(a.startAt)} · เช็กเอาต์ ${fmt(a.endAt)} · รับรอง ${a.hours} ชม.${certificate ? ` · ใบลงวันที่ ${fmt(a.endAt)}` : ''}`,
      approved: ` · อนุมัติ ${fmt(decidedAt)}`,
      pending: '',
      'no-show': ` · อนุมัติ ${fmt(decidedAt)} · ไม่เช็กอิน`,
      rejected: ` · ไม่อนุมัติ ${fmt(decidedAt)}`,
    };
    console.log(`  ${label.padEnd(9)} [${a.status}] ${a.title} (${a.hours} ชม.)`);
    console.log(`            สมัคร ${fmt(regAt)}${detail[target]}`);
    if (current) console.log(`            ↻ ใบเดิม ${current.status} → ${target}`);
    if (a.seatsTotal > 0 && !current && target !== 'rejected' && a._count.registrations >= a.seatsTotal) {
      console.log('            ⚠ ที่นั่งเต็มแล้ว — จะเกินจำนวนที่นั่ง');
    }

    const notifications: { type: string; title: string; body: string; link: string; createdAt: Date }[] = [];
    if (target === 'rejected') {
      notifications.push({
        type: 'approval',
        title: `ไม่อนุมัติการลงทะเบียน: ${a.title}`,
        body: REJECT_REASON,
        link: `/activities/${a.id}`,
        createdAt: decidedAt,
      });
    } else if (target !== 'pending' && current?.status !== 'approved') {
      // ใบที่อนุมัติไว้แล้วได้แจ้งเตือนอนุมัติไปตั้งแต่รันก่อน — ไม่ส่งซ้ำ
      notifications.push({
        type: 'approval',
        title: `อนุมัติการลงทะเบียนแล้ว: ${a.title}`,
        body: 'ผู้จัดกิจกรรมอนุมัติการลงทะเบียนของคุณแล้ว อย่าลืมเช็กอินในวันงาน',
        link: `/activities/${a.id}`,
        createdAt: decidedAt,
      });
    }
    notificationCount += notifications.length + (target === 'full' ? 1 : 0);

    if (!commit) continue;

    const cleared = {
      approvedAt: null, rejectedAt: null, rejectReason: null, checkedInAt: null, checkedOutAt: null,
      hoursComputed: 0, hoursAwarded: 0, hoursApprovedAt: null,
    };
    const data = {
      ...cleared,
      regAt,
      ...(target === 'full'
        ? {
            status: 'completed',
            approvedAt: decidedAt,
            checkedInAt: a.startAt,
            checkedOutAt: a.endAt,
            hoursComputed,
            hoursAwarded: a.hours,
            hoursApprovedAt: a.endAt,
          }
        : target === 'rejected'
          ? { status: 'rejected', rejectedAt: decidedAt, rejectReason: REJECT_REASON }
          : target === 'pending'
            ? { status: 'pending' }
            : { status: target, approvedAt: decidedAt }),
    };

    const registration = await prisma.registration.upsert({
      where: { userId_activityId: { userId, activityId: a.id } },
      create: { userId, activityId: a.id, ...data },
      update: data,
      select: { id: true },
    });

    if (target === 'full') {
      if (certificate) {
        // ชนรหัสสุ่มได้ยากมาก แต่ถ้าชน unique constraint จะปฏิเสธ — สุ่มใหม่ เหมือน issueCertificate
        let ref = '';
        for (let attempt = 0; ; attempt++) {
          try {
            ref = newRef(a.endAt);
            await prisma.certificate.create({
              data: { ref, userId, activityId: a.id, registrationId: registration.id, hours: a.hours, issuedAt: a.endAt },
            });
            break;
          } catch (e) {
            if (attempt >= 4) throw e;
          }
        }
        notifications.push({
          type: 'certificate',
          title: `รับรองชั่วโมงแล้ว: ${a.title}`,
          body: `คุณได้รับ ${a.hours} ชั่วโมงจิตอาสา และใบประกาศพร้อมดาวน์โหลดแล้ว (รหัสอ้างอิง ${ref})`,
          link: '/student/certificates',
          createdAt: a.endAt,
        });
      } else {
        notifications.push({
          type: 'approval',
          title: `รับรองชั่วโมงแล้ว: ${a.title}`,
          body: 'กิจกรรมนี้รับรองให้ 0 ชั่วโมง จึงไม่มีใบประกาศ',
          link: '/student/hours',
          createdAt: a.endAt,
        });
      }
    }

    if (notifications.length) {
      await prisma.notification.createMany({
        data: notifications.map((n) => ({
          ...n,
          userId,
          read: now.getTime() - n.createdAt.getTime() > READ_AFTER_MS,
        })),
      });
    }
  }

  const eligibleCount = activities.length - tally.skip;
  const registered = eligibleCount - tally.none;
  console.log(
    `\nรวม ${activities.length} กิจกรรม · สมัครได้ ${eligibleCount} · มีใบลงทะเบียน ${registered} (${Math.round((registered / Math.max(eligibleCount, 1)) * 100)}%) · ข้าม ${tally.skip}`,
  );
  console.log(
    `  เข้าร่วมครบ ${tally.full} · อนุมัติ ${tally.approved} · รออนุมัติ ${tally.pending} · ไม่มาตามนัด ${tally['no-show']} · ไม่อนุมัติ ${tally.rejected} · มีอยู่แล้ว ${tally.unchanged}`,
  );
  console.log(
    `${commit ? '' : '(จะ) '}ออกใบประกาศ ${certs} ใบ · รับรอง ${round1(hours)} ชม. · การแจ้งเตือน ${notificationCount} รายการ (เก่ากว่า 7 วันตั้งเป็นอ่านแล้ว) · ไม่ส่งอีเมล`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
