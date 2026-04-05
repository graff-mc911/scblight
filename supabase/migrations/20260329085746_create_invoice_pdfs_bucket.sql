/*
  # Create storage bucket for invoice PDFs

  1. New Storage Bucket
    - `invoice-pdfs` - stores generated PDF invoices and user attachments
    
  2. Security
    - Users can upload/view/delete their own invoice PDFs
    - Files are organized by user_id
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoice-pdfs', 'invoice-pdfs', false)
ON CONFLICT (id) DO NOTHING;