import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

// ============================================
// Проста сторінка реєстрації
// Поля:
// - Email
// - Пароль
// - Повторіть пароль
//
// Додатково:
// - кнопки показати / сховати пароль
// - правильні autocomplete для Safari / iPhone
// ============================================

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

    const normalizedEmail = email.trim().toLowerCase();

    // Перевірка email
    if (!normalizedEmail) {
      setError('Введіть email');
      return;
    }

    // Перевірка пароля
    if (!password) {
      setError('Введіть пароль');
      return;
    }

    // Перевірка повтору пароля
    if (!confirmPassword) {
      setError('Повторіть пароль');
      return;
    }

    // Паролі повинні збігатися
    if (password !== confirmPassword) {
      setError('Паролі не співпадають');
      return;
    }

    // Мінімальна довжина пароля
    if (password.length < 6) {
      setError('Пароль має містити мінімум 6 символів');
      return;
    }

    setLoading(true);

    try {
      // Реєстрація через Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      });

      if (signUpError) {
        throw signUpError;
      }

      // Якщо користувач створений — переходимо на сторінку входу
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
  // Базовий стиль для інпутів
  // pr-12 залишає місце справа під кнопку ока
  // --------------------------------------------
  const inputClassName =
    'block w-full min-w-0 box-border rounded-xl border border-white/10 bg-white/5 px-4 pr-12 py-3.5 text-base leading-6 text-white placeholder-white/40 outline-none transition-all focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20';

  // --------------------------------------------
  // Стиль для кнопки "око"
  // --------------------------------------------
  const eyeButtonClassName =
    'absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white/80 transition-colors';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#1a1f24]">
      <Card className="w-full max-w-md p-8 overflow-hidden">
        {/* --------------------------------------------
            Верхній блок: логотип і заголовок
        -------------------------------------------- */}
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
            Форма реєстрації
        -------------------------------------------- */}
        <form onSubmit={handleSignup} className="space-y-5">
          {/* Блок помилки */}
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/20 p-3">
              <p className="text-sm text-red-400 break-words">{error}</p>
            </div>
          )}

          {/* --------------------------------------------
              Поле Email
          -------------------------------------------- */}
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
              autoComplete="username"
              inputMode="email"
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
              required
            />
          </div>

          {/* --------------------------------------------
              Поле Пароль
          -------------------------------------------- */}
          <div className="w-full min-w-0">
            <label htmlFor="signup-password" className="mb-2 block text-sm text-white/70">
              {t('password') || 'Пароль'}
            </label>

            <div className="relative">
              <input
                id="signup-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

          {/* --------------------------------------------
              Поле Повторіть пароль
          -------------------------------------------- */}
          <div className="w-full min-w-0">
            <label
              htmlFor="signup-confirm-password"
              className="mb-2 block text-sm text-white/70"
            >
              {t('confirmPassword') || 'Повторіть пароль'}
            </label>

            <div className="relative">
              <input
                id="signup-confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                  showConfirmPassword ? 'Сховати підтвердження пароля' : 'Показати підтвердження пароля'
                }
                title={
                  showConfirmPassword ? 'Сховати підтвердження пароля' : 'Показати підтвердження пароля'
                }
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* --------------------------------------------
              Кнопка реєстрації
          -------------------------------------------- */}
          <Button type="submit" disabled={loading} className="w-full">
            {loading
              ? `${t('loading') || 'Завантаження'}...`
              : t('signup') || 'Зареєструватися'}
          </Button>
        </form>

        {/* --------------------------------------------
            Перехід на сторінку входу
        -------------------------------------------- */}
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