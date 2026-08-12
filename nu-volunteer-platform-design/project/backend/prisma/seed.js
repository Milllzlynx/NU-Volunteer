/* Seed บัญชีทดสอบ — staging/dev เท่านั้น
 * รัน: npm run seed      (ต้องมี SEED_ENABLED=true และ NODE_ENV != production)
 */
import 'dotenv/config';
import { prisma } from '../src/lib/db.js';
import { hashPassword } from '../src/lib/tokens.js';

if (process.env.NODE_ENV === 'production' || String(process.env.SEED_ENABLED) !== 'true') {
  console.error('ปฏิเสธการ seed: production หรือ SEED_ENABLED != true');
  process.exit(1);
}

const PASSWORD = 'Test1234!';   // ผ่านเกณฑ์ ≥8 ตัว + มีตัวอักษรและตัวเลข

const users = [
  { email: 'student@nu.ac.th',   role: 'student',   name: 'นิสิตทดสอบ',   studentId: '64361234', faculty: 'คณะวิศวกรรมศาสตร์', loanStatus: 'no' },
  { email: 'piyada.s@nu.ac.th',  role: 'student',   name: 'ปิยะดา ส.',    studentId: '64362001', faculty: 'คณะพยาบาลศาสตร์',   loanStatus: 'yes' },
  { email: 'organizer@nu.ac.th', role: 'organizer', name: 'ผู้จัดกิจกรรม NU' },
  { email: 'admin@nu.ac.th',     role: 'admin',     name: 'ผู้ดูแลระบบ' },
];

for (const u of users) {
  const passwordHash = await hashPassword(PASSWORD);
  await prisma.user.upsert({
    where: { email: u.email },
    update: { passwordHash, role: u.role, name: u.name, seeded: true },
    create: { ...u, passwordHash, seeded: true },
  });
  console.log('seeded', u.email, '(' + u.role + ')');
}

console.log('\nบัญชีทดสอบทั้งหมดใช้รหัสผ่าน:', PASSWORD);
console.log('ปิดการเข้าถึงบัญชีเหล่านี้หลังทดสอบเสร็จ (prisma user.update active=false)');
await prisma.$disconnect();
