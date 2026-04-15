import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';

// --------------------------------------------------
// Сторінка реєстрації.
// Побудована в тому самому стилі, що й Login,
// щоб не було конфлікту між формами.
// Тут також використані звичайні HTML input,
// а не кастомний Input компонент.
// --------------------------------------------------
export const Signup: React.FC = () => {
  const navigate = useNavigate();

  // --------------------------------------------
  // Стани полів форми
  // --------------------------------------------
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // --------------------------------------------
  // Додаткові згоди
  // Взяті з твого робочого Auth.jsx
  // --------------------------------------------
  const [gdprConsent, setGdprConsent] = useState(false);
  const [termsConsent, setTermsConsent] = useState(false);

  // --------------------------------------------
  // Стани інтерфейсу
  // --------------------------------------------
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // --------------------------------------------
  // Якщо вже залогінений — на головну
  // --------------------------------------------
  useEffect(() => {
    const check = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('SESSION ERROR:', error);
        return;
      }

      if (data.session) {
        navigate('/');
      }
    };

    void check();
  }, [navigate]);

  // --------------------------------------------
  // Перевірка email
  // --------------------------------------------
  const validateEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

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

    if (!validateEmail(normalizedEmail)) {
      setError('Невірний формат електронної пошти');
      return;
    }

    if (!password) {
      setError('Введіть пароль');
      return;
    }

    if (password.length < 8) {
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
      const { data, error } = await supabase.auth.signUp({
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

      if (error) {
        throw error;
      }

      if (data.user) {
        navigate('/login');
        return;
      }

      setError('Помилка реєстрації');
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#1a1f24]">
      <Card className="w-full max-w-md p-8">
        <div className="mb-8 flex flex-col items-center">
          <Logo variant="glass" size="lg" className="mb-6" />
          <p className="text-sm text-white/60">
            Створити акаунт
          </p>
        </div>

        {/* 
          ВАЖЛИВО:
          Це signup-форма.
          Тут email має бути username,
          а паролі — new-password.
        */}
        <form onSubmit={handleSignup} autoComplete="on" className="space-y-5">
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* EMAIL */}
          <div>
            <label className="block text-sm text-white/70 mb-2">
              Email
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
          <div>
            <label className="block text-sm text-white/70 mb-2">
              Пароль
            </label>

            <input
              name="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              required
            />
          </div>

          {/* CONFIRM PASSWORD */}
          <div>
            <label className="block text-sm text-white/70 mb-2">
              Підтвердіть пароль
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

          {/* GDPR */}
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

          {/* TERMS */}
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

          <Button type="submit" disabled={loading || !gdprConsent || !termsConsent} className="w-full">
            {loading ? 'Завантаження...' : 'Зареєструватися'}
          </Button>
        </form>

        {/* ПЕРЕХІД НА ЛОГІН */}
        <div className="mt-6 text-center">
          <p className="text-sm text-white/60">
            Вже є акаунт?{' '}
            <Link to="/login" className="text-orange-400 hover:text-orange-300">
              Увійти
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};