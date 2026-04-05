/*
  # Add signature and email functionality to invoices

  1. New Columns
    - `signature_data_url` (text) - Base64 encoded signature image
    - `signed_at` (timestamptz) - When the invoice was signed
    - `signed_by` (text) - Name of person who signed
    - `sent_at` (timestamptz) - When the invoice was emailed
    - `sent_to` (text) - Email address where invoice was sent

  2. Notes
    - These fields enable invoice signing and tracking of sent invoices
    - signature_data_url stores canvas signature as data URL
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'signature_data_url'
  ) THEN
    ALTER TABLE invoices ADD COLUMN signature_data_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'signed_at'
  ) THEN
    ALTER TABLE invoices ADD COLUMN signed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'signed_by'
  ) THEN
    ALTER TABLE invoices ADD COLUMN signed_by text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'sent_at'
  ) THEN
    ALTER TABLE invoices ADD COLUMN sent_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'sent_to'
  ) THEN
    ALTER TABLE invoices ADD COLUMN sent_to text;
  END IF;
END $$;