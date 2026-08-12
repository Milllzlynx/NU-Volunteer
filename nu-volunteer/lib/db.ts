import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@/lib/generated/prisma/client';

// Prisma 7 ต้องส่ง driver adapter ให้ client — connection URL อ่านจาก env ที่นี่
// production (Postgres): เปลี่ยน provider ใน schema.prisma แล้วสลับมาใช้ @prisma/adapter-pg
function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const adapter = new PrismaBetterSqlite3({ url: url.replace(/^file:/, '') });
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
