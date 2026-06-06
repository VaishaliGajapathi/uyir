-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'donor',
    "language" TEXT NOT NULL DEFAULT 'ta',
    "district" TEXT,
    "taluk" TEXT,
    "bloodGroup" TEXT,
    "gender" TEXT,
    "age" INTEGER,
    "dob" DATETIME,
    "lastDonationDate" DATETIME,
    "isPlateletDonor" BOOLEAN NOT NULL DEFAULT false,
    "nightEmergency" BOOLEAN NOT NULL DEFAULT false,
    "shareLocation" BOOLEAN NOT NULL DEFAULT false,
    "lat" REAL,
    "lng" REAL,
    "reputationScore" INTEGER NOT NULL DEFAULT 0,
    "donationCount" INTEGER NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "fcmToken" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "voiceEnabled" BOOLEAN NOT NULL DEFAULT true,
    "locationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "hemoglobinLevel" REAL,
    "drinkingHabits" TEXT,
    "smokingHabits" TEXT,
    "sleepHours" INTEGER,
    "healthTips" TEXT,
    "weight" REAL,
    "height" REAL,
    "hospitalName" TEXT,
    "hospitalRegistrationId" TEXT,
    "hospitalId" TEXT,
    CONSTRAINT "User_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("age", "banned", "bloodGroup", "createdAt", "district", "dob", "donationCount", "drinkingHabits", "fcmToken", "gender", "healthTips", "height", "hemoglobinLevel", "hospitalId", "hospitalName", "hospitalRegistrationId", "id", "isPlateletDonor", "language", "lastDonationDate", "lat", "lng", "mobile", "name", "nightEmergency", "reputationScore", "role", "shareLocation", "sleepHours", "smokingHabits", "taluk", "verified", "weight") SELECT "age", "banned", "bloodGroup", "createdAt", "district", "dob", "donationCount", "drinkingHabits", "fcmToken", "gender", "healthTips", "height", "hemoglobinLevel", "hospitalId", "hospitalName", "hospitalRegistrationId", "id", "isPlateletDonor", "language", "lastDonationDate", "lat", "lng", "mobile", "name", "nightEmergency", "reputationScore", "role", "shareLocation", "sleepHours", "smokingHabits", "taluk", "verified", "weight" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_mobile_key" ON "User"("mobile");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
