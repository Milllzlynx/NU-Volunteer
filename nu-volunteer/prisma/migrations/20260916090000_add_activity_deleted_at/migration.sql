-- ลบกิจกรรมแบบนิ่ม: null = ยังอยู่, มีค่า = ถูกลบเมื่อไหร่
-- เพิ่มคอลัมน์ว่างได้จึงใช้ ALTER TABLE ตรง ๆ ไม่ต้องสร้างตารางใหม่แล้วย้ายข้อมูล
ALTER TABLE "Activity" ADD COLUMN "deletedAt" DATETIME;

CREATE INDEX "Activity_deletedAt_idx" ON "Activity"("deletedAt");
