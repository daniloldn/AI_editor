-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Essay" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL DEFAULT '',
    "question" TEXT NOT NULL DEFAULT '',
    "contextNotes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Essay" ("id", "name", "question", "contextNotes", "createdAt", "updatedAt")
SELECT "id", "title", "title", "contextNotes", "createdAt", "updatedAt"
FROM "Essay";
DROP TABLE "Essay";
ALTER TABLE "new_Essay" RENAME TO "Essay";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
