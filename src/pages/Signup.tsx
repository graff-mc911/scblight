import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Logo } from '../components/Logo'

export const Signup = () => {
  // =========================
  // СТАНИ (як в Auth.jsx)
  // =========================
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [gdprConsent, setGdprConsent] = useState(false)
  const [termsConsent, setTermsConsent] = useState(false)

  // =========================
  // ВАЛІДАЦІЯ (з Auth.jsx)
  // =========================
  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const validatePassword = (password: string) => {
    return password.length >= 8
  }

  // =========================
  // SIGNUP (1:1 з Auth.jsx)
  // =========================
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!email || !validateEmail(email)) {
      setError('Невірний email')
      return
    }

    if (!password || !validatePassword(password)) {
      setError('Пароль мінімум 8 символів')
      return
    }

    if (password !== confirmPassword) {
      setError('Паролі не співпадають')
      return
    }

    if (!gdprConsent || !termsConsent) {
      setError('Прийміть умови')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin
        }
      })

      if (error) {
        setError(error.message)
        return
      }

      setMessage('Перевір пошту для підтвердження')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // =========================
  // GOOGLE / APPLE (з Auth.jsx)
  // =========================
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
  }

  const handleAppleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: window.location.origin }
    })
  }

  // =========================
  // UI (з Auth.jsx)
  // =========================
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#1a1f24]">
      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10">

        <div className="text-center mb-6">
          <Logo />
          <h2 className="text-white text-xl mt-4">Реєстрація</h2>
        </div>

        {error && <p className="text-red-400 mb-3">{error}</p>}
        {message && <p className="text-green-400 mb-3">{message}</p>}

        {/* ВАЖЛИВО: autocomplete="on" */}
        <form onSubmit={handleSignup} autoComplete="on" className="space-y-4">

          {/* EMAIL */}
          <input
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full p-3 rounded-xl bg-white/10 text-white"
          />

          {/* PASSWORD */}
          <div className="relative">
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль"
              className="w-full p-3 rounded-xl bg-white/10 text-white"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-white"
            >
              👁
            </button>
          </div>

          {/* CONFIRM PASSWORD */}
          <div className="relative">
            <input
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Підтвердіть пароль"
              className="w-full p-3 rounded-xl bg-white/10 text-white"
            />

            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-3 text-white"
            >
              👁
            </button>
          </div>

          {/* CHECKBOX */}
          <label className="text-white text-sm flex gap-2">
            <input type="checkbox" onChange={(e) => setGdprConsent(e.target.checked)} />
            GDPR
          </label>

          <label className="text-white text-sm flex gap-2">
            <input type="checkbox" onChange={(e) => setTermsConsent(e.target.checked)} />
            Terms
          </label>

          <button className="w-full bg-orange-500 py-3 rounded-xl text-white">
            {loading ? 'Завантаження...' : 'Зареєструватися'}
          </button>
        </form>

        {/* GOOGLE / APPLE */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button onClick={handleGoogleLogin} className="bg-white/10 p-3 rounded-xl text-white">
            Google
          </button>
          <button onClick={handleAppleLogin} className="bg-white/10 p-3 rounded-xl text-white">
            Apple
          </button>
        </div>

      </div>
    </div>
  )
}