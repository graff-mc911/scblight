/*
  # Update invoice_items table structure

  1. Changes
    - Add `material` column (text) - Name of the material/item
    - Add `sort_order` column (integer) - Sort order (replaces position)
    - Add `updated_at` column (timestamptz) - Last update timestamp
    - Remove dependency on old `position` column

  2. Notes
    - Copy data from `position` to `sort_order` before migration
    - `material` will be used to store item/material names
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_items' AND column_name = 'material'
  ) THEN
    ALTER TABLE invoice_items ADD COLUMN material text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_items' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE invoice_items ADD COLUMN sort_order integer DEFAULT 0;
    UPDATE invoice_items SET sort_order = COALESCE(position, 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_items' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE invoice_items ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;