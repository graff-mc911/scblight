import { useEffect, useState } from 'react';
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

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (mounted) {
          setSubscription(null);
          setLoading(false);
        }
        return;
      }

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

    load();

    const {
      data: { subscription: authSub },
    } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => {
      mounted = false;
      authSub.unsubscribe();
    };
  }, []);

  return {
    loading,
    subscription,
    status: subscription?.status ?? null,
    fullAccess: hasFullAccess(subscription?.status ?? null),
    viewOnly: !hasFullAccess(subscription?.status ?? null),
  };
}
