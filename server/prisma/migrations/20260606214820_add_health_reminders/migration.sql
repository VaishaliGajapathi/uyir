-- CreateTable
CREATE TABLE "HealthReminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "donorId" TEXT NOT NULL,
    "donationDate" DATETIME NOT NULL,
    "hoursAfterDonation" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "fluidType" TEXT NOT NULL,
    "foodRecommendation" TEXT NOT NULL,
    "sleepRecommendation" TEXT NOT NULL,
    "scheduledAt" DATETIME NOT NULL,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HealthReminder_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
