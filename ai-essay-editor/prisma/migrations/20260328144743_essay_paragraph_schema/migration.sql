/*
  Warnings:

  - You are about to drop the column `content` on the `Essay` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Paragraph" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "essayId" INTEGER NOT NULL,
    "originalText" TEXT NOT NULL,
    "polishedText" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Paragraph_essayId_fkey" FOREIGN KEY ("essayId") REFERENCES "Essay" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Essay" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Essay" ("createdAt", "id", "title", "updatedAt") SELECT "createdAt", "id", "title", "updatedAt" FROM "Essay";
DROP TABLE "Essay";
ALTER TABLE "new_Essay" RENAME TO "Essay";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Paragraph_essayId_idx" ON "Paragraph"("essayId");

-- CreateIndex
CREATE UNIQUE INDEX "Paragraph_essayId_order_key" ON "Paragraph"("essayId", "order");
