-- Drop existing tables in reverse dependency order (safe to rerun)
DROP TABLE IF EXISTS "HealthReminder" CASCADE;
DROP TABLE IF EXISTS "DonationRating" CASCADE;
DROP TABLE IF EXISTS "DonorDocument" CASCADE;
DROP INDEX IF EXISTS "DonorResponse_requestId_donorId_key";
DROP TABLE IF EXISTS "OtpCode" CASCADE;
DROP TABLE IF EXISTS "AlertLog" CASCADE;
DROP TABLE IF EXISTS "FraudReport" CASCADE;
DROP TABLE IF EXISTS "DonorBadge" CASCADE;
DROP TABLE IF EXISTS "DonorResponse" CASCADE;
DROP TABLE IF EXISTS "RequestDocument" CASCADE;
DROP TABLE IF EXISTS "BloodRequest" CASCADE;
DROP INDEX IF EXISTS "User_mobile_key";
DROP TABLE IF EXISTS "Hospital" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'donor',
    "language" TEXT NOT NULL DEFAULT 'ta',
    "district" TEXT,
    "taluk" TEXT,
    "bloodGroup" TEXT,
    "gender" TEXT,
    "age" INTEGER,
    "dob" TIMESTAMP(3),
    "lastDonationDate" TIMESTAMP(3),
    "isPlateletDonor" BOOLEAN NOT NULL DEFAULT false,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "shareLocation" BOOLEAN NOT NULL DEFAULT false,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "pincode" TEXT,
    "reputationScore" INTEGER NOT NULL DEFAULT 0,
    "donationCount" INTEGER NOT NULL DEFAULT 0,
    "livesSavedCount" INTEGER NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "fcmToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "voiceEnabled" BOOLEAN NOT NULL DEFAULT true,
    "locationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "hemoglobinLevel" DOUBLE PRECISION,
    "drinkingHabits" TEXT,
    "smokingHabits" TEXT,
    "sleepHours" INTEGER,
    "healthTips" TEXT,
    "weight" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "hospitalName" TEXT,
    "hospitalRegistrationId" TEXT,
    "hospitalId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hospital" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hospital_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BloodRequest" (
    "id" TEXT NOT NULL,
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
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "contactPerson" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "doctorReference" TEXT,
    "emergencyLevel" TEXT NOT NULL DEFAULT 'orange',
    "status" TEXT NOT NULL DEFAULT 'pending_verification',
    "verificationScore" INTEGER NOT NULL DEFAULT 0,
    "verificationNotes" TEXT,
    "alertRadiusKm" INTEGER NOT NULL DEFAULT 25,
    "escalationLevel" INTEGER NOT NULL DEFAULT 0,
    "escalatedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "verifiedByType" TEXT,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "BloodRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestDocument" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "documentType" TEXT NOT NULL DEFAULT 'requirement_slip',
    "aiVerified" BOOLEAN NOT NULL DEFAULT false,
    "aiScore" INTEGER NOT NULL DEFAULT 0,
    "aiNotes" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonorResponse" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'alerted',
    "matchScore" INTEGER NOT NULL DEFAULT 0,
    "distanceKm" DOUBLE PRECISION,
    "etaMinutes" INTEGER,
    "acceptedAt" TIMESTAMP(3),
    "arrivedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "navigationStarted" TIMESTAMP(3),
    "personMet" TIMESTAMP(3),
    "donationStarted" TIMESTAMP(3),
    "trackingNotes" TEXT,
    "currentLat" DOUBLE PRECISION,
    "currentLng" DOUBLE PRECISION,
    "lastLocationUpdate" TIMESTAMP(3),
    "estimatedArrival" TIMESTAMP(3),

    CONSTRAINT "DonorResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonorBadge" (
    "id" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "badgeName" TEXT NOT NULL,
    "awardedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DonorBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraudReport" (
    "id" TEXT NOT NULL,
    "againstUserId" TEXT NOT NULL,
    "reportedById" TEXT,
    "requestId" TEXT,
    "reason" TEXT NOT NULL,
    "aiFlag" TEXT,
    "aiConfidence" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FraudReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertLog" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "radiusKm" INTEGER NOT NULL,
    "donorCount" INTEGER NOT NULL DEFAULT 0,
    "channel" TEXT NOT NULL DEFAULT 'push',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonorDocument" (
    "id" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "documentNumber" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "aiVerified" BOOLEAN NOT NULL DEFAULT false,
    "aiScore" INTEGER NOT NULL DEFAULT 0,
    "aiNotes" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DonorDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonationRating" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "testimonial" TEXT,
    "responseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DonationRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthReminder" (
    "id" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "donationDate" TIMESTAMP(3) NOT NULL,
    "hoursAfterDonation" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "fluidType" TEXT NOT NULL,
    "foodRecommendation" TEXT NOT NULL,
    "sleepRecommendation" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_mobile_key" ON "User"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "DonorResponse_requestId_donorId_key" ON "DonorResponse"("requestId", "donorId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodRequest" ADD CONSTRAINT "BloodRequest_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodRequest" ADD CONSTRAINT "BloodRequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestDocument" ADD CONSTRAINT "RequestDocument_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BloodRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonorResponse" ADD CONSTRAINT "DonorResponse_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BloodRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonorResponse" ADD CONSTRAINT "DonorResponse_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonorBadge" ADD CONSTRAINT "DonorBadge_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudReport" ADD CONSTRAINT "FraudReport_againstUserId_fkey" FOREIGN KEY ("againstUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudReport" ADD CONSTRAINT "FraudReport_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertLog" ADD CONSTRAINT "AlertLog_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BloodRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonorDocument" ADD CONSTRAINT "DonorDocument_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationRating" ADD CONSTRAINT "DonationRating_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BloodRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationRating" ADD CONSTRAINT "DonationRating_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationRating" ADD CONSTRAINT "DonationRating_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthReminder" ADD CONSTRAINT "HealthReminder_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

