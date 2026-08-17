-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "orgName" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "lat" REAL,
    "lng" REAL,
    "mapLink" TEXT,
    "geoRadiusM" INTEGER NOT NULL DEFAULT 300,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "regOpenAt" DATETIME,
    "regCloseAt" DATETIME,
    "seatsTotal" INTEGER NOT NULL DEFAULT 0,
    "hours" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'open',
    "photo" TEXT,
    "gallery" TEXT NOT NULL DEFAULT '[]',
    "mapImage" TEXT,
    "perks" TEXT NOT NULL DEFAULT '[]',
    "prep" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT NOT NULL DEFAULT '',
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Activity_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Activity_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Activity" ("categoryId", "createdAt", "description", "endAt", "gallery", "geoRadiusM", "hours", "id", "lat", "lng", "location", "mapImage", "mapLink", "orgName", "organizerId", "perks", "photo", "prep", "regCloseAt", "regOpenAt", "requiresApproval", "seatsTotal", "startAt", "status", "title", "updatedAt") SELECT "categoryId", "createdAt", "description", "endAt", "gallery", "geoRadiusM", "hours", "id", "lat", "lng", "location", "mapImage", "mapLink", "orgName", "organizerId", "perks", "photo", "prep", "regCloseAt", "regOpenAt", "requiresApproval", "seatsTotal", "startAt", "status", "title", "updatedAt" FROM "Activity";
DROP TABLE "Activity";
ALTER TABLE "new_Activity" RENAME TO "Activity";
CREATE INDEX "Activity_status_startAt_idx" ON "Activity"("status", "startAt");
CREATE INDEX "Activity_organizerId_idx" ON "Activity"("organizerId");
CREATE INDEX "Activity_categoryId_idx" ON "Activity"("categoryId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
