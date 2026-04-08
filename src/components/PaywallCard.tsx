import { useState } from 'react';
import { Check, Sparkles, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToastContext } from '../contexts/ToastContext';

type Plan = 'monthly' | 'yearly';

export default function PaywallCard() {
  const [selectedPlan, setSelectedPlan] = useState<Plan>('yearly');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { showError } = useToastContext();

  async function startCheckout() {
    try {
      setLoading(true);
      setErrorMsg(null);

      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

      const session = refreshError || !refreshData?.session
        ? (await supabase.auth.getSession()).data.session
        : refreshData.session;

      const accessToken = session?.access_token;
      if (!accessToken) {
        setErrorMsg('Please log in first.');
        showError('Please log in first.');
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
          body: JSON.stringify({ plan: selectedPlan }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const msg =
          data?.error ||
          data?.message ||
          `Request failed (${response.status}). Please try again.`;
        setErrorMsg(msg);
        showError(msg);
        console.error('Checkout error response:', response.status, data);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        const msg = 'No checkout URL received. Please try again.';
        setErrorMsg(msg);
        showError(msg);
      }
    } catch (error) {
      const msg = 'Checkout failed. Please check your connection and try again.';
      setErrorMsg(msg);
      showError(msg);
      console.error('Checkout exception:', error);
    } finally {
      setLoading(false);
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
          onClick={() => setSelectedPlan('monthly')}
          disabled={loading}
          className={`w-full rounded-xl border p-4 text-left transition-all disabled:opacity-50 relative ${
            selectedPlan === 'monthly'
              ? 'border-orange-500/60 bg-orange-500/10'
              : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-orange-500/30'
          }`}
        >
          {selectedPlan === 'monthly' && (
            <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
              <Check size={12} className="text-white" />
            </span>
          )}
          <div className="font-medium text-white">Monthly plan</div>
          <div className="text-sm text-white/50 mt-0.5">30 days free, then 5.00 € / month</div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedPlan('yearly')}
          disabled={loading}
          className={`w-full rounded-xl border p-4 text-left transition-all disabled:opacity-50 relative ${
            selectedPlan === 'yearly'
              ? 'border-orange-500/60 bg-orange-500/10'
              : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-orange-500/30'
          }`}
        >
          <span className="absolute top-3 right-3 flex items-center gap-1.5">
            {selectedPlan === 'yearly' && (
              <span className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                <Check size={12} className="text-white" />
              </span>
            )}
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-medium border border-orange-500/20">
              Save 17%
            </span>
          </span>
          <div className="font-medium text-white">Yearly plan</div>
          <div className="text-sm text-white/50 mt-0.5">30 days free, then 50.00 € / year</div>
        </button>
      </div>

      {errorMsg && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {errorMsg}
        </div>
      )}

      <button
        type="button"
        onClick={startCheckout}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <Zap size={16} />
        {loading ? 'Redirecting to payment...' : 'Start 30-day free trial'}
      </button>

      <p className="mt-3 text-xs text-white/30 text-center">
        Cancel anytime. Without an active subscription, the app stays in view-only mode.
      </p>
    </div>
  );
}
