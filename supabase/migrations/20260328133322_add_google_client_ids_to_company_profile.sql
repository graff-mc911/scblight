/*
  # Add Google Client IDs to company profile

  1. Changes
    - Add `google_client_ids` column to `company_profile` table to store comma-separated Google OAuth client IDs
  
  2. Security
    - Field is user-specific and protected by existing RLS policies
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_profile' AND column_name = 'google_client_ids'
  ) THEN
    ALTER TABLE company_profile ADD COLUMN google_client_ids text DEFAULT '';
  END IF;
END $$;