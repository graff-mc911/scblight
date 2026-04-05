/*
  # Add missing columns to subscriptions table

  ## Summary
  The subscriptions table was created without stripe_price_id and trial_end columns.
  This migration adds the missing columns needed for subscription tracking.

  ## Changes
  - `subscriptions`
    - Add `stripe_price_id` (text) — which price/plan the user is on
    - Add `trial_end` (timestamptz) — when the trial ends
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'stripe_price_id'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN stripe_price_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'trial_end'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN trial_end timestamptz;
  END IF;
END $$;
