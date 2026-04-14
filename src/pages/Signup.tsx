import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

// ============================================
// СТАНДАРТНА ФОРМА РЕЄСТРАЦІЇ
// Поля:
// - Email
// - Пароль
// - Підтвердіть пароль
//
// Це навмисно проста і "чиста" форма:
// - без прихованих полів
// - без примусового автозаповнення
// - без хаків під браузер
//
// Саме такий варіант найближчий до стандартного signup.
// ============================================

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  // --------------------------------------------
  // refs на input
  // Використовуємо ref, щоб браузерне автозаповнення
  // не конфліктувало з React state.
  // --------------------------------------------
  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const confirmPasswordRef = useRef<HTMLInputElement | null>(null);

  // --------------------------------------------
  // Стани інтерфейсу
  // --------------------------------------------
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // --------------------------------------------
  // Якщо користувач уже увійшов — перекидаємо
  // на головну сторінку
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
  // Реєстрація нового користувача
  // --------------------------------------------
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Читаємо значення напряму з полів
    const email = emailRef.current?.value?.trim().toLowerCase() || '';
    const password = passwordRef.current?.value || '';
    const confirmPassword = confirmPasswordRef.current?.value || '';

    // --------------------------------------------
    // Валідація форми
    // --------------------------------------------
    if (!email) {
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
      // --------------------------------------------
      // Створення акаунта в Supabase
      // --------------------------------------------
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        throw signUpError;
      }

      // Якщо користувач успішно створений —
      // переходимо на сторінку входу
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
  // Базовий стиль для полів
  // --------------------------------------------
  const inputClassName =
    'block w-full rounded-xl border border-white/10 bg-white/5 px-4 pr-12 py-3.5 text-base text-white placeholder-white/40 outline-none transition-all focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20';

  // --------------------------------------------
  // Стиль кнопки показати / сховати пароль
  // --------------------------------------------
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

        {/* Форма реєстрації */}
        <form onSubmit={handleSignup} className="space-y-5" autoComplete="on">
          {/* Блок помилки */}
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/20 p-3">
              <p className="text-sm text-red-400 break-words">{error}</p>
            </div>
          )}

          {/* Email */}
          <div>
            <label htmlFor="signup-email" className="mb-2 block text-sm text-white/70">
              {t('email') || 'Email'}
            </label>

            <input
              ref={emailRef}
              id="signup-email"
              name="email"
              type="email"
              className={inputClassName}
              placeholder="your@email.com"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
            />
          </div>

          {/* Пароль */}
          <div>
            <label htmlFor="signup-password" className="mb-2 block text-sm text-white/70">
              {t('password') || 'Пароль'}
            </label>

            <div className="relative">
              <input
                ref={passwordRef}
                id="signup-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className={inputClassName}
                placeholder="••••••••"
                autoComplete="new-password"
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

          {/* Підтвердіть пароль */}
          <div>
            <label
              htmlFor="signup-confirm-password"
              className="mb-2 block text-sm text-white/70"
            >
              {t('confirmPassword') || 'Підтвердіть пароль'}
            </label>

            <div className="relative">
              <input
                ref={confirmPasswordRef}
                id="signup-confirm-password"
                name="confirm_password"
                type={showConfirmPassword ? 'text' : 'password'}
                className={inputClassName}
                placeholder="••••••••"
                autoComplete="new-password"
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

          {/* Кнопка створення акаунта */}
          <Button type="submit" disabled={loading} className="w-full">
            {loading
              ? `${t('loading') || 'Завантаження'}...`
              : t('signup') || 'Зареєструватися'}
          </Button>
        </form>

        {/* Посилання на вхід */}
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