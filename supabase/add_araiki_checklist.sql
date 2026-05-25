-- Add post-attunement checklist columns to araiki_attunements table
ALTER TABLE araiki_attunements
  ADD COLUMN IF NOT EXISTS checklist_video_sent       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS checklist_pdf_sent         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS checklist_whatsapp_added   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS checklist_newsletter_added boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS checklist_next_discussed   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS checklist_symbols_taught   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS checklist_symbols_pdf_sent boolean NOT NULL DEFAULT false;
