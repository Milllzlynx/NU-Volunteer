import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
    better-sqlite3 เป็น native module — ปล่อยให้ Node require เองตอน runtime
    อย่าให้ bundler พยายามรวม .node เข้าไปในไฟล์เดียว (พังทั้งตอน build และตอนรันบน serverless)
    ใช้เฉพาะเส้นทางฐานข้อมูลแบบไฟล์ ส่วน deploy บน Netlify ใช้ Turso จึงไม่ได้แตะโมดูลนี้เลย
  */
  serverExternalPackages: ['better-sqlite3', '@prisma/adapter-better-sqlite3'],
};

export default nextConfig;
