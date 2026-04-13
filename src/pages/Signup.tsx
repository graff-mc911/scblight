import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

// Компонент сторінки реєстрації
export const Signup: React.FC = () => {
  const navigate = useNavigate(); // хук для навігації
  const { t } = useLanguage(); // переклади

  // Стан форми
  const [fullName, setFullName] = useState(''); // повне ім'я
  const [email, setEmail] = useState(''); // email
  const [password, setPassword] = useState(''); // пароль
  const [confirmPassword, setConfirmPassword] = useState(''); // підтвердження пароля
  const [acceptedTerms, setAcceptedTerms] = useState(false); // чи прийняті умови
  const [error, setError] = useState(''); // помилка
  const [loading, setLoading] = useState(false); // стан завантаження

  // Перевірка: якщо користувач вже залогінений — редірект на головну
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) navigate('/');
    };
    void checkSession();
  }, [navigate]);

  // Обробник сабміту форми
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault(); // відміняємо стандартну поведінку форми
    setError(''); // очищаємо помилку

    // Нормалізація даних
    const normalizedFullName = fullName.trim(); // прибираємо пробіли
    const normalizedEmail = email.trim().toLowerCase(); // email у нижній регістр

    // Валідація імені
    if (!normalizedFullName) {
      setError("Введіть повне ім'я");
      return;
    }

    // Перевірка прийняття умов
    if (!acceptedTerms) {
      setError(
        t('mustAcceptTerms') ||
          'Ви повинні прийняти Умови використання та Політику конфіденційності'
      );
      return;
    }

    // Перевірка співпадіння паролів
    if (password !== confirmPassword) {
      setError(t('passwordMismatch') || 'Паролі не співпадають');
      return;
    }

    // Перевірка складності пароля
    if (password.length < 8 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      setError(
        t('passwordRequirements') ||
          'Мінімум 8 символів, включаючи великі, малі літери та цифри'
      );
      return;
    }

    setLoading(true); // починаємо завантаження

    try {
      // Запит на реєстрацію через Supabase
      const { error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: normalizedFullName, // зберігаємо ім’я в metadata
          },
        },
      });

      // Обробка помилки реєстрації
      if (signUpError) {
        setError(signUpError.message || 'Помилка реєстрації');
        return;
      }

      // Успіх → редірект на логін
      navigate('/login');
    } catch (err: any) {
      // Обробка неочікуваної помилки
      setError(err?.message || 'Помилка реєстрації');
    } finally {
      setLoading(false); // завершуємо завантаження
    }
  };

  // Клас для інпутів (щоб не дублювати)
  const inputClassName =
    'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20';

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        {/* Лого + заголовок */}
        <div className="mb-8 flex flex-col items-center">
          <Logo variant="glass" size="lg" className="mb-6" />
          <p className="text-sm text-white/60">{t('createAccount')}</p>
        </div>

        {/* Форма */}
        <form onSubmit={handleSignup} className="space-y-5">
          {/* Відображення помилки */}
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/20 p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Ім'я */}
          <div>
            <label className="mb-2 block text-sm text-white/70">
              {t('fullName') || "Повне ім'я"}
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputClassName}
              placeholder="Іван Іваненко"
              autoComplete="name"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="mb-2 block text-sm text-white/70">
              {t('email') || 'Email'}
            </label>
            <input
              type="email" // правильний тип
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClassName}
              placeholder="your@email.com"
              autoComplete="email"
              required
            />
          </div>

          {/* Пароль */}
          <div>
            <label className="mb-2 block text-sm text-white/70">
              {t('password') || 'Пароль'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClassName}
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
          </div>

          {/* Підтвердження пароля */}
          <div>
            <label className="mb-2 block text-sm text-white/70">
              {t('confirmPassword') || 'Підтвердіть пароль'}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClassName}
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
          </div>

          {/* Підказка по паролю */}
          <p className="text-xs text-white/40">
            {t('passwordRequirements') ||
              'Мінімум 8 символів, включаючи великі, малі літери та цифри'}
          </p>

          {/* Чекбокс умов */}
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 h-4 w-4 accent-orange-500"
            />
            <span className="text-xs leading-relaxed text-white/60">
              {t('iAcceptThe') || 'Я приймаю'}{' '}
              <Link to="/terms" target="_blank" className="text-orange-400 underline">
                {t('termsOfService') || 'Умови використання'}
              </Link>{' '}
              {t('and') || 'та'}{' '}
              <Link to="/privacy" target="_blank" className="text-orange-400 underline">
                {t('privacyPolicy') || 'Політика конфіденційності'}
              </Link>
            </span>
          </label>

          {/* Кнопка */}
          <Button type="submit" disabled={loading || !acceptedTerms} className="w-full">
            {loading
              ? `${t('loading') || 'Завантаження'}...`
              : t('signup') || 'Зареєструватися'}
          </Button>
        </form>

        {/* Посилання на логін */}
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