/*
  # Create subscriptions table (v2)

  1. New Tables
    - `subscriptions`
      - `id` (bigserial, primary key)
      - `user_id` (uuid, unique, not null) - references the authenticated user
      - `stripe_subscription_id` (text) - Stripe subscription identifier
      - `status` (text) - subscription status (active, canceled, past_due, etc.)
      - `current_period_end` (timestamptz) - when the current billing period ends
      - `updated_at` (timestamptz) - last updated timestamp

  2. Security
    - Enable RLS on `subscriptions` table
    - Users can only read their own subscription record
    - Only service role can insert/update/delete (managed by webhook)
*/

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  stripe_subscription_id text,
  status text,
  current_period_end timestamptz,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
