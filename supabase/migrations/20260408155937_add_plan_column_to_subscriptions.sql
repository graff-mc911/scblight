/*
  # Add plan column to subscriptions table

  ## Summary
  The subscriptions table is missing the `plan` column that is used by both the
  create-checkout-session edge function and the useSubscription frontend hook.
  Also sets a default value for status to prevent NOT NULL constraint errors on insert.

  ## Changes
  - `subscriptions`
    - Add `plan` (text, nullable) — stores 'monthly' or 'yearly'
    - Set default value for `status` column to 'trialing'
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'plan'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN plan text;
  END IF;
END $$;

ALTER TABLE subscriptions ALTER COLUMN status SET DEFAULT 'trialing';
