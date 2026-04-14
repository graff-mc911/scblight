import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

// ============================================
// ПОВНА СТАНДАРТНА ФОРМА РЕЄСТРАЦІЇ
// Варіанти:
// 1. Email + пароль
// 2. Google
// 3. Apple
//
// Коментарі українською мовою.
// Без нестандартних хаків.
// ============================================

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.24 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.851 1.154 7.971 3.043l5.657-5.657C34.053 6.053 29.27 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 16.108 18.961 12 24 12c3.059 0 5.851 1.154 7.971 3.043l5.657-5.657C34.053 6.053 29.27 4 24 4c-7.682 0-14.347 4.337-17.694 10.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.168 0 9.86-1.977 13.409-5.197l-6.19-5.238C29.154 35.091 26.715 36 24 36c-5.219 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.5 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.084 5.565l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.455 2.223-1.215 3.035-.827.88-2.18 1.557-3.35 1.462-.146-1.099.39-2.277 1.137-3.08.782-.846 2.123-1.49 3.428-1.417zM20.53 17.174c-.57 1.287-.835 1.86-1.57 2.99-1.026 1.57-2.475 3.53-4.27 3.544-1.595.013-2.005-1.04-4.17-1.028-2.165.012-2.614 1.048-4.21 1.035-1.794-.014-3.167-1.784-4.193-3.353C-.285 17.21-1.654 11.505.57 8.05c1.58-2.454 4.075-3.89 6.42-3.89 2.39 0 3.893 1.04 5.867 1.04 1.915 0 3.082-1.041 5.847-1.041 2.09 0 4.307 1.137 5.883 3.1-5.177 2.838-4.336 10.216.943 12.915z" />
    </svg>
  );
}

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  // --------------------------------------------
  // Стани полів форми
  // --------------------------------------------
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // --------------------------------------------
  // Стани інтерфейсу
  // --------------------------------------------
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);

  // --------------------------------------------
  // Якщо користувач уже авторизований
  // перекидаємо на головну сторінку
  // --------------------------------------------
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

  // --------------------------------------------
  // Проста перевірка email
  // --------------------------------------------
  const isValidEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  // --------------------------------------------
  // Реєстрація через email + пароль
  // --------------------------------------------
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Введіть email');
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setError('Введіть коректний email');
      return;
    }

    if (!password) {
      setError('Введіть пароль');
      return;
    }

    if (password.length < 6) {
      setError('Пароль має містити мінімум 6 символів');
      return;
    }

    if (!confirmPassword) {
      setError('Підтвердіть пароль');
      return;
    }

    if (password !== confirmPassword) {
      setError('Паролі не співпадають');
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      });

      if (signUpError) {
        throw signUpError;
      }

      if (data.user) {
        navigate('/login');
        return;
      }

      setError('Не вдалося створити обліковий запис');
    } catch (err: any) {
      console.error('SIGNUP ERROR:', err);
      setError(err?.message || 'Помилка реєстрації');
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------
  // Реєстрація / вхід через Google або Apple
  // --------------------------------------------
  const handleOAuthSignup = async (provider: 'google' | 'apple') => {
    setError('');
    setOauthLoading(provider);

    try {
      const redirectTo = `${window.location.origin}/`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
        },
      });

      if (error) {
        throw error;
      }
    } catch (err: any) {
      console.error(`${provider.toUpperCase()} OAUTH ERROR:`, err);
      setError(err?.message || `Помилка входу через ${provider}`);
      setOauthLoading(null);
    }
  };

  // --------------------------------------------
  // Стилі інпутів і кнопок
  // --------------------------------------------
  const inputBaseClass =
    'w-full rounded-2xl border border-white/10 bg-white/5 pl-11 pr-12 py-3.5 text-white placeholder-white/35 outline-none transition-all focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20';

  const iconClass =
    'absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none';

  const eyeButtonClass =
    'absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-white/35 hover:text-white/70 hover:bg-white/5 transition-all';

  const oauthButtonClass =
    'w-full flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-white hover:bg-white/8 transition-all disabled:opacity-60';

  return (
    <div className="min-h-screen bg-[#1a1f24] flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-white/5 border border-white/10 shadow-2xl rounded-3xl">
        {/* Верхній блок */}
        <div className="flex flex-col items-center mb-8">
          <Logo variant="glass" size="lg" className="mb-5" />

          <h1 className="text-2xl font-semibold text-white mb-2">
            {t('signup') || 'Реєстрація'}
          </h1>

          <p className="text-sm text-white/55 text-center">
            {t('createAccount') || 'Створіть новий обліковий запис'}
          </p>
        </div>

        {/* Форма email + пароль */}
        <form onSubmit={handleSignup} autoComplete="on" className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-2xl border border-red-500/25 bg-red-500/15 px-4 py-3">
              <AlertCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Email */}
          <div>
            <label htmlFor="signup-email" className="block text-sm text-white/70 mb-2">
              {t('email') || 'Email'}
            </label>

            <div className="relative">
              <Mail size={18} className={iconClass} />
              <input
                id="signup-email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputBaseClass}
                placeholder="your@email.com"
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
              />
            </div>
          </div>

          {/* Пароль */}
          <div>
            <label htmlFor="signup-password" className="block text-sm text-white/70 mb-2">
              {t('password') || 'Пароль'}
            </label>

            <div className="relative">
              <Lock size={18} className={iconClass} />
              <input
                id="signup-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputBaseClass}
                placeholder="••••••••"
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className={eyeButtonClass}
                aria-label={showPassword ? 'Сховати пароль' : 'Показати пароль'}
                title={showPassword ? 'Сховати пароль' : 'Показати пароль'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Підтвердження пароля */}
          <div>
            <label
              htmlFor="signup-confirm-password"
              className="block text-sm text-white/70 mb-2"
            >
              {t('confirmPassword') || 'Підтвердіть пароль'}
            </label>

            <div className="relative">
              <Lock size={18} className={iconClass} />
              <input
                id="signup-confirm-password"
                name="confirm_password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputBaseClass}
                placeholder="••••••••"
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
              />

              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className={eyeButtonClass}
                aria-label={
                  showConfirmPassword
                    ? 'Сховати підтвердження пароля'
                    : 'Показати підтвердження пароля'
                }
                title={
                  showConfirmPassword
                    ? 'Сховати підтвердження пароля'
                    : 'Показати підтвердження пароля'
                }
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Кнопка реєстрації */}
          <Button
            type="submit"
            disabled={loading || !!oauthLoading}
            className="w-full rounded-2xl py-3.5 text-base font-semibold"
          >
            {loading ? 'Завантаження...' : 'Створити обліковий запис'}
          </Button>
        </form>

        {/* Розділювач */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs uppercase tracking-wider text-white/35">або</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        {/* Google */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => handleOAuthSignup('google')}
            disabled={loading || !!oauthLoading}
            className={oauthButtonClass}
          >
            <GoogleIcon />
            <span>
              {oauthLoading === 'google'
                ? 'Переадресація...'
                : 'Зареєструватися через Google'}
            </span>
          </button>

          {/* Apple */}
          <button
            type="button"
            onClick={() => handleOAuthSignup('apple')}
            disabled={loading || !!oauthLoading}
            className={oauthButtonClass}
          >
            <AppleIcon />
            <span>
              {oauthLoading === 'apple'
                ? 'Переадресація...'
                : 'Зареєструватися через Apple'}
            </span>
          </button>
        </div>

        {/* Низ */}
        <div className="mt-6 text-center">
          <p className="text-sm text-white/55">
            {t('haveAccount') || 'Вже маєте обліковий запис?'}{' '}
            <Link
              to="/login"
              className="text-orange-400 hover:text-orange-300 font-medium"
            >
              {t('login') || 'Увійти'}
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};