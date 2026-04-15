import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Logo } from '../components/Logo'
import { supabase } from '../lib/supabase'

export const Signup: React.FC = () => {
  const navigate = useNavigate()

  // --------------------------------------------------
  // СТАНИ ФОРМИ
  // --------------------------------------------------
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // --------------------------------------------------
  // СТАНИ ІНТЕРФЕЙСУ
  // --------------------------------------------------
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // --------------------------------------------------
  // REF ДЛЯ ПОЛІВ
  // Потрібні, щоб зчитати значення,
  // якщо менеджер паролів вставив їх напряму в DOM
  // --------------------------------------------------
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const confirmPasswordRef = useRef<HTMLInputElement>(null)

  // --------------------------------------------------
  // ЯКЩО КОРИСТУВАЧ УЖЕ УВІЙШОВ → НА ГОЛОВНУ
  // --------------------------------------------------
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        navigate('/')
      }
    }

    void checkSession()
  }, [navigate])

  // --------------------------------------------------
  // СИНХРОНІЗАЦІЯ AUTOFILL
  // Якщо менеджер паролів заповнив тільки пароль,
  // або не викликав onChange, зчитуємо значення з input напряму.
  // Якщо підтвердження ще пусте, дублюємо туди пароль.
  // --------------------------------------------------
  useEffect(() => {
    const syncAutofill = () => {
      const domEmail = emailRef.current?.value || ''
      const domPassword = passwordRef.current?.value || ''
      const domConfirmPassword = confirmPasswordRef.current?.value || ''

      if (domEmail && domEmail !== email) {
        setEmail(domEmail)
      }

      if (domPassword && domPassword !== password) {
        setPassword(domPassword)
      }

      // Якщо перший пароль уже підставився,
      // а другий ще пустий — копіюємо значення.
      if (domPassword && !domConfirmPassword) {
        if (confirmPasswordRef.current) {
          confirmPasswordRef.current.value = domPassword
        }
        if (confirmPassword !== domPassword) {
          setConfirmPassword(domPassword)
        }
      }

      if (domConfirmPassword && domConfirmPassword !== confirmPassword) {
        setConfirmPassword(domConfirmPassword)
      }
    }

    const t1 = window.setTimeout(syncAutofill, 100)
    const t2 = window.setTimeout(syncAutofill, 400)
    const t3 = window.setTimeout(syncAutofill, 1000)
    const interval = window.setInterval(syncAutofill, 800)

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
      window.clearInterval(interval)
    }
  }, [email, password, confirmPassword])

  // --------------------------------------------------
  // РЕЄСТРАЦІЯ
  // --------------------------------------------------
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail) {
      setError('Введіть email')
      return
    }

    if (password !== confirmPassword) {
      setError('Паролі не співпадають')
      return
    }

    if (password.length < 6) {
      setError('Мінімум 6 символів')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      })

      if (error) throw error

      navigate('/login')
    } catch (err: any) {
      setError(err?.message || 'Помилка реєстрації')
    } finally {
      setLoading(false)
    }
  }

  // --------------------------------------------------
  // ВХІД ЧЕРЕЗ GOOGLE
  // --------------------------------------------------
  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) throw error
    } catch (err: any) {
      console.error('GOOGLE LOGIN ERROR:', err)
      setError(err?.message || 'Google login failed')
      setLoading(false)
    }
  }

  // --------------------------------------------------
  // ВХІД ЧЕРЕЗ APPLE
  // --------------------------------------------------
  const handleAppleLogin = async () => {
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: window.location.origin,
        },
      })

      if (error) throw error
    } catch (err: any) {
      console.error('APPLE LOGIN ERROR:', err)
      setError(err?.message || 'Apple login failed')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#1a1f24]">
      <Card className="w-full max-w-md p-8">
        {/* --------------------------------------------------
            ЛОГО + ЗАГОЛОВОК
        -------------------------------------------------- */}
        <div className="mb-8 flex flex-col items-center">
          <Logo variant="glass" size="lg" className="mb-6" />
          <p className="text-sm text-white/60">Створити акаунт</p>
        </div>

        {/* --------------------------------------------------
            ФОРМА
        -------------------------------------------------- */}
        <form onSubmit={handleSignup} autoComplete="on" className="space-y-5">
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* --------------------------------------------------
              EMAIL
              Поле налаштоване як в Auth.jsx:
              autoComplete="username"
          -------------------------------------------------- */}
          <div>
            <label className="block text-sm text-white/70 mb-2">Email</label>

            <input
              ref={emailRef}
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 outline-none focus:border-orange-500"
              required
            />
          </div>

          {/* --------------------------------------------------
              ПАРОЛЬ
              Додаємо око перегляду як стандарт
          -------------------------------------------------- */}
          <div>
            <label className="block text-sm text-white/70 mb-2">Пароль</label>

            <div className="relative">
              <input
                ref={passwordRef}
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  const nextValue = e.target.value
                  setPassword(nextValue)

                  // Якщо друге поле порожнє
                  // або йшло в синхроні з першим —
                  // одразу копіюємо значення і туди.
                  if (!confirmPassword || confirmPassword === password) {
                    setConfirmPassword(nextValue)
                    if (confirmPasswordRef.current) {
                      confirmPasswordRef.current.value = nextValue
                    }
                  }
                }}
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-white outline-none focus:border-orange-500"
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
                aria-label={showPassword ? 'Сховати пароль' : 'Показати пароль'}
                title={showPassword ? 'Сховати пароль' : 'Показати пароль'}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* --------------------------------------------------
              ПІДТВЕРДЖЕННЯ ПАРОЛЯ
              Тут теж додаємо око перегляду
          -------------------------------------------------- */}
          <div>
            <label className="block text-sm text-white/70 mb-2">Підтвердіть пароль</label>

            <div className="relative">
              <input
                ref={confirmPasswordRef}
                id="confirm_password"
                name="confirm_password"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-white outline-none focus:border-orange-500"
                required
              />

              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
                aria-label={showConfirmPassword ? 'Сховати підтвердження пароля' : 'Показати підтвердження пароля'}
                title={showConfirmPassword ? 'Сховати підтвердження пароля' : 'Показати підтвердження пароля'}
              >
                {showConfirmPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* --------------------------------------------------
              КНОПКА РЕЄСТРАЦІЇ
          -------------------------------------------------- */}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Завантаження...' : 'Зареєструватися'}
          </Button>
        </form>

        {/* --------------------------------------------------
            GOOGLE / APPLE
        -------------------------------------------------- */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-[#1f2429] text-white/50">Або продовжити з</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex items-center justify-center gap-2 py-3 px-4 border border-white/10 rounded-xl hover:bg-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="text-sm font-medium text-white/80">Google</span>
          </button>

          <button
            type="button"
            onClick={handleAppleLogin}
            disabled={loading}
            className="flex items-center justify-center gap-2 py-3 px-4 border border-white/10 rounded-xl hover:bg-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5 text-white/80" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            <span className="text-sm font-medium text-white/80">Apple</span>
          </button>
        </div>

        {/* --------------------------------------------------
            ПЕРЕХІД НА LOGIN
        -------------------------------------------------- */}
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
  )
}