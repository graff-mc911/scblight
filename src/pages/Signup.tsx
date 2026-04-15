import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';

export const Signup: React.FC = () => {
  const navigate = useNavigate();

  // стани
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // якщо вже залогінений → на головну
  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) navigate('/');
    };
    check();
  }, []);

  // реєстрація
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Паролі не співпадають');
      return;
    }

    if (password.length < 6) {
      setError('Мінімум 6 символів');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Помилка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">

        <div className="mb-8 flex flex-col items-center">
          <Logo variant="glass" size="lg" className="mb-6" />
          <p className="text-sm text-white/60">
            Створити акаунт
          </p>
        </div>

        {/* ❗ ВАЖЛИВО: autocomplete="on" */}
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
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 outline-none focus:border-orange-500"
              required
            />
          </div>

          {/* PASSWORD */}
          <div>
            <label className="block text-sm text-white/70 mb-2">
              Пароль
            </label>

            <input
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-orange-500"
              required
            />
          </div>

          {/* CONFIRM PASSWORD */}
          <div>
            <label className="block text-sm text-white/70 mb-2">
              Підтвердіть пароль
            </label>

            <input
              name="confirm_password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-orange-500"
              required
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
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