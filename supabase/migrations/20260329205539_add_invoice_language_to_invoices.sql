/*
  # Add invoice language field to invoices

  1. Changes
    - Add `invoice_language` column to `invoices` table
      - Type: text
      - Default: 'de' (German, as most invoices are in German)
      - Stores the language code for the invoice document

  2. Notes
    - This field allows users to generate invoices in different languages
    - Workers from different countries can create invoices without knowing the local language
    - Language codes follow ISO 639-1 standard (e.g., 'de', 'en', 'uk', 'pl', etc.)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'invoice_language'
  ) THEN
    ALTER TABLE invoices ADD COLUMN invoice_language text DEFAULT 'de';
  END IF;
END $$;
