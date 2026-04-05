/*
  # Fix missing INSERT policy for uploaded-invoices storage bucket

  ## Problem
  The uploaded-invoices storage bucket was missing an INSERT policy,
  which prevented authenticated users from uploading PDF files.

  ## Changes
  - Add INSERT policy for storage.objects in the uploaded-invoices bucket
    allowing authenticated users to upload files into their own folder (user_id prefix)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
      AND policyname = 'Users can upload their own invoice PDFs'
  ) THEN
    CREATE POLICY "Users can upload their own invoice PDFs"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'uploaded-invoices'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;
