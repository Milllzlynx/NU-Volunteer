import { createRequire } from 'node:module';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient } from '@/lib/generated/prisma/client';

/**
 * better-sqlite3 เป็น native module (.node) ที่ใช้เฉพาะตอนฐานข้อมูลเป็นไฟล์บนดิสก์
 *
 * โหลดแบบ lazy ไม่ใช่ import ไว้บนหัวไฟล์ เพราะตอน deploy บน serverless ที่ใช้ Turso
 * โค้ดเส้นนี้ไม่ถูกเรียกเลย แต่ถ้า import ไว้ข้างบน ตัว bundler จะลาก binary ตามไปด้วย
 * แล้วไปพังตอน runtime บนแพลตฟอร์มที่ไม่มี binary ของสถาปัตยกรรมนั้น
 */
const requireNode = createRequire(import.meta.url);

// รอถึง 5 วินาทีเมื่อไฟล์ถูกล็อกอยู่ แทนที่จะโยน SQLITE_BUSY ทันที
// (เท่ากับค่า default ของ better-sqlite3 — เขียนไว้ให้เห็นชัดว่าตั้งใจใช้ค่านี้)
const BUSY_TIMEOUT_MS = 5000;

/**
 * แปลง DATABASE_URL (`file:./dev.db`) เป็น path ที่ better-sqlite3 เปิดได้ (`./dev.db`)
 * คืน null เมื่อเป็นฐานข้อมูลในหน่วยความจำ ซึ่งไม่ต้องตั้ง WAL
 */
function dbFilePath(url: string): string | null {
  if (url === ':memory:' || url.startsWith('file::memory:')) return null;
  const withoutScheme = url.startsWith('file:') ? url.slice('file:'.length) : url;
  const path = withoutScheme.split('?')[0]; // ตัด query param แบบ ?connection_limit=1 ทิ้ง
  return path || null;
}

/**
 * เปิดโหมด WAL ให้ไฟล์ฐานข้อมูล
 *
 * WAL ทำให้ "อ่าน" กับ "เขียน" ไม่บล็อกกัน — คนกำลังเปิดดูรายการกิจกรรมอยู่ ไม่ต้องรอ
 * คนที่กดลงทะเบียนพร้อมกัน ซึ่งเป็นรูปแบบการใช้งานหลักของระบบนี้
 *
 * journal_mode เป็นค่าที่ SQLite เก็บถาวรไว้ใน header ของไฟล์ ตั้งครั้งเดียวติดตลอด
 * ทุก connection หลังจากนั้น แต่สั่งซ้ำได้ไม่มีผลเสีย จึงสั่งทุกครั้งที่สร้าง client
 * เผื่อกรณีไฟล์ถูกสร้างใหม่ (เครื่องใหม่ / ลบไฟล์แล้ว migrate ใหม่)
 */
function enableWal(url: string) {
  const path = dbFilePath(url);
  if (!path) return;
  try {
    const Database = requireNode('better-sqlite3') as typeof import('better-sqlite3');
    const db = new Database(path, { timeout: BUSY_TIMEOUT_MS });
    db.pragma('journal_mode = WAL');
    db.close();
  } catch (e) {
    // ตั้ง WAL ไม่สำเร็จไม่ควรทำให้แอปทั้งตัวเปิดไม่ขึ้น — ทำงานต่อด้วย journal mode เดิมได้
    console.warn('[db] เปิดโหมด WAL ไม่สำเร็จ:', (e as Error).message);
  }
}

/**
 * Prisma 7 ต้องส่ง driver adapter ให้ client — เลือก adapter จากรูปแบบของ DATABASE_URL
 *
 * `file:./dev.db`  → better-sqlite3 อ่านไฟล์บนดิสก์โดยตรง ใช้ตอน dev และบนเครื่องที่มีดิสก์ถาวร
 * `libsql://…`     → Turso ผ่าน HTTP ใช้ตอน deploy บน serverless ที่ไม่มีดิสก์ให้เขียน
 *
 * สคีมายังเป็น sqlite ตัวเดียวกันทั้งสองทาง (Turso คือ libSQL ซึ่งเป็น SQLite)
 * จึงไม่ต้องแยก migration หรือแก้ provider เวลาย้ายขึ้นโฮสต์
 */
function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');

  if (url.startsWith('libsql://') || url.startsWith('http://') || url.startsWith('https://')) {
    const authToken = process.env.DATABASE_AUTH_TOKEN;
    // Turso ปฏิเสธทุก request ที่ไม่มี token — ถ้าลืมตั้ง ต้องรู้ตั้งแต่ตอนสตาร์ต
    // ไม่ใช่ไปเจอเป็น error ตอนมีคนเปิดหน้าแรก
    if (!authToken) throw new Error('DATABASE_AUTH_TOKEN is not set (required for libsql:// URLs)');
    return new PrismaClient({ adapter: new PrismaLibSql({ url, authToken }) });
  }

  enableWal(url);
  const { PrismaBetterSqlite3 } = requireNode(
    '@prisma/adapter-better-sqlite3',
  ) as typeof import('@prisma/adapter-better-sqlite3');
  const adapter = new PrismaBetterSqlite3({ url, timeout: BUSY_TIMEOUT_MS });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { __nuvPrisma?: PrismaClient };

export const prisma = globalForPrisma.__nuvPrisma ?? createClient();

// dev: hot reload สร้าง client ใหม่ทุกครั้ง — เก็บไว้บน global กัน connection รั่ว
if (process.env.NODE_ENV !== 'production') globalForPrisma.__nuvPrisma = prisma;

export type AuthLogContext = {
  email?: string;
  ip?: string;
  userAgent?: string;
  detail?: string;
};

export async function authLog(event: string, ctx: AuthLogContext = {}) {
  try {
    await prisma.authLog.create({
      data: {
        event,
        email: ctx.email ?? '',
        ip: ctx.ip ?? '',
        userAgent: ctx.userAgent ?? '',
        detail: ctx.detail ?? '',
      },
    });
  } catch (e) {
    console.error('[authLog]', (e as Error).message);
  }
}

export async function systemLog(
  level: 'info' | 'success' | 'warning' | 'error',
  text: string,
  opts: { actorId?: string | null; meta?: unknown } = {},
) {
  try {
    await prisma.systemLog.create({
      data: {
        level,
        text,
        actorId: opts.actorId ?? null,
        meta: JSON.stringify(opts.meta ?? {}),
      },
    });
  } catch (e) {
    console.error('[systemLog]', (e as Error).message);
  }
}
