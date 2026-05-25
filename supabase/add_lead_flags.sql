-- Add flag columns to enquiries table
ALTER TABLE enquiries
  ADD COLUMN IF NOT EXISTS no_followup    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS do_not_contact boolean NOT NULL DEFAULT false;
