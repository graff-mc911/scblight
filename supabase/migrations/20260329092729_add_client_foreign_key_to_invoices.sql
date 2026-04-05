/*
  # Add foreign key relationship between invoices and clients

  1. Changes
    - Add foreign key constraint from invoices.client_id to clients.id
    - This enables Supabase to automatically join these tables

  2. Notes
    - Uses ON DELETE SET NULL to preserve invoices if client is deleted
    - Allows null values for invoices without assigned clients
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'invoices_client_id_fkey' 
    AND table_name = 'invoices'
  ) THEN
    ALTER TABLE invoices 
    ADD CONSTRAINT invoices_client_id_fkey 
    FOREIGN KEY (client_id) 
    REFERENCES clients(id) 
    ON DELETE SET NULL;
  END IF;
END $$;