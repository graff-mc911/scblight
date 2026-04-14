import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

// ============================================
// Преміум стандартна сторінка реєстрації
// Поля:
// - Email
// - Пароль
// - Підтвердіть пароль
//
// Без нестандартних хаків.
// Максимально чиста й стабільна форма.
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
  // Валідація email
  // --------------------------------------------
  const isValidEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  // --------------------------------------------
  // Submit форми
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
  // Стилі
  // --------------------------------------------
  const inputBaseClass =
    'w-full rounded-2xl border border-white/10 bg-white/5 pl-11 pr-12 py-3.5 text-white placeholder-white/35 outline-none transition-all focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20';

  const iconClass =
    'absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none';

  const eyeButtonClass =
    'absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-white/35 hover:text-white/70 hover:bg-white/5 transition-all';

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

        {/* Форма */}
        <form onSubmit={handleSignup} autoComplete="on" className="space-y-4">
          {/* Помилка */}
          {error && (
            <div className="flex items-start gap-2 rounded-2xl border border-red-500/25 bg-red-500/15 px-4 py-3">
              <AlertCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Email */}
          <div>
            <label
              htmlFor="signup-email"
              className="block text-sm text-white/70 mb-2"
            >
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
            <label
              htmlFor="signup-password"
              className="block text-sm text-white/70 mb-2"
            >
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

          {/* Підтвердіть пароль */}
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

          {/* Кнопка */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl py-3.5 text-base font-semibold"
          >
            {loading ? 'Завантаження...' : 'Створити обліковий запис'}
          </Button>
        </form>

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