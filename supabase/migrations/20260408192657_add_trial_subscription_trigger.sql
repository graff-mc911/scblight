/*
  # Auto-create Trial Subscription on User Registration

  ## Summary
  Adds a PostgreSQL trigger that automatically creates a 30-day trial
  subscription record whenever a new user registers.

  ## Details
  1. New Function: `handle_new_user_trial`
     - Inserts a subscription row with status='trialing'
     - Sets trial_end = now() + 30 days
     - Uses ON CONFLICT DO NOTHING so existing records are not overwritten

  2. New Trigger: `on_auth_user_created_trial`
     - Fires AFTER INSERT on auth.users
     - Calls handle_new_user_trial for each new user

  ## Notes
  - Existing users do NOT get a trial automatically (trigger only fires on new registrations)
  - The trial_end column must exist; this migration also ensures it exists
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'trial_end'
  ) THEN
    ALTER TABLE public.subscriptions ADD COLUMN trial_end timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'cancel_at_period_end'
  ) THEN
    ALTER TABLE public.subscriptions ADD COLUMN cancel_at_period_end boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'plan'
  ) THEN
    ALTER TABLE public.subscriptions ADD COLUMN plan text;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user_trial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

DROP TRIGGER IF EXISTS on_auth_user_created_trial ON auth.users;

CREATE TRIGGER on_auth_user_created_trial
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_trial();
