-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ChatThread" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityId" TEXT,
    "studentId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "lastMessageAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studentMuted" BOOLEAN NOT NULL DEFAULT false,
    "studentArchived" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ChatThread_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ChatThread_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChatThread_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ChatThread" ("activityId", "createdAt", "id", "lastMessageAt", "staffId", "studentId") SELECT "activityId", "createdAt", "id", "lastMessageAt", "staffId", "studentId" FROM "ChatThread";
DROP TABLE "ChatThread";
ALTER TABLE "new_ChatThread" RENAME TO "ChatThread";
CREATE INDEX "ChatThread_studentId_idx" ON "ChatThread"("studentId");
CREATE INDEX "ChatThread_staffId_idx" ON "ChatThread"("staffId");
CREATE UNIQUE INDEX "ChatThread_activityId_studentId_staffId_key" ON "ChatThread"("activityId", "studentId", "staffId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
