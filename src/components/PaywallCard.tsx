import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Sparkles, Zap } from 'lucide-react';

type Plan = 'monthly' | 'yearly';

export default function PaywallCard() {
  const [loadingPlan, setLoadingPlan] = useState<Plan | null>(null);

  async function startCheckout(plan: Plan) {
    try {
      setLoadingPlan(plan);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;
      if (!accessToken) {
        alert('Please log in first.');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ plan }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error(data);
        alert(data?.error || 'Failed to create checkout session');
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error(error);
      alert('Checkout failed');
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="bg-white/6 border border-white/10 rounded-2xl p-6 max-w-md mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
          <Sparkles size={16} className="text-orange-400" />
        </div>
        <h2 className="text-lg font-semibold text-white">Upgrade to full access</h2>
      </div>
      <p className="text-sm text-white/50 mb-6">
        Start your 30-day free trial. Then continue with a monthly or yearly subscription.
      </p>

      <div className="space-y-3 mb-6">
        <button
          type="button"
          onClick={() => startCheckout('monthly')}
          disabled={loadingPlan !== null}
          className="w-full rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-orange-500/30 p-4 text-left transition-all active:scale-98 disabled:opacity-50"
        >
          <div className="font-medium text-white">Monthly plan</div>
          <div className="text-sm text-white/50 mt-0.5">30 days free, then 5.00 € / month</div>
          {loadingPlan === 'monthly' && (
            <div className="mt-2 text-xs text-orange-400">Redirecting...</div>
          )}
        </button>

        <button
          type="button"
          onClick={() => startCheckout('yearly')}
          disabled={loadingPlan !== null}
          className="w-full rounded-xl border border-orange-500/30 bg-orange-500/8 hover:bg-orange-500/15 p-4 text-left transition-all active:scale-98 disabled:opacity-50 relative"
        >
          <span className="absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-medium border border-orange-500/20">
            Save 17%
          </span>
          <div className="font-medium text-white">Yearly plan</div>
          <div className="text-sm text-white/50 mt-0.5">30 days free, then 50.00 € / year</div>
          {loadingPlan === 'yearly' && (
            <div className="mt-2 text-xs text-orange-400">Redirecting...</div>
          )}
        </button>
      </div>

      <button
        onClick={() => startCheckout('monthly')}
        disabled={loadingPlan !== null}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium transition-all active:scale-95 disabled:opacity-50"
      >
        <Zap size={16} />
        {loadingPlan ? 'Loading...' : 'Start 30-day free trial'}
      </button>

      <p className="mt-3 text-xs text-white/30 text-center">
        Cancel anytime. Without an active subscription, the app stays in view-only mode.
      </p>
    </div>
  );
}
