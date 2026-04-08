/*
  # Enable Realtime for subscriptions table

  ## Summary
  The subscriptions table is not included in the supabase_realtime publication,
  which means the frontend cannot receive live updates when the Stripe webhook
  updates the subscription status.

  ## Changes
  - Adds `subscriptions` table to the `supabase_realtime` publication
  - Sets REPLICA IDENTITY FULL on subscriptions so UPDATE/DELETE events include full row data
*/

ALTER TABLE subscriptions REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE subscriptions;
