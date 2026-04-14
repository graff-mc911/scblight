import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

// ============================================
// Стандартна форма реєстрації
// Поля:
// - Email
// - Пароль
// - Підтвердіть пароль
//
// Мета:
// - максимально дружня до Safari / iPhone / Keychain
// - другий пароль не прибираємо
// - якщо пароль автопідставився в перше поле,
//   друге поле автоматично копіює це значення
// ============================================

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  // --------------------------------------------
  // Стани форми
  // --------------------------------------------
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // --------------------------------------------
  // Стани видимості паролів
  // --------------------------------------------
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // --------------------------------------------
  // Стани інтерфейсу
  // --------------------------------------------
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // --------------------------------------------
  // Чи користувач уже вручну редагував другий пароль
  // Якщо ні — тримаємо його синхронізованим з першим
  // --------------------------------------------
  const [confirmTouched, setConfirmTouched] = useState(false);

  // --------------------------------------------
  // Якщо користувач уже увійшов — перекидаємо на /
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
  // Автосинхронізація другого пароля
  // Потрібно для iPhone / Safari / Keychain:
  // якщо пароль вставився лише в перше поле,
  // друге поле підтягнеться саме.
  // --------------------------------------------
  useEffect(() => {
    if (!confirmTouched) {
      setConfirmPassword(password);
    }
  }, [password, confirmTouched]);

  // --------------------------------------------
  // Реєстрація
  // --------------------------------------------
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Введіть email');
      return;
    }

    if (!password) {
      setError('Введіть пароль');
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

    if (password.length < 6) {
      setError('Пароль має містити мінімум 6 символів');
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
  // Стиль інпутів
  // pr-12 залишає місце справа під кнопку "око"
  // --------------------------------------------
  const inputClassName =
    'block w-full min-w-0 box-border rounded-xl border border-white/10 bg-white/5 px-4 pr-12 py-3.5 text-base leading-6 text-white placeholder-white/40 outline-none transition-all focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20';

  const eyeButtonClassName =
    'absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white/80 transition-colors';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#1a1f24]">
      <Card className="w-full max-w-md p-8 overflow-hidden">
        {/* Верхній блок */}
        <div className="mb-8 flex flex-col items-center">
          <Logo variant="glass" size="lg" className="mb-6" />

          <h1 className="text-xl font-semibold text-white mb-2">
            {t('signup') || 'Реєстрація'}
          </h1>

          <p className="text-sm text-white/60 text-center">
            {t('createAccount') || 'Створіть обліковий запис'}
          </p>
        </div>

        {/* --------------------------------------------
            Форма
            autoComplete="on" залишаємо ввімкненим,
            щоб Keychain міг працювати максимально повно.
        -------------------------------------------- */}
        <form onSubmit={handleSignup} className="space-y-5" autoComplete="on">
          {/* --------------------------------------------
              Приховане технічне поле для деяких менеджерів паролів.
              Не чіпай його.
          -------------------------------------------- */}
          <input
            type="email"
            name="username"
            autoComplete="username"
            value={email}
            readOnly
            tabIndex={-1}
            aria-hidden="true"
            className="hidden"
          />

          {/* Помилка */}
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/20 p-3">
              <p className="text-sm text-red-400 break-words">{error}</p>
            </div>
          )}

          {/* Email */}
          <div className="w-full min-w-0">
            <label htmlFor="signup-email" className="mb-2 block text-sm text-white/70">
              {t('email') || 'Email'}
            </label>

            <input
              id="signup-email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClassName}
              placeholder="your@email.com"
              autoComplete="email"
              inputMode="email"
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
              required
            />
          </div>

          {/* Пароль */}
          <div className="w-full min-w-0">
            <label htmlFor="signup-password" className="mb-2 block text-sm text-white/70">
              {t('password') || 'Пароль'}
            </label>

            <div className="relative">
              <input
                id="signup-password"
                name="new-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                }}
                onInput={(e) => {
                  const value = (e.target as HTMLInputElement).value;
                  setPassword(value);

                  // Якщо друге поле ще не чіпали,
                  // одразу дублюємо пароль туди
                  if (!confirmTouched) {
                    setConfirmPassword(value);
                  }
                }}
                className={inputClassName}
                placeholder="••••••••"
                autoComplete="new-password"
                passwordRules="minlength: 6;"
                spellCheck={false}
                autoCapitalize="none"
                autoCorrect="off"
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className={eyeButtonClassName}
                aria-label={showPassword ? 'Сховати пароль' : 'Показати пароль'}
                title={showPassword ? 'Сховати пароль' : 'Показати пароль'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Підтвердження пароля */}
          <div className="w-full min-w-0">
            <label
              htmlFor="signup-confirm-password"
              className="mb-2 block text-sm text-white/70"
            >
              {t('confirmPassword') || 'Підтвердіть пароль'}
            </label>

            <div className="relative">
              <input
                id="signup-confirm-password"
                name="confirm-new-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmTouched(true);
                  setConfirmPassword(e.target.value);
                }}
                onInput={(e) => {
                  setConfirmTouched(true);
                  setConfirmPassword((e.target as HTMLInputElement).value);
                }}
                onFocus={() => {
                  // Якщо Safari вставив пароль тільки в перше поле,
                  // а друге ще пусте — підтягнемо його
                  if (!confirmTouched && password && !confirmPassword) {
                    setConfirmPassword(password);
                  }
                }}
                className={inputClassName}
                placeholder="••••••••"
                autoComplete="new-password"
                passwordRules="minlength: 6;"
                spellCheck={false}
                autoCapitalize="none"
                autoCorrect="off"
                required
              />

              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className={eyeButtonClassName}
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

          {/* Кнопка */}
          <Button type="submit" disabled={loading} className="w-full">
            {loading
              ? `${t('loading') || 'Завантаження'}...`
              : t('signup') || 'Зареєструватися'}
          </Button>
        </form>

        {/* Перехід на логін */}
        <div className="mt-6 text-center">
          <p className="text-sm text-white/60">
            {t('haveAccount') || 'Вже маєте обліковий запис?'}{' '}
            <Link to="/login" className="font-medium text-orange-400 hover:text-orange-300">
              {t('login') || 'Увійти'}
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};