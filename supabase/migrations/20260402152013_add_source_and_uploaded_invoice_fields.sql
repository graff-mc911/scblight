/*
  # Add source field to invoices and uploaded_invoices storage bucket

  ## Changes
  1. invoices table
     - New column `source` (text, default 'created') — 'created' for invoices made in app, 'uploaded' for externally uploaded PDFs
     - New column `uploaded_pdf_url` (text) — URL of the uploaded PDF file
     - New column `uploaded_amount` (numeric) — manually entered amount for uploaded invoices

  ## Notes
  - Uploaded invoices will show with a different visual style on the Invoices page
  - Their amounts are counted as expenses (Всього затрачено), not income
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'source'
  ) THEN
    ALTER TABLE invoices ADD COLUMN source text DEFAULT 'created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'uploaded_pdf_url'
  ) THEN
    ALTER TABLE invoices ADD COLUMN uploaded_pdf_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'uploaded_amount'
  ) THEN
    ALTER TABLE invoices ADD COLUMN uploaded_amount numeric DEFAULT 0;
  END IF;
END $$;

-- Create storage bucket for uploaded invoices PDFs if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploaded-invoices', 'uploaded-invoices', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for uploaded-invoices bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can upload their own invoice PDFs'
  ) THEN
    CREATE POLICY "Users can upload their own invoice PDFs"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'uploaded-invoices' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can view their own uploaded invoice PDFs'
  ) THEN
    CREATE POLICY "Users can view their own uploaded invoice PDFs"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'uploaded-invoices' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can delete their own uploaded invoice PDFs'
  ) THEN
    CREATE POLICY "Users can delete their own uploaded invoice PDFs"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'uploaded-invoices' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;
