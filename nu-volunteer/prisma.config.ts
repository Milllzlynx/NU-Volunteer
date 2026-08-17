import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// SQLite ใช้ URL เดียวกันทั้ง migrate/db push และ runtime (ดู lib/db.ts)
// รูปแบบ `file:./dev.db` — path อ้างอิงจาก root ของโปรเจกต์
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: { url },
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
});
