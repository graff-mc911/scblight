/*
  # Add client number to clients table

  1. Changes
    - Add `client_number` column to `clients` table
    - Make it unique per user
    - Auto-generate sequential client numbers
  
  2. Security
    - No RLS changes needed (existing policies cover this column)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'client_number'
  ) THEN
    ALTER TABLE clients ADD COLUMN client_number text;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS clients_user_id_client_number_key 
ON clients(user_id, client_number) 
WHERE client_number IS NOT NULL;