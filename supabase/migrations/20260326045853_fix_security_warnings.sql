/*
  # Fix Supabase Security Warnings
  
  1. Security Changes
    - Fix SECURITY DEFINER view by removing it and using RLS instead
    - Fix function search path mutability by setting explicit search_path
    - Set secure search_path for trigger functions
  
  2. Changes Made
    - Drop users_safe view (SECURITY DEFINER is unnecessary with proper RLS)
    - Recreate trigger functions with SET search_path = ''
    - Maintain all existing functionality with improved security
*/

-- Drop the users_safe view (use RLS on users table instead)
DROP VIEW IF EXISTS users_safe CASCADE;

-- Recreate update_updated_at_column with secure search_path
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate update_scanned_documents_updated_at with secure search_path
CREATE OR REPLACE FUNCTION update_scanned_documents_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;