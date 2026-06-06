-- CreateTable
CREATE TABLE "DonorDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "donorId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "documentNumber" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "aiVerified" BOOLEAN NOT NULL DEFAULT false,
    "aiScore" INTEGER NOT NULL DEFAULT 0,
    "aiNotes" TEXT,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DonorDocument_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
