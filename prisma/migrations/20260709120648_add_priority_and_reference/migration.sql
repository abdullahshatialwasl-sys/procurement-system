-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Request" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyName" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'عادي',
    "referenceNo" TEXT,
    "details" TEXT,
    "applicantName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "fileUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'جديد',
    "reply" TEXT,
    "replyFileUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Request" ("applicantName", "companyName", "createdAt", "details", "fileUrl", "id", "phone", "reply", "replyFileUrl", "requestType", "status") SELECT "applicantName", "companyName", "createdAt", "details", "fileUrl", "id", "phone", "reply", "replyFileUrl", "requestType", "status" FROM "Request";
DROP TABLE "Request";
ALTER TABLE "new_Request" RENAME TO "Request";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
