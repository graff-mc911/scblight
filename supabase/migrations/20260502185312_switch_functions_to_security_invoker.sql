/*
  # Switch SECURITY DEFINER Functions to SECURITY INVOKER

  ## Summary
  Resolves security audit warnings by recreating four functions with SECURITY INVOKER
  instead of SECURITY DEFINER. This ensures these functions run with the caller's
  privileges rather than superuser privileges, eliminating the risk of privilege
  escalation via direct RPC calls.

  ## Functions Changed
  1. `create_user_profile` - Switched to SECURITY INVOKER; auth check + RLS handles access
  2. `handle_new_user_trial` - Trigger function switched to SECURITY INVOKER
  3. `update_scanned_documents_updated_at` - Timestamp trigger switched to SECURITY INVOKER
  4. `update_updated_at_column` - Timestamp trigger switched to SECURITY INVOKER

  ## Security Changes
  - All four functions now run as SECURITY INVOKER (caller's privileges)
  - Eliminates privilege escalation risk via /rest/v1/rpc/ endpoints
  - Trigger functions operate correctly under SECURITY INVOKER as they run in
    the context of the triggering statement's transaction
*/

CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_id uuid,
  user_email text,
  user_full_name text,
  user_company_name text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF auth.uid() != user_id THEN
    RAISE EXCEPTION 'Can only create own profile';
  END IF;

  INSERT INTO public.users (
    id,
    email,
    password_hash,
    full_name,
    company_name,
    subscription_status
  ) VALUES (
    user_id,
    user_email,
    'managed_by_supabase_auth',
    user_full_name,
    user_company_name,
    'inactive'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_trial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, status, trial_end, updated_at)
  VALUES (
    NEW.id,
    'trialing',
    NOW() + INTERVAL '30 days',
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_scanned_documents_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Ensure anon and authenticated roles have no execute on these functions
REVOKE EXECUTE ON FUNCTION public.create_user_profile(uuid, text, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_trial() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_scanned_documents_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
