/*
  # Add object address field to invoices

  1. Changes
    - Add `object_address` column to `invoices` table
      - Stores the address of the work/service location (BVH address)
      - Text field, nullable
      - Will be displayed on invoice documents above the items table

  2. Notes
    - This field is optional and can be left empty if not needed
    - Used for construction/service invoices where work location differs from client address
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'object_address'
  ) THEN
    ALTER TABLE invoices ADD COLUMN object_address text;
  END IF;
END $$;