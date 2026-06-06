-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'donor',
    "language" TEXT NOT NULL DEFAULT 'ta',
    "district" TEXT,
    "taluk" TEXT,
    "bloodGroup" TEXT,
    "gender" TEXT,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Hospital" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "lat" REAL,
    "lng" REAL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "BloodRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientName" TEXT NOT NULL,
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
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    CONSTRAINT "BloodRequest_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BloodRequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RequestDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "documentType" TEXT NOT NULL DEFAULT 'requirement_slip',
    "aiVerified" BOOLEAN NOT NULL DEFAULT false,
    "aiScore" INTEGER NOT NULL DEFAULT 0,
    "aiNotes" TEXT,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RequestDocument_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BloodRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DonorResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'alerted',
    "matchScore" INTEGER NOT NULL DEFAULT 0,
    "distanceKm" REAL,
    "etaMinutes" INTEGER,
    "acceptedAt" DATETIME,
    "arrivedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DonorResponse_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BloodRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DonorResponse_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DonorBadge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "donorId" TEXT NOT NULL,
    "badgeName" TEXT NOT NULL,
    "awardedDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DonorBadge_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FraudReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "againstUserId" TEXT NOT NULL,
    "reportedById" TEXT,
    "requestId" TEXT,
    "reason" TEXT NOT NULL,
    "aiFlag" TEXT,
    "aiConfidence" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FraudReport_againstUserId_fkey" FOREIGN KEY ("againstUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FraudReport_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AlertLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "radiusKm" INTEGER NOT NULL,
    "donorCount" INTEGER NOT NULL DEFAULT 0,
    "channel" TEXT NOT NULL DEFAULT 'push',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AlertLog_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BloodRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mobile" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_mobile_key" ON "User"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "DonorResponse_requestId_donorId_key" ON "DonorResponse"("requestId", "donorId");
