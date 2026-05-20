-- Add lead_type and next_step columns to enquiries table
ALTER TABLE enquiries
  ADD COLUMN IF NOT EXISTS lead_type text,
  ADD COLUMN IF NOT EXISTS next_step text;
