import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/Logo';

// --------------------------------------------------
// ПРОСТА І СТАБІЛЬНА СТОРІНКА РЕЄСТРАЦІЇ
// Потрібна для швидкого відновлення додатка,
// щоб Vite знову зібрав проект без білого екрана.
// --------------------------------------------------
export const Signup: React.FC = () => {
  const navigate = useNavigate();

  // Стани форми
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Стани інтерфейсу
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Якщо користувач уже увійшов — перекидаємо на головну
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

  // Реєстрація через email + пароль
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
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      });

      if (error) {
        throw error;
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#1a1f24]">
      <Card className="w-full max-w-md p-8">
        <div className="mb-8 flex flex-col items-center">
          <Logo variant="glass" size="lg" className="mb-6" />
          <h1 className="text-xl font-semibold text-white mb-2">Реєстрація</h1>
          <p className="text-sm text-white/60">Створіть новий обліковий запис</p>
        </div>

        <form onSubmit={handleSignup} autoComplete="on" className="space-y-5">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/20 p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm text-white/70">Email</label>
            <input
              type="email"
              name="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-white/70">Пароль</label>
            <input
              type="password"
              name="new-password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20"
              placeholder="••••••••"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-white/70">Підтвердіть пароль</label>
            <input
              type="password"
              name="confirm-new-password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20"
              placeholder="••••••••"
              required
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Завантаження...' : 'Зареєструватися'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-white/60">
            Вже є акаунт?{' '}
            <Link to="/login" className="font-medium text-orange-400 hover:text-orange-300">
              Увійти
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};