-- Add communication channel tracking columns to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS in_kerala_whatsapp boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS in_nyg_whatsapp    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS in_newsletter      boolean NOT NULL DEFAULT false;
