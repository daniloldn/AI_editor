-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Essay" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL DEFAULT '',
    "question" TEXT NOT NULL DEFAULT '',
    "moduleName" TEXT NOT NULL DEFAULT 'General',
    "moduleColor" TEXT NOT NULL DEFAULT '#64748b',
    "contextNotes" TEXT NOT NULL DEFAULT '',
    "references" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Essay" ("contextNotes", "createdAt", "id", "moduleColor", "moduleName", "name", "question", "updatedAt") SELECT "contextNotes", "createdAt", "id", "moduleColor", "moduleName", "name", "question", "updatedAt" FROM "Essay";
DROP TABLE "Essay";
ALTER TABLE "new_Essay" RENAME TO "Essay";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
