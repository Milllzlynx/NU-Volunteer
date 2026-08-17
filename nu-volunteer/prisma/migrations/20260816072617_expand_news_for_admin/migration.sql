/*
  Warnings:

  - You are about to drop the column `published` on the `News` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_News" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" DATETIME,
    "image" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "audience" TEXT NOT NULL DEFAULT 'public',
    "views" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "authorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "News_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_News" ("body", "createdAt", "id", "publishedAt", "title", "updatedAt") SELECT "body", "createdAt", "id", "publishedAt", "title", "updatedAt" FROM "News";
DROP TABLE "News";
ALTER TABLE "new_News" RENAME TO "News";
CREATE INDEX "News_status_publishedAt_idx" ON "News"("status", "publishedAt");
CREATE INDEX "News_pinned_publishedAt_idx" ON "News"("pinned", "publishedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
