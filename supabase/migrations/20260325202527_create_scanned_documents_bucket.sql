/*
  # Create Storage Bucket for Scanned Documents

  1. Storage
    - Create `scanned-documents` bucket for storing uploaded images
    - Set bucket to public for easy access to document images
    - Configure RLS policies for secure access

  2. Security
    - Users can only upload to their own folder
    - Users can only read their own documents
    - Users can only delete their own documents
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('scanned-documents', 'scanned-documents', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'scanned-documents' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read own documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'scanned-documents' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own documents"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'scanned-documents' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );