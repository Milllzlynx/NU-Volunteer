-- CreateTable
CREATE TABLE "ActivitySession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ActivitySession_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Registration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "sessionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "regAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" DATETIME,
    "rejectedAt" DATETIME,
    "rejectReason" TEXT,
    "checkedInAt" DATETIME,
    "checkedOutAt" DATETIME,
    "checkinLat" REAL,
    "checkinLng" REAL,
    "checkinOutOfRange" BOOLEAN NOT NULL DEFAULT false,
    "hoursComputed" REAL NOT NULL DEFAULT 0,
    "hoursAwarded" REAL NOT NULL DEFAULT 0,
    "hoursApprovedAt" DATETIME,
    "cancelRequested" BOOLEAN NOT NULL DEFAULT false,
    "cancelReason" TEXT,
    "cancelStatus" TEXT,
    "cancelledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Registration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Registration_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Registration_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ActivitySession" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Registration" ("activityId", "approvedAt", "cancelReason", "cancelRequested", "cancelStatus", "cancelledAt", "checkedInAt", "checkedOutAt", "checkinLat", "checkinLng", "checkinOutOfRange", "createdAt", "hoursApprovedAt", "hoursAwarded", "hoursComputed", "id", "regAt", "rejectReason", "rejectedAt", "status", "updatedAt", "userId") SELECT "activityId", "approvedAt", "cancelReason", "cancelRequested", "cancelStatus", "cancelledAt", "checkedInAt", "checkedOutAt", "checkinLat", "checkinLng", "checkinOutOfRange", "createdAt", "hoursApprovedAt", "hoursAwarded", "hoursComputed", "id", "regAt", "rejectReason", "rejectedAt", "status", "updatedAt", "userId" FROM "Registration";
DROP TABLE "Registration";
ALTER TABLE "new_Registration" RENAME TO "Registration";
CREATE INDEX "Registration_activityId_status_idx" ON "Registration"("activityId", "status");
CREATE INDEX "Registration_userId_status_idx" ON "Registration"("userId", "status");
CREATE UNIQUE INDEX "Registration_userId_activityId_key" ON "Registration"("userId", "activityId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ActivitySession_activityId_startAt_idx" ON "ActivitySession"("activityId", "startAt");

-- CreateIndex
CREATE INDEX "ActivitySession_status_idx" ON "ActivitySession"("status");
