-- AlterTable
ALTER TABLE "DonorResponse" ADD COLUMN "currentLat" REAL;
ALTER TABLE "DonorResponse" ADD COLUMN "currentLng" REAL;
ALTER TABLE "DonorResponse" ADD COLUMN "estimatedArrival" DATETIME;
ALTER TABLE "DonorResponse" ADD COLUMN "lastLocationUpdate" DATETIME;
