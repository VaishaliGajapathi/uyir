-- UYIR — Tamil Nadu Verified Blood & Platelet Emergency Network
-- PostgreSQL Schema for Neon Database
-- Run this in your Neon database to create all tables

-- Users table
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'donor',
    "language" TEXT NOT NULL DEFAULT 'ta',
    "district" TEXT,
    "taluk" TEXT,
    "bloodGroup" TEXT,
    "gender" TEXT,
    "age" INTEGER,
    "dob" TIMESTAMP,
    "lastDonationDate" TIMESTAMP,
    "isPlateletDonor" BOOLEAN NOT NULL DEFAULT false,
    "nightEmergency" BOOLEAN NOT NULL DEFAULT false,
    "shareLocation" BOOLEAN NOT NULL DEFAULT false,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "reputationScore" INTEGER NOT NULL DEFAULT 0,
    "donationCount" INTEGER NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "fcmToken" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
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

CREATE UNIQUE INDEX IF NOT EXISTS "User_mobile_key" ON "User"("mobile");

-- Hospitals table
CREATE TABLE IF NOT EXISTS "Hospital" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hospital_pkey" PRIMARY KEY ("id")
);

-- Blood Requests table
CREATE TABLE IF NOT EXISTS "BloodRequest" (
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
    "alertRadiusKm" INTEGER NOT NULL DEFAULT 5,
    "escalationLevel" INTEGER NOT NULL DEFAULT 0,
    "escalatedAt" TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP,
    "verifiedBy" TEXT,
    "verifiedByType" TEXT,
    "verifiedAt" TIMESTAMP,

    CONSTRAINT "BloodRequest_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BloodRequest_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BloodRequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Request Documents table
CREATE TABLE IF NOT EXISTS "RequestDocument" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "documentType" TEXT NOT NULL DEFAULT 'requirement_slip',
    "aiVerified" BOOLEAN NOT NULL DEFAULT false,
    "aiScore" INTEGER NOT NULL DEFAULT 0,
    "aiNotes" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestDocument_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RequestDocument_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BloodRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Donor Responses table
CREATE TABLE IF NOT EXISTS "DonorResponse" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'alerted',
    "matchScore" INTEGER NOT NULL DEFAULT 0,
    "distanceKm" DOUBLE PRECISION,
    "etaMinutes" INTEGER,
    "acceptedAt" TIMESTAMP,
    "arrivedAt" TIMESTAMP,
    "completedAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "navigationStarted" TIMESTAMP,
    "personMet" TIMESTAMP,
    "donationStarted" TIMESTAMP,
    "trackingNotes" TEXT,
    "currentLat" DOUBLE PRECISION,
    "currentLng" DOUBLE PRECISION,
    "lastLocationUpdate" TIMESTAMP,
    "estimatedArrival" TIMESTAMP,

    CONSTRAINT "DonorResponse_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DonorResponse_requestId_donorId_key" UNIQUE ("requestId", "donorId"),
    CONSTRAINT "DonorResponse_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BloodRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DonorResponse_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Donor Badges table
CREATE TABLE IF NOT EXISTS "DonorBadge" (
    "id" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "badgeName" TEXT NOT NULL,
    "awardedDate" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DonorBadge_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DonorBadge_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Fraud Reports table
CREATE TABLE IF NOT EXISTS "FraudReport" (
    "id" TEXT NOT NULL,
    "againstUserId" TEXT NOT NULL,
    "reportedById" TEXT,
    "requestId" TEXT,
    "reason" TEXT NOT NULL,
    "aiFlag" TEXT,
    "aiConfidence" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FraudReport_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FraudReport_againstUserId_fkey" FOREIGN KEY ("againstUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FraudReport_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Alert Logs table
CREATE TABLE IF NOT EXISTS "AlertLog" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "radiusKm" INTEGER NOT NULL,
    "donorCount" INTEGER NOT NULL DEFAULT 0,
    "channel" TEXT NOT NULL DEFAULT 'push',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertLog_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AlertLog_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BloodRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- OTP Codes table
CREATE TABLE IF NOT EXISTS "OtpCode" (
    "id" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- Donor Documents table
CREATE TABLE IF NOT EXISTS "DonorDocument" (
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

    CONSTRAINT "DonorDocument_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DonorDocument_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Donation Ratings table
CREATE TABLE IF NOT EXISTS "DonationRating" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "testimonial" TEXT,
    "responseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DonationRating_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DonationRating_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BloodRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DonationRating_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DonationRating_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Health Reminders table
CREATE TABLE IF NOT EXISTS "HealthReminder" (
    "id" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "donationDate" TIMESTAMP NOT NULL,
    "hoursAfterDonation" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "fluidType" TEXT NOT NULL,
    "foodRecommendation" TEXT NOT NULL,
    "sleepRecommendation" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP NOT NULL,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthReminder_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "HealthReminder_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Add foreign key for User.hospitalId
ALTER TABLE "User" ADD CONSTRAINT "User_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE SET NULL ON UPDATE CASCADE;
