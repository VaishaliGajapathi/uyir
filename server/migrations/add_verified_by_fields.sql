-- Add verifiedById and verifiedAt to BloodRequest and Hospital tables for activity tracking
ALTER TABLE "BloodRequest" ADD COLUMN "verifiedById" TEXT;
ALTER TABLE "BloodRequest" ADD COLUMN "verifiedAt" TIMESTAMP(3);
ALTER TABLE "Hospital" ADD COLUMN "verifiedById" TEXT;
ALTER TABLE "Hospital" ADD COLUMN "verifiedAt" TIMESTAMP(3);
