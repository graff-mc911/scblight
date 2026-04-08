/*
  # Remove duplicate SELECT policy on subscriptions

  There are two identical SELECT policies:
  - "Users can view own subscription" (old)
  - "Users can view own subscriptions" (new)

  Removing the old duplicate.
*/

DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;