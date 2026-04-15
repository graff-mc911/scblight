import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

// --------------------------------------------------
// ГОЛОВНИЙ AUTH-ФАЙЛ
// Тут тепер:
// - login
// - signup
// - reset password
// - verify email
// - Google / Apple
// --------------------------------------------------
export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  // --------------------------------------------------
  // Режими форми
  // login | signup | reset | verify
  // --------------------------------------------------
  const [mode, setMode] = useState<'login' | 'signup' | 'reset' | 'verify'>('signup');

  // --------------------------------------------------
  // Стани форми
  // --------------------------------------------------
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // --------------------------------------------------
  // Додаткові згоди
  // --------------------------------------------------
  const [gdprConsent, setGdprConsent] = useState(false);
  const [termsConsent, setTermsConsent] = useState(false);

  // --------------------------------------------------
  // Стани інтерфейсу
  // --------------------------------------------------
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // --------------------------------------------------
  // Якщо відкрили /login — показуємо login режим
  // Якщо відкрили /signup — показуємо signup режим
  // --------------------------------------------------
  useEffect(() => {
    if (location.pathname === '/login') {
      setMode('login');
    } else if (location.pathname === '/signup') {
      setMode('signup');
    }
  }, [location.pathname]);

  // --------------------------------------------------
  // Якщо вже є сесія — на головну
  // --------------------------------------------------
  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('SESSION ERROR:', error);
        return;
      }

      if (data.session) {
        navigate('/');
      }
    };

    void checkSession();
  }, [navigate]);

  // --------------------------------------------------
  // Перевірка email
  // --------------------------------------------------
  const validateEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  // --------------------------------------------------
  // Перевірка пароля
  // --------------------------------------------------
  const validatePassword = (value: string) => {
    return value.length >= 8;
  };

  // --------------------------------------------------
  // Вхід
  // --------------------------------------------------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Введіть електронну пошту');
      return;
    }

    if (!validateEmail(normalizedEmail)) {
      setError('Невірний формат електронної пошти');
      return;
    }

    if (!password) {
      setError('Введіть пароль');
      return;
    }

    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      if (data.session) {
        navigate('/');
        return;
      }

      setError('Не вдалося увійти');
    } catch (err: any) {
      console.error('LOGIN ERROR:', err);
      setError(err?.message || 'Помилка входу');
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // Реєстрація
  // --------------------------------------------------
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Введіть електронну пошту');
      return;
    }

    if (!validateEmail(normalizedEmail)) {
      setError('Невірний формат електронної пошти');
      return;
    }

    if (!password) {
      setError('Введіть пароль');
      return;
    }

    if (!validatePassword(password)) {
      setError('Пароль повинен містити мінімум 8 символів');
      return;
    }

    if (password !== confirmPassword) {
      setError('Паролі не співпадають');
      return;
    }

    if (!gdprConsent || !termsConsent) {
      setError('Необхідно прийняти умови для продовження');
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            accepted_privacy_policy: true,
            accepted_terms: true,
            consent_timestamp: new Date().toISOString(),
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      // Якщо сесія є одразу — пускаємо в додаток
      if (data.session) {
        navigate('/');
        return;
      }

      // Якщо треба підтвердити email
      setMode('verify');
      setMessage('Перевірте електронну пошту для підтвердження реєстрації');
    } catch (err: any) {
      console.error('SIGNUP ERROR:', err);

      if (
        err?.message?.includes('already registered') ||
        err?.message?.includes('User already registered') ||
        err?.message?.includes('already been registered')
      ) {
        setError('Користувач з такою електронною поштою вже існує');
      } else {
        setError(err?.message || 'Помилка реєстрації');
      }
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // Скидання пароля
  // --------------------------------------------------
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Введіть електронну пошту');
      return;
    }

    if (!validateEmail(normalizedEmail)) {
      setError('Невірний формат електронної пошти');
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: window.location.origin,
      });

      if (resetError) {
        throw resetError;
      }

      setMessage('Інструкції для скидання пароля відправлені на пошту');
    } catch (err: any) {
      console.error('RESET ERROR:', err);
      setError(err?.message || 'Помилка відправлення листа');
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // Повторно відправити лист підтвердження
  // --------------------------------------------------
  const resendVerification = async () => {
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
      });

      if (resendError) {
        throw resendError;
      }

      setMessage('Лист відправлено');
    } catch (err: any) {
      console.error('RESEND ERROR:', err);
      setError(err?.message || 'Помилка повторної відправки');
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // Вхід через Google
  // --------------------------------------------------
  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (oauthError) {
        throw oauthError;
      }
    } catch (err: any) {
      console.error('GOOGLE LOGIN ERROR:', err);
      setError(err?.message || 'Google login failed');
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // Вхід через Apple
  // --------------------------------------------------
  const handleAppleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (oauthError) {
        throw oauthError;
      }
    } catch (err: any) {
      console.error('APPLE LOGIN ERROR:', err);
      setError(err?.message || 'Apple login failed');
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // Тексти
  // --------------------------------------------------
  const title =
    mode === 'login'
      ? t('login') || 'Вхід'
      : mode === 'signup'
      ? t('signup') || 'Створити обліковий запис'
      : mode === 'reset'
      ? 'Скинути пароль'
      : 'Підтвердіть вашу електронну пошту';

  const submitText =
    mode === 'login'
      ? t('login') || 'Увійти'
      : mode === 'signup'
      ? t('signup') || 'Зареєструватися'
      : 'Скинути пароль';

  const submitLoadingText =
    mode === 'login'
      ? 'Вхід...'
      : mode === 'signup'
      ? 'Реєстрація...'
      : 'Відправлення...';

  // --------------------------------------------------
  // Екран підтвердження email
  // --------------------------------------------------
  if (mode === 'verify') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#1a1f24]">
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-8">
            <Logo variant="glass" size="lg" className="mb-6" />
            <h1 className="text-xl font-semibold text-white mb-2">{title}</h1>
            <p className="text-sm text-white/60">
              Ми відправили лист для підтвердження на вашу пошту. Перейдіть за посиланням у листі, щоб активувати обліковий запис.
            </p>
          </div>

          {message && (
            <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
              <p className="text-sm text-green-400">{message}</p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <Button onClick={resendVerification} disabled={loading} className="w-full">
              {loading ? 'Відправлення...' : 'Відправити лист повторно'}
            </Button>

            <button
              type="button"
              onClick={() => {
                setMode('login');
                navigate('/login');
                setError('');
                setMessage('');
              }}
              className="w-full text-sm text-white/60 hover:text-orange-400 transition-colors"
            >
              Повернутися до входу
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#1a1f24]">
      <Card className="w-full max-w-md p-8">
        <div className="mb-8 flex flex-col items-center">
          <Logo variant="glass" size="lg" className="mb-6" />
          <h1 className="text-xl font-semibold text-white mb-2">{title}</h1>
          <p className="text-sm text-white/60 text-center">
            {mode === 'login'
              ? 'Увійдіть у свій обліковий запис'
              : mode === 'signup'
              ? 'Створіть новий обліковий запис'
              : 'Введіть email для відновлення доступу'}
          </p>
        </div>

        <form
          onSubmit={
            mode === 'login'
              ? handleLogin
              : mode === 'signup'
              ? handleSignup
              : handlePasswordReset
          }
          autoComplete="on"
          className="space-y-5"
        >
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {message && (
            <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
              <p className="text-sm text-green-400">{message}</p>
            </div>
          )}

          {/* EMAIL */}
          <div>
            <label className="block text-sm text-white/70 mb-2">
              {t('email') || 'Email'}
            </label>

            <input
              name="username"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              required
            />
          </div>

          {/* PASSWORD */}
          {mode !== 'reset' && (
            <div>
              <label className="block text-sm text-white/70 mb-2">
                {t('password') || 'Пароль'}
              </label>

              <input
                name={mode === 'signup' ? 'new-password' : 'password'}
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                required
              />
            </div>
          )}

          {/* CONFIRM PASSWORD */}
          {mode === 'signup' && (
            <div>
              <label className="block text-sm text-white/70 mb-2">
                {t('confirmPassword') || 'Підтвердіть пароль'}
              </label>

              <input
                name="confirm-new-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                required
              />
            </div>
          )}

          {/* GDPR + TERMS тільки для signup */}
          {mode === 'signup' && (
            <>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={gdprConsent}
                  onChange={(e) => setGdprConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-orange-500"
                />
                <span className="text-xs leading-relaxed text-white/60">
                  Я погоджуюся на обробку моїх персональних даних відповідно до{' '}
                  <a
                    href="/privacy-policy.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-400 underline"
                  >
                    Політики конфіденційності
                  </a>
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsConsent}
                  onChange={(e) => setTermsConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-orange-500"
                />
                <span className="text-xs leading-relaxed text-white/60">
                  Я приймаю{' '}
                  <a
                    href="/terms-of-service.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-400 underline"
                  >
                    Умови використання
                  </a>
                </span>
              </label>
            </>
          )}

          {/* FORGOT PASSWORD */}
          {mode === 'login' && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setMode('reset');
                  setError('');
                  setMessage('');
                }}
                className="text-sm text-orange-400 hover:text-orange-300 transition-colors"
              >
                Забули пароль?
              </button>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || (mode === 'signup' && (!gdprConsent || !termsConsent))}
            className="w-full"
          >
            {loading ? submitLoadingText : submitText}
          </Button>
        </form>

        {/* OAuth тільки для login і signup */}
        {mode !== 'reset' && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-[#1f2429] text-white/50">
                  Або продовжити з
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="flex items-center justify-center gap-2 py-3 px-4 border border-white/10 rounded-xl hover:bg-white/5 transition-all disabled:opacity-50"
              >
                <span className="text-sm font-medium text-white/80">Google</span>
              </button>

              <button
                type="button"
                onClick={handleAppleLogin}
                disabled={loading}
                className="flex items-center justify-center gap-2 py-3 px-4 border border-white/10 rounded-xl hover:bg-white/5 transition-all disabled:opacity-50"
              >
                <span className="text-sm font-medium text-white/80">Apple</span>
              </button>
            </div>
          </>
        )}

        {/* Нижні посилання */}
        <div className="mt-6 text-center">
          {mode === 'login' ? (
            <p className="text-sm text-white/60">
              {t('noAccount') || 'Немає облікового запису?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  navigate('/signup');
                  setError('');
                  setMessage('');
                }}
                className="text-orange-400 hover:text-orange-300 font-medium"
              >
                {t('signup') || 'Зареєструватися'}
              </button>
            </p>
          ) : mode === 'signup' ? (
            <p className="text-sm text-white/60">
              {t('haveAccount') || 'Вже є акаунт?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  navigate('/login');
                  setError('');
                  setMessage('');
                }}
                className="text-orange-400 hover:text-orange-300 font-medium"
              >
                {t('login') || 'Увійти'}
              </button>
            </p>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode('login');
                navigate('/login');
                setError('');
                setMessage('');
              }}
              className="text-sm text-orange-400 hover:text-orange-300 transition-colors"
            >
              Повернутися до входу
            </button>
          )}
        </div>
      </Card>
    </div>
  );
};