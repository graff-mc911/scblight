/*
  # Add document_type column to invoices table

  1. Changes
    - Add `document_type` column to `invoices` table with three options:
      - 'invoice' (Рахунок)
      - 'proposal' (Пропозиція)
      - 'estimate' (Кошторис)
    - Default value is 'invoice' for backwards compatibility
    - Add check constraint to ensure only valid values are used

  2. Security
    - No RLS changes needed as column inherits existing policies
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'document_type'
  ) THEN
    ALTER TABLE invoices 
    ADD COLUMN document_type text DEFAULT 'invoice' NOT NULL
    CHECK (document_type IN ('invoice', 'proposal', 'estimate'));
  END IF;
END $$;