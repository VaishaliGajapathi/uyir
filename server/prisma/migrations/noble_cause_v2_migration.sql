-- UYIR Donor Table Migration: Noble Cause v2.0
-- Goal: Remove health data, add compliance + speed
-- Run this in Neon/Supabase SQL editor. Backup first.

BEGIN;

-- Step 1: Drop toxic columns that kill trust + create legal liability
ALTER TABLE "User" 
DROP COLUMN IF EXISTS "hemoglobinLevel",
DROP COLUMN IF EXISTS "weight",
DROP COLUMN IF EXISTS "height",
DROP COLUMN IF EXISTS "smokingHabits",
DROP COLUMN IF EXISTS "drinkingHabits",
DROP COLUMN IF EXISTS "sleepHours",
DROP COLUMN IF EXISTS "healthTips";

-- Step 2: Drop HealthReminder table (no longer needed)
DROP TABLE IF EXISTS "HealthReminder" CASCADE;

-- Step 3: Add only what matters for 2am matching
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "pincode" VARCHAR(6),
ADD COLUMN IF NOT EXISTS "isAvailable" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "livesSavedCount" INT DEFAULT 0;

-- Step 4: Replace nightEmergency with isAvailable (already added above)
-- Note: nightEmergency column will be deprecated, isAvailable is the new field

-- Step 5: Add indexes for 8-second matching
CREATE INDEX IF NOT EXISTS "idx_users_blood_group" ON "User"("bloodGroup");
CREATE INDEX IF NOT EXISTS "idx_users_district" ON "User"("district");
CREATE INDEX IF NOT EXISTS "idx_users_availability" ON "User"("isAvailable", "lastDonationDate") 
WHERE "isAvailable" = true;

-- Step 6: Add 90-day gap check function
CREATE OR REPLACE FUNCTION can_donate(donor_last_donation TIMESTAMP WITH TIME ZONE) 
RETURNS BOOLEAN AS $$
BEGIN
  IF donor_last_donation IS NULL THEN RETURN true; END IF;
  RETURN donor_last_donation < CURRENT_TIMESTAMP - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 7: Auto-update availability based on 90-day rule
CREATE OR REPLACE FUNCTION update_donor_availability() 
RETURNS TRIGGER AS $$
BEGIN
  NEW."isAvailable" := can_donate(NEW."lastDonationDate");
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS "trg_update_availability" ON "User";
CREATE TRIGGER "trg_update_availability"
BEFORE INSERT OR UPDATE OF "lastDonationDate" ON "User"
FOR EACH ROW EXECUTE FUNCTION update_donor_availability();

-- Step 9: Update existing users' availability based on their last donation date
UPDATE "User" 
SET "isAvailable" = can_donate("lastDonationDate")
WHERE "lastDonationDate" IS NOT NULL;

-- Step 10: Set default availability for users without last donation date
UPDATE "User" 
SET "isAvailable" = true
WHERE "lastDonationDate" IS NULL;

COMMIT;

-- Verification queries (run after migration to verify)
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'User';
-- SELECT * FROM "User" LIMIT 1;
-- SELECT can_donate('2026-03-01'::timestamp); -- Should return false if < 90 days ago
