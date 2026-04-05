/*
  # Add PDF storage to invoices

  1. Changes
    - Add `pdf_url` column to store generated PDF file URL
    - Add `attached_file_url` column to store user-uploaded attachment URL
    
  2. Security
    - Columns are nullable to support existing invoices
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'pdf_url'
  ) THEN
    ALTER TABLE invoices ADD COLUMN pdf_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'attached_file_url'
  ) THEN
    ALTER TABLE invoices ADD COLUMN attached_file_url text;
  END IF;
END $$;