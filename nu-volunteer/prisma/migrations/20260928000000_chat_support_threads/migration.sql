-- แชทผู้จัดกิจกรรม ↔ ทีมผู้ดูแลระบบ
--
-- ห้องแชทเดิมเป็นคู่ "นิสิต ↔ ผู้จัด" ตายตัว คอลัมน์จึงชื่อ studentId/staffId
-- ห้องแบบใหม่เป็นคู่ "ผู้จัด ↔ ทีมผู้ดูแลระบบ" ซึ่งฝั่งผู้ตอบไม่ใช่คนคนเดียว
-- จึงเปลี่ยนสองคอลัมน์นั้นให้เป็นชื่อกลาง ๆ ตามบทบาทในห้อง (ผู้เปิด/ผู้ตอบ)
-- แล้วให้ responderId เป็น null ได้ = แอดมินคนไหนก็ตอบห้องนั้นได้
--
-- SQLite เปลี่ยนความเป็น null ของคอลัมน์ตรง ๆ ไม่ได้ ต้องสร้างตารางใหม่แล้วย้ายข้อมูล
-- แถวที่มีอยู่เดิมเป็นห้องนิสิต ↔ ผู้จัดทั้งหมด จึงได้ kind = 'activity'
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_ChatThread" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'activity',
    "openerId" TEXT NOT NULL,
    "responderId" TEXT,
    "lastMessageAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openerMuted" BOOLEAN NOT NULL DEFAULT false,
    "openerArchived" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ChatThread_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ChatThread_openerId_fkey" FOREIGN KEY ("openerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChatThread_responderId_fkey" FOREIGN KEY ("responderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_ChatThread" ("id", "activityId", "kind", "openerId", "responderId", "lastMessageAt", "createdAt", "openerMuted", "openerArchived")
SELECT "id", "activityId", 'activity', "studentId", "staffId", "lastMessageAt", "createdAt", "studentMuted", "studentArchived" FROM "ChatThread";

DROP TABLE "ChatThread";
ALTER TABLE "new_ChatThread" RENAME TO "ChatThread";

CREATE INDEX "ChatThread_openerId_idx" ON "ChatThread"("openerId");
CREATE INDEX "ChatThread_responderId_idx" ON "ChatThread"("responderId");
CREATE INDEX "ChatThread_kind_idx" ON "ChatThread"("kind");
CREATE UNIQUE INDEX "ChatThread_activityId_openerId_responderId_key" ON "ChatThread"("activityId", "openerId", "responderId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
