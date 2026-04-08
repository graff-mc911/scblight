import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface SubscriptionInfo {
  canEdit: boolean;
  isTrialing: boolean;
  trialDaysLeft: number | null;
  isLoading: boolean;
  subscription: Record<string, unknown> | null;
}

export function useSubscription(): SubscriptionInfo {
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: subscription = null, isLoading } = useQuery({
    queryKey: ['subscription', session?.user?.id],
    enabled: !!session?.user?.id,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', session!.user.id)
        .maybeSingle();
      return data as Record<string, unknown> | null;
    },
  });

  const now = new Date();

  const trialEnd = subscription?.trial_end ? new Date(subscription.trial_end as string) : null;
  const isTrialingActive =
    subscription?.status === 'trialing' && trialEnd !== null && trialEnd > now;

  const canEdit =
    subscription?.status === 'active' ||
    isTrialingActive;

  const trialDaysLeft = isTrialingActive && trialEnd
    ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  return {
    canEdit: canEdit ?? false,
    isTrialing: !!isTrialingActive,
    trialDaysLeft,
    isLoading,
    subscription,
  };
}
