-- Migration to update role names to match new role structure
-- Old roles: ngo_admin, hospital_approver, hospital_admin
-- New roles: ngo, hospital, blood_bank

UPDATE "User" SET "role" = 'ngo' WHERE "role" = 'ngo_admin';
UPDATE "User" SET "role" = 'hospital' WHERE "role" = 'hospital_approver';
UPDATE "User" SET "role" = 'hospital' WHERE "role" = 'hospital_admin';

-- Update verifiedByType in BloodRequest table
UPDATE "BloodRequest" SET "verifiedByType" = 'ngo' WHERE "verifiedByType" = 'ngo_admin';
UPDATE "BloodRequest" SET "verifiedByType" = 'hospital' WHERE "verifiedByType" = 'hospital_approver';
UPDATE "BloodRequest" SET "verifiedByType" = 'hospital' WHERE "verifiedByType" = 'hospital_admin';
