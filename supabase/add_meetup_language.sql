-- Add language column to meetups table
ALTER TABLE meetups
  ADD COLUMN IF NOT EXISTS language text;

-- Update the type check constraint to allow 'hybrid'
-- (Original constraint only allowed 'online' and 'offline')
ALTER TABLE meetups DROP CONSTRAINT IF EXISTS meetups_type_check;
ALTER TABLE meetups ADD CONSTRAINT meetups_type_check CHECK (type IN ('online', 'offline', 'hybrid'));
