import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/Logo';

// --------------------------------------------------
// ПРОСТА І СТАБІЛЬНА СТОРІНКА ВХОДУ
// Потрібна, щоб App.tsx знову зібрався без помилок
// і додаток перестав показувати білий екран.
// --------------------------------------------------
export const Login: React.FC = () => {
  const navigate = useNavigate();

  // Стани форми
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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

  // Вхід через email + пароль
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Введіть email');
      return;
    }

    if (!password) {
      setError('Введіть пароль');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#1a1f24]">
      <Card className="w-full max-w-md p-8">
        <div className="mb-8 flex flex-col items-center">
          <Logo variant="glass" size="lg" className="mb-6" />
          <h1 className="text-xl font-semibold text-white mb-2">Вхід</h1>
          <p className="text-sm text-white/60">Увійдіть у свій обліковий запис</p>
        </div>

        <form onSubmit={handleLogin} autoComplete="on" className="space-y-5">
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
              autoComplete="email"
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
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20"
              placeholder="••••••••"
              required
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Завантаження...' : 'Увійти'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-white/60">
            Немає акаунту?{' '}
            <Link to="/signup" className="font-medium text-orange-400 hover:text-orange-300">
              Зареєструватися
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};