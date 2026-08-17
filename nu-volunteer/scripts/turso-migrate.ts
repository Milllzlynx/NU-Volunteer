/**
 * ใช้ migration ชุดใน prisma/migrations/ กับฐานข้อมูล Turso ผ่าน HTTP
 *
 * มีสคริปต์นี้เพราะ `prisma migrate deploy` ชี้ไปที่ `libsql://` ไม่ได้ — Prisma 7.9
 * รับแค่ `datasource.url` ใน prisma.config.ts ยังไม่มี driver adapter ให้คำสั่ง migrate
 * ตัว engine ของ sqlite จึงเข้าใจเฉพาะ URL แบบ `file:`
 *
 * สคริปต์อ่านไฟล์ migration.sql ตามลำดับชื่อโฟลเดอร์ (ซึ่งขึ้นต้นด้วย timestamp อยู่แล้ว)
 * ข้ามอันที่ลงไปแล้ว และบันทึกลง _prisma_migrations ให้ประวัติบน Turso ตรงกับในโปรเจกต์
 *
 *   DATABASE_URL="libsql://…" DATABASE_AUTH_TOKEN="…" npm run db:migrate:turso
 *
 * รันซ้ำได้ปลอดภัย และทดสอบกับไฟล์ในเครื่องได้ด้วย DATABASE_URL="file:./ทดสอบ.db"
 */
import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@libsql/client';

const MIGRATIONS_DIR = path.join(process.cwd(), 'prisma', 'migrations');

/** ตารางประวัติของ Prisma — สร้างเองเพราะไม่ได้ผ่าน migrate engine */
const CREATE_HISTORY = `
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  "id"                    TEXT PRIMARY KEY NOT NULL,
  "checksum"              TEXT NOT NULL,
  "finished_at"           DATETIME,
  "migration_name"        TEXT NOT NULL,
  "logs"                  TEXT,
  "rolled_back_at"        DATETIME,
  "started_at"            DATETIME NOT NULL DEFAULT current_timestamp,
  "applied_steps_count"   INTEGER UNSIGNED NOT NULL DEFAULT 0
);`;

function migrationDirs(): string[] {
  return fs
    .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(MIGRATIONS_DIR, e.name, 'migration.sql')))
    .map((e) => e.name)
    .sort();
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  const remote = url.startsWith('libsql://') || url.startsWith('http://') || url.startsWith('https://');
  if (remote && !authToken) throw new Error('DATABASE_AUTH_TOKEN is not set (required for libsql:// URLs)');

  /*
    บอกให้ชัดว่ากำลังลงกับฐานข้อมูลไหน — ชื่อคำสั่งมีคำว่า turso อยู่ แต่ถ้า .env
    ยังชี้ไฟล์ในเครื่องอยู่ มันจะลงกับ dev.db เงียบ ๆ แล้วขึ้นว่าสำเร็จ
    ซึ่งอ่านแล้วเข้าใจว่าฐานข้อมูลบนคลาวด์พร้อมแล้วทั้งที่ยังไม่ได้แตะเลย
  */
  if (remote) {
    console.log(`เป้าหมาย: ${new URL(url).host} (Turso)\n`);
  } else {
    console.log(`เป้าหมาย: ไฟล์ในเครื่อง ${url}`);
    console.log('หมายเหตุ: ยังไม่ได้ชี้ไป Turso — ตั้ง DATABASE_URL เป็น libsql://… ถ้าตั้งใจลงบนคลาวด์\n');
  }

  const client = createClient(remote ? { url, authToken } : { url });
  await client.executeMultiple(CREATE_HISTORY);

  const done = new Set(
    (await client.execute('SELECT migration_name FROM _prisma_migrations WHERE rolled_back_at IS NULL')).rows.map(
      (r) => String(r.migration_name),
    ),
  );

  let applied = 0;
  for (const name of migrationDirs()) {
    if (done.has(name)) {
      console.log(`ข้าม  ${name} (ลงไปแล้ว)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, name, 'migration.sql'), 'utf8');
    const startedAt = new Date().toISOString();
    await client.executeMultiple(sql);

    // checksum เป็น sha256 ของไฟล์ เหมือนที่ Prisma คิด — ไว้ให้ migrate ตรวจว่าไฟล์ไม่ถูกแก้ทีหลัง
    await client.execute({
      sql: `INSERT INTO _prisma_migrations
              (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
            VALUES (?, ?, ?, ?, NULL, NULL, ?, 1)`,
      args: [
        crypto.randomUUID(),
        crypto.createHash('sha256').update(sql).digest('hex'),
        new Date().toISOString(),
        name,
        startedAt,
      ],
    });

    console.log(`ลง    ${name}`);
    applied += 1;
  }

  const tables = await client.execute(
    "SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
  );
  console.log(`\nเสร็จ — ลงใหม่ ${applied} รายการ · ตารางทั้งหมด ${tables.rows[0].n}`);
  client.close();
}

main().catch((e: unknown) => {
  console.error('ล้มเหลว:', (e as Error).message);
  process.exitCode = 1;
});
