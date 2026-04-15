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

  // --------------------------------------------------
  // REF-и НА INPUT
  // Потрібні, щоб зловити автозаповнення браузера,
  // яке інколи не викликає onChange.
  // --------------------------------------------------
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const confirmPasswordRef = useRef<HTMLInputElement>(null)

  // --------------------------------------------------
  // ЯКЩО ВЖЕ Є СЕСІЯ → НА ГОЛОВНУ
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
  // Якщо браузер підставив тільки перший пароль,
  // ми копіюємо його в другий.
  // Також зчитуємо email, якщо він був підставлений без onChange.
  // --------------------------------------------------
  useEffect(() => {
    const syncAutofillValues = () => {
      const domEmail = emailRef.current?.value || ''
      const domPassword = passwordRef.current?.value || ''
      const domConfirm = confirmPasswordRef.current?.value || ''

      // якщо браузер підставив email напряму в DOM
      if (domEmail && domEmail !== email) {
        setEmail(domEmail)
      }

      // якщо браузер підставив пароль напряму в DOM
      if (domPassword && domPassword !== password) {
        setPassword(domPassword)
      }

      // якщо другий пароль пустий, але перший уже підставився
      if (domPassword && !domConfirm) {
        if (confirmPasswordRef.current) {
          confirmPasswordRef.current.value = domPassword
        }
        if (confirmPassword !== domPassword) {
          setConfirmPassword(domPassword)
        }
      }

      // якщо браузер підставив і другий пароль напряму в DOM
      if (domConfirm && domConfirm !== confirmPassword) {
        setConfirmPassword(domConfirm)
      }
    }

    // кілька швидких перевірок після рендера
    const t1 = window.setTimeout(syncAutofillValues, 100)
    const t2 = window.setTimeout(syncAutofillValues, 400)
    const t3 = window.setTimeout(syncAutofillValues, 1000)

    // ще трохи поллінгу, бо деякі браузери вставляють із затримкою
    const interval = window.setInterval(syncAutofillValues, 800)

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
      window.clearInterval(interval)
    }
  }, [email, password, confirmPassword])

  // --------------------------------------------------
  // ОБРОБКА РЕЄСТРАЦІЇ
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
      setError(err.message || 'Помилка реєстрації')
    } finally {
      setLoading(false)
    }
  }

  // --------------------------------------------------
  // GOOGLE LOGIN
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
  // APPLE LOGIN
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
            Ключове:
            - autoComplete="on"
            - email = username
            - password = current-password
            Бо ти хочеш, щоб signup поводився як login
        -------------------------------------------------- */}
        <form onSubmit={handleSignup} autoComplete="on" className="space-y-5">
          {/* ПОМИЛКА */}
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* EMAIL */}
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

          {/* PASSWORD */}
          <div>
            <label className="block text-sm text-white/70 mb-2">Пароль</label>

            <input
              ref={passwordRef}
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                const nextValue = e.target.value
                setPassword(nextValue)

                // якщо другий пароль ще пустий або був таким самим —
                // синхронізуємо його з першим
                if (!confirmPassword || confirmPassword === password) {
                  setConfirmPassword(nextValue)
                  if (confirmPasswordRef.current) {
                    confirmPasswordRef.current.value = nextValue
                  }
                }
              }}
              placeholder="••••••••"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-orange-500"
              required
            />
          </div>

          {/* CONFIRM PASSWORD */}
          <div>
            <label className="block text-sm text-white/70 mb-2">Підтвердіть пароль</label>

            <input
              ref={confirmPasswordRef}
              id="confirm_password"
              name="confirm_password"
              type="password"
              autoComplete="current-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-orange-500"
              required
            />
          </div>

          {/* КНОПКА РЕЄСТРАЦІЇ */}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Завантаження...' : 'Зареєструватися'}
          </Button>
        </form>

        {/* --------------------------------------------------
            GOOGLE / APPLE
            Повернув з іконками
        -------------------------------------------------- */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-[#1f2429] text-white/50">
              Або продовжити з
            </span>
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

        {/* ПЕРЕХІД НА LOGIN */}
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