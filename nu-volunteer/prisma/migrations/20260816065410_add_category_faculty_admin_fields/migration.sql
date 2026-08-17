-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL DEFAULT '',
    "desc" TEXT NOT NULL DEFAULT '',
    "icon" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT '#A774F7',
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_Category" ("active", "color", "id", "label", "labelEn", "order") SELECT "active", "color", "id", "label", "labelEn", "order" FROM "Category";
DROP TABLE "Category";
ALTER TABLE "new_Category" RENAME TO "Category";
CREATE TABLE "new_Faculty" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL DEFAULT '',
    "abbr" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "colorName" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT '#A774F7',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Faculty" ("color", "colorName", "createdAt", "id", "name", "order") SELECT "color", "colorName", "createdAt", "id", "name", "order" FROM "Faculty";
DROP TABLE "Faculty";
ALTER TABLE "new_Faculty" RENAME TO "Faculty";
CREATE UNIQUE INDEX "Faculty_name_key" ON "Faculty"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
