import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setError('');

    if (!email.trim()) {
      setError('Введіть email');
      return;
    }

    if (!password.trim()) {
      setError('Введіть пароль');
      return;
    }

    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#1a1f24]">
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <Logo variant="glass" size="lg" className="mb-6" />
          <h1 className="text-xl font-semibold text-white mb-2">
            {t('login') || 'Увійти'}
          </h1>
          <p className="text-white/60 text-sm text-center">
            {t('loginTitle') || 'Увійдіть у свій обліковий запис'}
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <Input
            type="email"
            label={t('email') || 'Email'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
          />

          <Input
            type="password"
            label={t('password') || 'Пароль'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (t('loading') || 'Завантаження') + '...' : t('login') || 'Увійти'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-white/60">
            {t('noAccount') || 'Немає облікового запису?'}{' '}
            <Link to="/signup" className="text-orange-400 hover:text-orange-300 font-medium">
              {t('signup') || 'Зареєструватися'}
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};