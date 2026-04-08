import { useState } from "react";
import { supabase } from "../lib/supabase";

type PaywallProps = {
  onUnlocked?: () => void;
};

export default function Paywall({ onUnlocked }: PaywallProps) {
  const [loadingPlan, setLoadingPlan] = useState<"monthly" | "yearly" | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const startCheckout = async (plan: "monthly" | "yearly") => {
    try {
      setError("");
      setLoadingPlan(plan);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;
      if (!session) throw new Error("User is not logged in.");

      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { plan },
      });

      if (error) {
        const detail = data?.error ?? error.message;
        throw new Error(detail);
      }
      if (!data?.url) throw new Error("Checkout URL not returned.");

      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || "Failed to start checkout.");
    } finally {
      setLoadingPlan(null);
    }
  };

  const checkSubscription = async () => {
    try {
      setError("");
      setChecking(true);

      const { data, error } = await supabase.functions.invoke("subscription-status");

      if (error) throw error;

      const status = data?.status;
      const unlocked = status === "active" || status === "trialing";

      if (unlocked) {
        onUnlocked?.();
      } else {
        setError("Subscription not active yet.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to verify subscription.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl shadow-2xl p-5">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold tracking-wide">Premium</h1>
          <p className="text-sm text-white/70 mt-1">
            Upgrade to full access. Start your 30-day free trial.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => startCheckout("monthly")}
            disabled={!!loadingPlan}
            className="w-full rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-4 text-left transition hover:bg-white/15"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-base font-medium">Monthly plan</div>
                <div className="text-sm text-white/70">
                  30 days free, then 5.00 € / month
                </div>
              </div>
              {loadingPlan === "monthly" && (
                <span className="text-sm text-orange-400">Loading...</span>
              )}
            </div>
          </button>

          <button
            onClick={() => startCheckout("yearly")}
            disabled={!!loadingPlan}
            className="w-full rounded-2xl border border-orange-400/20 bg-orange-500/10 backdrop-blur-xl p-4 text-left transition hover:bg-orange-500/15"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-base font-medium">Yearly plan</div>
                <div className="text-sm text-white/70">
                  30 days free, then 50.00 € / year
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-orange-400">Save 17%</div>
                {loadingPlan === "yearly" && (
                  <div className="text-sm text-orange-400">Loading...</div>
                )}
              </div>
            </div>
          </button>
        </div>

        <button
          onClick={checkSubscription}
          disabled={checking}
          className="mt-4 w-full rounded-2xl bg-gradient-to-r from-orange-500 to-orange-400 py-3 font-medium text-white shadow-lg transition hover:opacity-95"
        >
          {checking ? "Checking subscription..." : "I already subscribed"}
        </button>

        <p className="mt-4 text-xs text-white/50">
          Cancel anytime. Without an active subscription, the app stays in view-only mode.
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
