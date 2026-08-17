-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'student',
    "name" TEXT NOT NULL DEFAULT '',
    "studentId" TEXT,
    "faculty" TEXT,
    "loanStatus" TEXT,
    "avatarUrl" TEXT,
    "phone" TEXT,
    "bio" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "seeded" BOOLEAN NOT NULL DEFAULT false,
    "shareContact" BOOLEAN NOT NULL DEFAULT true,
    "deletionRequestedAt" DATETIME,
    "deletionReason" TEXT,
    "tokensValidFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("active", "avatarUrl", "createdAt", "email", "faculty", "id", "loanStatus", "name", "passwordHash", "phone", "role", "seeded", "studentId", "tokensValidFrom", "updatedAt") SELECT "active", "avatarUrl", "createdAt", "email", "faculty", "id", "loanStatus", "name", "passwordHash", "phone", "role", "seeded", "studentId", "tokensValidFrom", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_faculty_idx" ON "User"("faculty");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
