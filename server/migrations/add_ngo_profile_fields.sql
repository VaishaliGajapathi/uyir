-- Add NGO profile fields to User table
ALTER TABLE "User" ADD COLUMN "ngoAddress" TEXT;
ALTER TABLE "User" ADD COLUMN "ngoRegistrationNumber" TEXT;
ALTER TABLE "User" ADD COLUMN "ngoCertificates" TEXT;
ALTER TABLE "User" ADD COLUMN "ngoStatus" TEXT DEFAULT 'pending';
ALTER TABLE "User" ADD COLUMN "ngoLat" DOUBLE PRECISION;
ALTER TABLE "User" ADD COLUMN "ngoLng" DOUBLE PRECISION;
ALTER TABLE "User" ADD COLUMN "ngoPhone" TEXT;
ALTER TABLE "User" ADD COLUMN "ngoEmail" TEXT;
