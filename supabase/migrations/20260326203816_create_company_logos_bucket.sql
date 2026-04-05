/*
  # Create Storage Bucket for Company Logos

  1. Storage
    - Create `company-logos` bucket for storing uploaded logo images
    - Set bucket to public for easy display in invoices and documents
    - Configure RLS policies for secure access

  2. Security
    - Users can only upload to their own folder
    - Users can only read their own logos
    - Users can only update their own logos
    - Users can only delete their own logos
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own logos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'company-logos' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read own logos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'company-logos' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own logos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'company-logos' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own logos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'company-logos' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );