import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Logo } from '../components/Logo'

export const Signup = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('signup')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // LOGIN
  const handleLogin = async (e: any) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) setError(error.message)

    setLoading(false)
  }

  // SIGNUP
  const handleSignup = async (e: any) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Паролі не співпадають')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password
    })

    if (error) setError(error.message)

    setLoading(false)
  }

  // GOOGLE
  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google'
    })
  }

  // APPLE
  const handleApple = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'apple'
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1f24] p-4">
      <div className="w-full max-w-md bg-[#222831] p-8 rounded-2xl">

        <div className="text-center mb-6">
          <Logo />
        </div>

        <h2 className="text-white text-xl text-center mb-6">
          {mode === 'login' ? 'Увійти' : 'Реєстрація'}
        </h2>

        {error && (
          <div className="mb-4 text-red-400 text-sm">{error}</div>
        )}

        <form
          onSubmit={mode === 'login' ? handleLogin : handleSignup}
          autoComplete="on"
          className="space-y-4"
        >

          {/* EMAIL */}
          <input
            type="email"
            name="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full p-3 rounded bg-black/40 text-white"
          />

          {/* PASSWORD */}
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль"
            className="w-full p-3 rounded bg-black/40 text-white"
          />

          {/* CONFIRM */}
          {mode === 'signup' && (
            <input
              type="password"
              name="confirm_password"
              autoComplete="current-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Підтвердіть пароль"
              className="w-full p-3 rounded bg-black/40 text-white"
            />
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full p-3 bg-orange-500 rounded text-white"
          >
            {loading
              ? '...'
              : mode === 'login'
              ? 'Увійти'
              : 'Зареєструватися'}
          </button>
        </form>

        {/* GOOGLE / APPLE */}
        <div className="mt-4 space-y-2">
          <button onClick={handleGoogle} className="w-full p-3 bg-white text-black rounded">
            Google
          </button>
          <button onClick={handleApple} className="w-full p-3 bg-black text-white rounded">
            Apple
          </button>
        </div>

        {/* SWITCH */}
        <div className="mt-6 text-center text-white/60">
          {mode === 'login' ? (
            <>
              Немає акаунту?{' '}
              <button onClick={() => setMode('signup')} className="text-orange-400">
                Реєстрація
              </button>
            </>
          ) : (
            <>
              Вже є акаунт?{' '}
              <button onClick={() => setMode('login')} className="text-orange-400">
                Увійти
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  )
}