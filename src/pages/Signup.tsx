import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';

export const Signup: React.FC = () => {
  const navigate = useNavigate();

  // Стан форми (звичайний, без магії)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Якщо вже залогінений → на головну
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate('/');
    });
  }, []);

  // Submit
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) return setError('Введіть email');
    if (!password) return setError('Введіть пароль');
    if (password !== confirmPassword) return setError('Паролі не співпадають');

    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Помилка реєстрації');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#1a1f24]">
      <Card className="w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <Logo variant="glass" size="lg" className="mb-4 mx-auto" />
          <h1 className="text-xl text-white font-semibold">Реєстрація</h1>
        </div>

        <form onSubmit={handleSignup} autoComplete="on" className="space-y-4">

          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}

          {/* EMAIL */}
          <input
            type="email"
            name="email"
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white"
            required
          />

          {/* PASSWORD */}
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white"
            required
          />

          {/* CONFIRM PASSWORD */}
          <input
            type="password"
            name="confirm_password"
            autoComplete="new-password"
            placeholder="Підтвердіть пароль"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white"
            required
          />

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Завантаження...' : 'Створити акаунт'}
          </Button>
        </form>

        <div className="mt-4 text-center text-white/60 text-sm">
          Вже маєш акаунт?{' '}
          <Link to="/login" className="text-orange-400">
            Увійти
          </Link>
        </div>
      </Card>
    </div>
  );
};