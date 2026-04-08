import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | null;

type SubscriptionRecord = {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: SubscriptionStatus;
  plan: 'monthly' | 'yearly' | null;
  trial_end: string | null;
  current_period_end: string | null;
};

export function hasFullAccess(status: SubscriptionStatus) {
  return status === 'trialing' || status === 'active';
}

export function useSubscription() {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSubscription(null);
      setLoading(false);
      setUserId(null);
      return;
    }

    setUserId(user.id);

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Failed to load subscription', error);
      setSubscription(null);
    } else {
      setSubscription(data as SubscriptionRecord | null);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        setSubscription(null);
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        console.error('Failed to load subscription', error);
        setSubscription(null);
      } else {
        setSubscription(data as SubscriptionRecord | null);
      }

      setLoading(false);
    }

    init();

    const {
      data: { subscription: authSub },
    } = supabase.auth.onAuthStateChange(() => {
      if (mounted) load();
    });

    return () => {
      mounted = false;
      authSub.unsubscribe();
    };
  }, [load]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`subscription-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          load();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, load]);

  return {
    loading,
    subscription,
    status: subscription?.status ?? null,
    fullAccess: hasFullAccess(subscription?.status ?? null),
    viewOnly: !hasFullAccess(subscription?.status ?? null),
    refetch: load,
  };
}
