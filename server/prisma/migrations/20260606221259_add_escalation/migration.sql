-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BloodRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientName" TEXT NOT NULL,
    "patientAge" INTEGER,
    "patientGender" TEXT,
    "bloodGroup" TEXT NOT NULL,
    "componentType" TEXT NOT NULL DEFAULT 'whole_blood',
    "unitsRequired" INTEGER NOT NULL DEFAULT 1,
    "hospitalId" TEXT,
    "hospitalName" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "taluk" TEXT,
    "lat" REAL,
    "lng" REAL,
    "contactPerson" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "doctorReference" TEXT,
    "emergencyLevel" TEXT NOT NULL DEFAULT 'orange',
    "status" TEXT NOT NULL DEFAULT 'pending_verification',
    "verificationScore" INTEGER NOT NULL DEFAULT 0,
    "verificationNotes" TEXT,
    "alertRadiusKm" INTEGER NOT NULL DEFAULT 5,
    "escalationLevel" INTEGER NOT NULL DEFAULT 0,
    "escalatedAt" DATETIME,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    "verifiedBy" TEXT,
    "verifiedByType" TEXT,
    "verifiedAt" DATETIME,
    CONSTRAINT "BloodRequest_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BloodRequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_BloodRequest" ("alertRadiusKm", "bloodGroup", "closedAt", "componentType", "contactNumber", "contactPerson", "createdAt", "createdById", "district", "doctorReference", "emergencyLevel", "hospitalId", "hospitalName", "id", "lat", "lng", "patientAge", "patientGender", "patientName", "status", "taluk", "unitsRequired", "verificationNotes", "verificationScore", "verifiedAt", "verifiedBy", "verifiedByType") SELECT "alertRadiusKm", "bloodGroup", "closedAt", "componentType", "contactNumber", "contactPerson", "createdAt", "createdById", "district", "doctorReference", "emergencyLevel", "hospitalId", "hospitalName", "id", "lat", "lng", "patientAge", "patientGender", "patientName", "status", "taluk", "unitsRequired", "verificationNotes", "verificationScore", "verifiedAt", "verifiedBy", "verifiedByType" FROM "BloodRequest";
DROP TABLE "BloodRequest";
ALTER TABLE "new_BloodRequest" RENAME TO "BloodRequest";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
