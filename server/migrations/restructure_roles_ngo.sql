-- Migration: Restructure roles and NGO parent-child relationship
-- 1. Rename "admin" -> "administrator", "verifier" -> "volunteer"
-- 2. Create Ngo table for parent-child relationship
-- 3. Add ngoId and plainPassword columns to User table

-- Step 1: Rename roles
UPDATE "User" SET "role" = 'administrator' WHERE "role" = 'admin';
UPDATE "User" SET "role" = 'volunteer' WHERE "role" = 'verifier';

-- Step 2: Create Ngo table
CREATE TABLE IF NOT EXISTS "Ngo" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "address" TEXT,
  "registrationNumber" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "district" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Step 3: Add ngoId and plainPassword columns to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ngoId" UUID REFERENCES "Ngo"("id");
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "plainPassword" TEXT;

-- Step 4: Migrate existing NGO data - create Ngo records from existing NGO users
-- Group by ngoName + district to avoid duplicates
INSERT INTO "Ngo" ("name", "address", "registrationNumber", "phone", "email", "district", "status", "createdAt")
SELECT DISTINCT ON ("ngoName", COALESCE("district", ''))
  "ngoName",
  MIN("ngoAddress") OVER (PARTITION BY "ngoName", COALESCE("district", '')),
  MIN("ngoRegistrationNumber") OVER (PARTITION BY "ngoName", COALESCE("district", '')),
  MIN("ngoPhone") OVER (PARTITION BY "ngoName", COALESCE("district", '')),
  MIN("ngoEmail") OVER (PARTITION BY "ngoName", COALESCE("district", '')),
  "district",
  MIN("ngoStatus") OVER (PARTITION BY "ngoName", COALESCE("district", '')),
  MIN("createdAt") OVER (PARTITION BY "ngoName", COALESCE("district", ''))
FROM "User"
WHERE "role" = 'ngo' AND "ngoName" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Step 5: Link existing NGO users to Ngo records
UPDATE "User" u
SET "ngoId" = n."id"
FROM "Ngo" n
WHERE u."role" = 'ngo' AND u."ngoName" = n."name"
  AND COALESCE(u."district", '') = COALESCE(n."district", '');
