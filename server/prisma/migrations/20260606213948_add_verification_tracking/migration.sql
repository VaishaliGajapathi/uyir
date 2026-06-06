-- AlterTable
ALTER TABLE "BloodRequest" ADD COLUMN "verifiedAt" DATETIME;
ALTER TABLE "BloodRequest" ADD COLUMN "verifiedBy" TEXT;
ALTER TABLE "BloodRequest" ADD COLUMN "verifiedByType" TEXT;
