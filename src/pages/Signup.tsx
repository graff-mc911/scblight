import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

// ============================================
// Стандартна форма реєстрації
// Поля:
// - Email
// - Пароль
// - Підтвердіть пароль
//
// ВАЖЛИВО:
// Для автозаповнення браузера email-поле повинно бути
// саме видимим username-полем.
// Тому:
// - НЕ використовуємо приховане username поле
// - видиме поле email має:
//   name="username"
//   autoComplete="username"
// ============================================

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  // refs на справжні input у DOM
  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const confirmPasswordRef = useRef<HTMLInputElement | null>(null);

  // Стани форми
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Показати / сховати пароль
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Стани інтерфейсу
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Чи користувач уже вручну змінював другий пароль
  const [confirmTouched, setConfirmTouched] = useState(false);

  // Якщо вже є сесія — переходимо на головну
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
  // Синхронізація React state з тим,
  // що браузер реально підставив у DOM
  // --------------------------------------------
  const syncAutofilledValuesFromDom = () => {
    const domEmail = emailRef.current?.value ?? '';
    const domPassword = passwordRef.current?.value ?? '';
    const domConfirm = confirmPasswordRef.current?.value ?? '';

    if (domEmail && domEmail !== email) {
      setEmail(domEmail);
    }

    if (domPassword && domPassword !== password) {
      setPassword(domPassword);
    }

    if (!confirmTouched) {
      const targetValue = domPassword || password;

      if (targetValue) {
        if (confirmPasswordRef.current && confirmPasswordRef.current.value !== targetValue) {
          confirmPasswordRef.current.value = targetValue;
        }

        if (confirmPassword !== targetValue) {
          setConfirmPassword(targetValue);
        }
      }
    } else {
      if (domConfirm && domConfirm !== confirmPassword) {
        setConfirmPassword(domConfirm);
      }
    }
  };

  // Кілька перевірок після рендеру, бо браузер автозаповнює не миттєво
  useEffect(() => {
    const timeouts = [100, 300, 700, 1200, 2000].map((delay) =>
      window.setTimeout(() => {
        syncAutofilledValuesFromDom();
      }, delay)
    );

    return () => {
      timeouts.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  // Другий пароль повторює перший, якщо його ще не редагували вручну
  useEffect(() => {
    if (!confirmTouched) {
      setConfirmPassword(password);

      if (confirmPasswordRef.current && confirmPasswordRef.current.value !== password) {
        confirmPasswordRef.current.value = password;
      }
    }
  }, [password, confirmTouched]);

  // Реєстрація
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Перед відправкою ще раз читаємо DOM
    syncAutofilledValuesFromDom();

    setError('');

    const finalEmail = (emailRef.current?.value || email).trim().toLowerCase();
    const finalPassword = passwordRef.current?.value || password;
    const finalConfirmPassword = confirmPasswordRef.current?.value || confirmPassword;

    if (!finalEmail) {
      setError('Введіть email');
      return;
    }

    if (!finalPassword) {
      setError('Введіть пароль');
      return;
    }

    if (!finalConfirmPassword) {
      setError('Підтвердіть пароль');
      return;
    }

    if (finalPassword !== finalConfirmPassword) {
      setError('Паролі не співпадають');
      return;
    }

    if (finalPassword.length < 6) {
      setError('Пароль має містити мінімум 6 символів');
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: finalEmail,
        password: finalPassword,
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

  const inputClassName =
    'block w-full min-w-0 box-border rounded-xl border border-white/10 bg-white/5 px-4 pr-12 py-3.5 text-base leading-6 text-white placeholder-white/40 outline-none transition-all focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20';

  const eyeButtonClassName =
    'absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white/80 transition-colors';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#1a1f24]">
      <Card className="w-full max-w-md p-8 overflow-hidden">
        <div className="mb-8 flex flex-col items-center">
          <Logo variant="glass" size="lg" className="mb-6" />

          <h1 className="text-xl font-semibold text-white mb-2">
            {t('signup') || 'Реєстрація'}
          </h1>

          <p className="text-sm text-white/60 text-center">
            {t('createAccount') || 'Створіть обліковий запис'}
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-5" autoComplete="on">
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/20 p-3">
              <p className="text-sm text-red-400 break-words">{error}</p>
            </div>
          )}

          {/* Email */}
          <div className="w-full min-w-0">
            <label htmlFor="signup-email" className="mb-2 block text-sm text-white/70">
              {t('email') || 'Email'}
            </label>

            <input
              ref={emailRef}
              id="signup-email"
              name="username"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={syncAutofilledValuesFromDom}
              onBlur={syncAutofilledValuesFromDom}
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

          {/* Пароль */}
          <div className="w-full min-w-0">
            <label htmlFor="signup-password" className="mb-2 block text-sm text-white/70">
              {t('password') || 'Пароль'}
            </label>

            <div className="relative">
              <input
                ref={passwordRef}
                id="signup-password"
                name="new-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onInput={(e) => {
                  const value = (e.target as HTMLInputElement).value;
                  setPassword(value);

                  if (!confirmTouched) {
                    setConfirmPassword(value);

                    if (confirmPasswordRef.current) {
                      confirmPasswordRef.current.value = value;
                    }
                  }
                }}
                onFocus={syncAutofilledValuesFromDom}
                onBlur={syncAutofilledValuesFromDom}
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

          {/* Підтвердження пароля */}
          <div className="w-full min-w-0">
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
                name="confirm-new-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmTouched(true);
                  setConfirmPassword(e.target.value);
                }}
                onInput={(e) => {
                  setConfirmTouched(true);
                  setConfirmPassword((e.target as HTMLInputElement).value);
                }}
                onFocus={() => {
                  syncAutofilledValuesFromDom();

                  if (!confirmTouched) {
                    const sourcePassword = passwordRef.current?.value || password;
                    if (sourcePassword && confirmPasswordRef.current) {
                      confirmPasswordRef.current.value = sourcePassword;
                      setConfirmPassword(sourcePassword);
                    }
                  }
                }}
                onBlur={syncAutofilledValuesFromDom}
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

          <Button type="submit" disabled={loading} className="w-full">
            {loading
              ? `${t('loading') || 'Завантаження'}...`
              : t('signup') || 'Зареєструватися'}
          </Button>
        </form>

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