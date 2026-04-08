import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Moon, Sun, Globe, LogOut, ArrowLeft, Trash2, AlertTriangle, Zap, Check, Crown, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { languages } from '../lib/languages';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const FEATURES = [
  'Необмежена кількість рахунків',
  'Необмежена кількість клієнтів',
  'Генерація PDF рахунків',
  'Сканер та OCR квитанцій',
  'Створення PDF документів',
  'Хмарна синхронізація',
  'Підпис на документах',
  'Мультимовний інтерфейс',
];

export default function Settings() {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<'monthly' | 'yearly' | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: subscription } = useQuery({
    queryKey: ['subscription', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', session!.user.id)
        .maybeSingle();
      return data;
    },
  });

  const now = new Date();
  const trialEnd = subscription?.trial_end ? new Date(subscription.trial_end as string) : null;
  const isTrialingActive = subscription?.status === 'trialing' && trialEnd !== null && trialEnd > now;
  const trialDaysLeftSettings = isTrialingActive && trialEnd
    ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : null;
  const isActive = subscription?.status === 'active' || isTrialingActive;

  const handleCheckout = async (plan: 'monthly' | 'yearly') => {
    if (!session) { navigate('/login'); return; }
    setCheckoutLoading(plan);
    setCheckoutError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setCheckoutError(data.error ?? 'Помилка створення сесії оплати');
        return;
      }
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch {
      setCheckoutError('Помилка з\'єднання. Спробуйте ще раз.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.toLowerCase() !== 'delete') return;
    setDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('invoices').delete().eq('user_id', user.id);
      await supabase.from('clients').delete().eq('user_id', user.id);
      await supabase.from('receipts').delete().eq('user_id', user.id);
      await supabase.from('company_profile').delete().eq('user_id', user.id);

      await supabase.auth.signOut();
      navigate('/login');
    } catch {
      setDeleting(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCanceling(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cancel-subscription`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${currentSession?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ['subscription'] });
        setShowCancelConfirm(false);
      }
    } finally {
      setCanceling(false);
    }
  };

  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const currentLanguage = languages.find(lang => lang.code === language) || languages[0];

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 md:px-6 max-w-4xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center justify-center p-2 bg-white/10 backdrop-blur-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/20 rounded-xl mb-6 transition-all active:scale-95"
        title={t('back') || 'Назад'}
      >
        <ArrowLeft className="h-4 w-4" />
      </button>

      <h1 className="text-2xl font-semibold text-white mb-6">
        {t('settings') || 'Налаштування'}
      </h1>

      <div className="space-y-4">
        <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-medium text-white mb-4">
            {t('appearance') || 'Зовнішній вигляд'}
          </h2>

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              {isDark ? <Moon className="h-5 w-5 text-white/70" /> : <Sun className="h-5 w-5 text-white/70" />}
              <div>
                <p className="font-medium text-white">
                  {t('theme') || 'Тема'}
                </p>
                <p className="text-sm text-white/60">
                  {isDark ? (t('darkTheme') || 'Темна тема') : (t('lightTheme') || 'Світла тема')}
                </p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/20 rounded-xl transition-all active:scale-95"
            >
              {isDark ? (t('switchToLight') || 'Світла') : (t('switchToDark') || 'Темна')}
            </button>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-orange-500/20 rounded-xl flex items-center justify-center">
              <Zap className="h-4 w-4 text-orange-400" />
            </div>
            <h2 className="text-lg font-medium text-white">SCB Light</h2>
          </div>

          {isActive ? (
            <div className="space-y-3">
              <div className={`flex items-center gap-3 py-3 px-4 rounded-xl border ${isTrialingActive ? 'bg-orange-500/10 border-orange-500/20' : 'bg-green-500/10 border-green-500/20'}`}>
                <Crown className={`h-5 w-5 shrink-0 ${isTrialingActive ? 'text-orange-400' : 'text-green-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm ${isTrialingActive ? 'text-orange-400' : 'text-green-400'}`}>
                    {isTrialingActive ? `Пробний період · ${trialDaysLeftSettings} ${trialDaysLeftSettings === 1 ? 'день' : trialDaysLeftSettings && trialDaysLeftSettings < 5 ? 'дні' : 'днів'}` : 'Підписка активна'}
                  </p>
                  <p className="text-white/50 text-xs mt-0.5">
                    {isTrialingActive ? 'Після закінчення потрібна підписка' : (subscription?.plan === 'yearly' ? 'Річний план' : 'Місячний план')}
                    {!isTrialingActive && subscription?.cancel_at_period_end && (
                      <span className="ml-1 text-orange-400"> · Скасовується в кінці періоду</span>
                    )}
                  </p>
                </div>
              </div>

              {!isTrialingActive && !subscription?.cancel_at_period_end && subscription?.stripe_subscription_id && (
                <>
                  {!showCancelConfirm ? (
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      className="w-full py-2.5 px-4 bg-white/5 border border-white/10 text-white/50 hover:text-white/80 hover:bg-white/10 transition-all rounded-xl text-sm active:scale-95"
                    >
                      Скасувати підписку
                    </button>
                  ) : (
                    <div className="space-y-3 p-4 bg-white/5 border border-white/10 rounded-xl">
                      <p className="text-sm text-white/70">
                        Підписка буде активна до кінця оплаченого періоду. Ви впевнені?
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowCancelConfirm(false)}
                          className="flex-1 py-2 px-4 bg-white/10 border border-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-all rounded-xl text-sm font-medium active:scale-95"
                        >
                          Ні, залишити
                        </button>
                        <button
                          onClick={handleCancelSubscription}
                          disabled={canceling}
                          className="flex-1 py-2 px-4 bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-xl text-sm font-medium active:scale-95"
                        >
                          {canceling ? 'Скасування...' : 'Так, скасувати'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-white/50 text-sm">
                Активна підписка відсутня. Отримайте доступ до всіх функцій.
              </p>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-2">
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {FEATURES.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-white/70">
                      <div className="shrink-0 w-4 h-4 rounded-full bg-orange-500/20 flex items-center justify-center">
                        <Check size={10} className="text-orange-400" />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              {checkoutError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-400 text-center">
                  {checkoutError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => handleCheckout('monthly')}
                  disabled={checkoutLoading !== null}
                  className="block text-left bg-white/10 border border-white/10 rounded-xl p-4 hover:bg-white/15 hover:border-white/20 transition-all group disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <p className="text-white/50 text-xs mb-0.5">Щомісяця</p>
                  <p className="text-xl font-bold text-white mb-0.5">
                    €5<span className="text-sm font-normal text-white/50">/міс</span>
                  </p>
                  <p className="text-white/30 text-xs mb-3">30 днів безкоштовно</p>
                  <div className="w-full py-2 bg-white/10 border border-white/10 rounded-lg text-center text-xs text-white/80 group-hover:bg-white/20 transition-all flex items-center justify-center gap-1.5">
                    {checkoutLoading === 'monthly' && <Loader2 size={12} className="animate-spin" />}
                    Розпочати
                  </div>
                </button>
                <button
                  onClick={() => handleCheckout('yearly')}
                  disabled={checkoutLoading !== null}
                  className="block text-left bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 hover:bg-orange-500/15 transition-all group relative disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full">
                    -17%
                  </div>
                  <p className="text-white/50 text-xs mb-0.5">Щорічно</p>
                  <p className="text-xl font-bold text-white mb-0.5">
                    €50<span className="text-sm font-normal text-white/50">/рік</span>
                  </p>
                  <p className="text-white/30 text-xs mb-3">€4.17/міс &bull; 30 днів безкоштовно</p>
                  <div className="w-full py-2 bg-orange-500 rounded-lg text-center text-xs text-white font-medium group-hover:bg-orange-600 transition-all flex items-center justify-center gap-1.5">
                    {checkoutLoading === 'yearly' && <Loader2 size={12} className="animate-spin" />}
                    Розпочати
                  </div>
                </button>
              </div>
              <p className="text-center text-white/30 text-xs">
                Скасувати можна будь-коли. Безпечна оплата через Stripe.
              </p>
            </div>
          )}
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-medium text-white mb-4">
            {t('legal') || 'Правова інформація'}
          </h2>

          <Link
            to="/privacy"
            className="flex items-center justify-between py-3 border-b border-white/10 hover:bg-white/5 transition-colors rounded-lg px-2"
          >
            <span className="text-white">
              {t('privacyPolicy') || 'Політика конфіденційності'}
            </span>
            <span className="text-white/40">›</span>
          </Link>

          <Link
            to="/terms"
            className="flex items-center justify-between py-3 hover:bg-white/5 transition-colors rounded-lg px-2"
          >
            <span className="text-white">
              {t('termsOfService') || 'Умови використання'}
            </span>
            <span className="text-white/40">›</span>
          </Link>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full py-3 px-4 bg-white/10 backdrop-blur-xl border border-white/10 text-red-400 hover:text-red-300 hover:bg-red-500/10 hover:border-red-500/20 transition-all rounded-xl active:scale-95"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">{t('logout') || 'Вийти'}</span>
          </button>
        </div>

        <div className="bg-red-500/5 backdrop-blur-xl border border-red-500/20 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <h2 className="text-lg font-medium text-red-400">
              {t('dangerZone') || 'Небезпечна зона'}
            </h2>
          </div>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-3 w-full py-3 px-4 bg-red-500/10 border border-red-500/30 text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-all rounded-xl active:scale-95"
            >
              <Trash2 className="h-5 w-5" />
              <span className="font-medium">{t('deleteAccount') || 'Видалити акаунт'}</span>
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-white/60">
                {t('deleteAccountWarning') || 'Ця дія незворотна. Усі ваші дані (рахунки, клієнти, квитанції) будуть видалені назавжди.'}
              </p>
              <p className="text-sm text-white/80">
                {t('deleteAccountConfirmPrompt') || 'Введіть "delete" для підтвердження:'}
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder='delete'
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-red-500/50 text-sm"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                  className="flex-1 py-2.5 px-4 bg-white/10 border border-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-all rounded-xl text-sm font-medium active:scale-95"
                >
                  {t('cancel') || 'Скасувати'}
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText.toLowerCase() !== 'delete' || deleting}
                  className="flex-1 py-2.5 px-4 bg-red-500/80 hover:bg-red-500 disabled:bg-red-500/30 disabled:cursor-not-allowed text-white transition-all rounded-xl text-sm font-medium active:scale-95"
                >
                  {deleting ? (t('deleting') || 'Видалення...') : (t('deleteAccount') || 'Видалити акаунт')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
