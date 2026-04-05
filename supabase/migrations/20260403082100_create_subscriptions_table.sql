/*
  # Create subscriptions table

  ## Summary
  Stores Stripe subscription data per user.

  ## New Tables
  - `subscriptions`
    - `id` (uuid, primary key)
    - `user_id` (uuid, FK to auth.users, unique — one subscription per user)
    - `stripe_customer_id` (text) — Stripe customer ID
    - `stripe_subscription_id` (text) — Stripe subscription ID
    - `stripe_price_id` (text) — which price/plan the user is on
    - `status` (text) — Stripe subscription status: trialing, active, canceled, past_due, etc.
    - `trial_end` (timestamptz) — when the trial ends
    - `current_period_end` (timestamptz) — next billing date
    - `cancel_at_period_end` (boolean) — whether user has requested cancellation
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Users can only read their own subscription record
  - Only service role (webhook) can insert/update
*/

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  status text NOT NULL DEFAULT 'trialing',
  trial_end timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_stripe_customer_id_idx ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS subscriptions_stripe_subscription_id_idx ON subscriptions(stripe_subscription_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
