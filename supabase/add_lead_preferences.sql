-- Add language_preference and mode_preference columns to enquiries table
ALTER TABLE enquiries
  ADD COLUMN IF NOT EXISTS language_preference text,
  ADD COLUMN IF NOT EXISTS mode_preference text;
