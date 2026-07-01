-- Add request expiry and operational healthcare tables
ALTER TABLE "BloodRequest" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS idx_blood_request_expiry ON "BloodRequest" ("expiresAt", "status") WHERE "expiresAt" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "BloodBank" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "district" TEXT NOT NULL,
  "address" TEXT,
  "phone" TEXT,
  "lat" DOUBLE PRECISION,
  "lng" DOUBLE PRECISION,
  "availableBloodGroups" TEXT,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BloodBank_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "VerificationHistory" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "verifierId" TEXT,
  "decision" TEXT NOT NULL,
  "score" INTEGER,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VerificationHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DisasterBroadcast" (
  "id" TEXT NOT NULL,
  "district" TEXT,
  "message" TEXT NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'high',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DisasterBroadcast_pkey" PRIMARY KEY ("id")
);
