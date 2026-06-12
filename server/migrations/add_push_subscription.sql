-- Migration: Add pushSubscription column to User table
-- Run this in your Neon database to add web push notification support

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pushSubscription" TEXT;
