import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Logo } from '../components/Logo'
import { useLanguage } from '../contexts/LanguageContext'

type Mode = 'login' | 'signup' | 'reset' | 'verify'

type FieldErrors = {
  email?: string
  password?: string
  confirmPassword?: string
}

export const Signup: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useLanguage()

  const [mode, setMode] = useState<Mode>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [message, setMessage] = useState('')
  const [gdprConsent, setGdprConsent] = useState(false)
  const [termsConsent, setTermsConsent] = useState(false)

  const translations = {
    uk: {
      login: 'Вхід',
      signup: 'Створити обліковий запис',
      email: 'Електронна пошта',
      password: 'Пароль',
      confirmPassword: 'Підтвердіть пароль',
      forgotPassword: 'Забули пароль?',
      noAccount: 'Немає облікового запису?',
      hasAccount: 'Вже є обліковий запис?',
      signupNow: 'Зареєструватися',
      loginNow: 'Увійти',
      resetPassword: 'Скинути пароль',
      backToLogin: 'Повернутися до входу',
      continueWith: 'Або продовжити з',
      gdprConsent: 'Я погоджуюся на обробку моїх персональних даних відповідно до',
      privacyPolicy: 'Політики конфіденційності',
      termsConsent: 'Я приймаю',
      termsOfService: 'Умови використання',
      consentRequired: 'Необхідно прийняти умови для продовження',
      emailRequired: 'Введіть електронну пошту',
      passwordRequired: 'Введіть пароль',
      passwordMismatch: 'Паролі не співпадають',
      weakPassword: 'Пароль повинен містити мінімум 8 символів',
      invalidEmail: 'Невірний формат електронної пошти',
      checkEmail: 'Перевірте електронну пошту для підтвердження реєстрації',
      resetEmailSent: 'Інструкції для скидання пароля відправлені на пошту',
      loginError: 'Помилка входу. Перевірте свої дані.',
      signupError: 'Помилка реєстрації.',
      verifyEmail: 'Підтвердіть вашу електронну пошту',
      verifyEmailText:
        'Ми відправили лист для підтвердження на вашу пошту. Перейдіть за посиланням у листі, щоб активувати обліковий запис.',
      resendVerification: 'Відправити лист повторно',
      emailSent: 'Лист відправлено',
      emailExists: 'Користувач з такою електронною поштою вже існує',
      showPassword: 'Показати пароль',
      hidePassword: 'Приховати пароль',
      loggingIn: 'Вхід...',
      signingUp: 'Реєстрація...',
      sending: 'Відправлення...'
    },
    en: {
      login: 'Log In',
      signup: 'Create Account',
      email: 'Email Address',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      forgotPassword: 'Forgot password?',
      noAccount: "Don't have an account?",
      hasAccount: 'Already have an account?',
      signupNow: 'Sign up',
      loginNow: 'Log in',
      resetPassword: 'Reset Password',
      backToLogin: 'Back to login',
      continueWith: 'Or continue with',
      gdprConsent: 'I agree to the processing of my personal data in accordance with the',
      privacyPolicy: 'Privacy Policy',
      termsConsent: 'I accept the',
      termsOfService: 'Terms of Service',
      consentRequired: 'You must accept the terms to continue',
      emailRequired: 'Email is required',
      passwordRequired: 'Password is required',
      passwordMismatch: 'Passwords do not match',
      weakPassword: 'Password must be at least 8 characters',
      invalidEmail: 'Invalid email format',
      checkEmail: 'Check your email to confirm registration',
      resetEmailSent: 'Password reset instructions sent to your email',
      loginError: 'Login failed. Please check your credentials.',
      signupError: 'Registration failed.',
      verifyEmail: 'Verify Your Email',
      verifyEmailText:
        'We sent a verification email to your address. Click the link in the email to activate your account.',
      resendVerification: 'Resend verification email',
      emailSent: 'Email sent',
      emailExists: 'User with this email already exists',
      showPassword: 'Show password',
      hidePassword: 'Hide password',
      loggingIn: 'Logging in...',
      signingUp: 'Signing up...',
      sending: 'Sending...'
    }
  }

  const lang = (t as any)?.nav?.dashboard ? 'uk' : 'en'
  const tr = translations[lang as 'uk' | 'en']

  // Перевірка email
  const validateEmail = (emailValue: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)
  }

  // Перевірка пароля
  const validatePassword = (passwordValue: string) => {
    return passwordValue.length >= 8
  }

  // Перевірка окремих полів
  const validateField = (field: keyof FieldErrors | 'email' | 'password' | 'confirmPassword', value: string) => {
    const errors: FieldErrors = { ...fieldErrors }

    if (field === 'email') {
      if (!value) {
        errors.email = tr.emailRequired
      } else if (!validateEmail(value)) {
        errors.email = tr.invalidEmail
      } else {
        delete errors.email
      }
    }

    if (field === 'password') {
      if (!value) {
        errors.password = tr.passwordRequired
      } else if (!validatePassword(value)) {
        errors.password = tr.weakPassword
      } else {
        delete errors.password
      }
    }

    if (field === 'confirmPassword') {
      if (value !== password) {
        errors.confirmPassword = tr.passwordMismatch
      } else {
        delete errors.confirmPassword
      }
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Вхід через email + пароль
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setFieldErrors({})

    if (!email) {
      setFieldErrors({ email: tr.emailRequired })
      return
    }

    if (!validateEmail(email)) {
      setFieldErrors({ email: tr.invalidEmail })
      return
    }

    if (!password) {
      setFieldErrors({ password: tr.passwordRequired })
      return
    }

    setLoading(true)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      })

      if (signInError) {
        setError(signInError.message || tr.loginError)
        setLoading(false)
        return
      }

      if (data.user && data.session) {
        setLoading(false)
        navigate('/')
      } else {
        setError(tr.loginError)
        setLoading(false)
      }
    } catch (err: any) {
      setError(err?.message || tr.loginError)
      setLoading(false)
    }
  }

  // Реєстрація
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setFieldErrors({})

    if (!email || !validateEmail(email)) {
      setFieldErrors({ email: !email ? tr.emailRequired : tr.invalidEmail })
      return
    }

    if (!password || !validatePassword(password)) {
      setFieldErrors({ password: !password ? tr.passwordRequired : tr.weakPassword })
      return
    }

    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: tr.passwordMismatch })
      return
    }

    if (!gdprConsent || !termsConsent) {
      setError(tr.consentRequired)
      return
    }

    setLoading(true)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            accepted_privacy_policy: true,
            accepted_terms: true,
            consent_timestamp: new Date().toISOString()
          }
        }
      })

      if (signUpError) {
        if (
          signUpError.message.includes('already registered') ||
          signUpError.message.includes('User already registered') ||
          signUpError.message.includes('already been registered') ||
          signUpError.status === 400
        ) {
          setError(tr.emailExists)
        } else {
          setError(signUpError.message || tr.signupError)
        }
        setLoading(false)
        return
      }

      if (data?.user && data?.user?.identities && data.user.identities.length === 0) {
        setError(tr.emailExists)
        setLoading(false)
        return
      }

      if (data.user) {
        if (data.session) {
          setLoading(false)
          navigate('/')
        } else {
          const { data: sessionData } = await supabase.auth.getSession()

          if (sessionData.session) {
            setLoading(false)
            navigate('/')
          } else {
            setMode('verify')
            setMessage(tr.checkEmail)
            setLoading(false)
          }
        }
      } else {
        setError(tr.signupError)
        setLoading(false)
      }
    } catch (err: any) {
      setError(err?.message || tr.signupError)
      setLoading(false)
    }
  }

  // Скидання пароля
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setFieldErrors({})

    if (!email) {
      setFieldErrors({ email: tr.emailRequired })
      return
    }

    if (!validateEmail(email)) {
      setFieldErrors({ email: tr.invalidEmail })
      return
    }

    setLoading(true)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin
      })

      if (resetError) {
        setError(resetError.message || 'Error sending reset email')
        setLoading(false)
        return
      }

      setMessage(tr.resetEmailSent)
      setLoading(false)
    } catch {
      setError('Error sending reset email')
      setLoading(false)
    }
  }

  // Вхід через Google
  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)

    try {
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      })

      if (googleError) {
        setError(googleError.message || 'Google login failed')
        setLoading(false)
      }
    } catch {
      setError('Google login failed')
      setLoading(false)
    }
  }

  // Вхід через Apple
  const handleAppleLogin = async () => {
    setError('')
    setLoading(true)

    try {
      const { error: appleError } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: window.location.origin
        }
      })

      if (appleError) {
        setError(appleError.message || 'Apple login failed')
        setLoading(false)
      }
    } catch {
      setError('Apple login failed')
      setLoading(false)
    }
  }

  // Повторне відправлення листа підтвердження
  const resendVerification = async () => {
    setError('')
    setMessage('')
    setLoading(true)

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim()
      })

      if (resendError) {
        setError(resendError.message || 'Error resending email')
        setLoading(false)
        return
      }

      setMessage(tr.emailSent)
      setLoading(false)
    } catch {
      setError('Error resending email')
      setLoading(false)
    }
  }

  // Перевірка валідності форми
  const isFormValid = () => {
    if (mode === 'signup') {
      return (
        !!email &&
        validateEmail(email) &&
        !!password &&
        validatePassword(password) &&
        !!confirmPassword &&
        password === confirmPassword &&
        gdprConsent &&
        termsConsent
      )
    }

    if (mode === 'login') {
      return !!email && validateEmail(email) && !!password
    }

    if (mode === 'reset') {
      return !!email && validateEmail(email)
    }

    return false
  }

  // Екран підтвердження email
  if (mode === 'verify') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Logo variant="glass" size="lg" />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {tr.verifyEmail}
              </h2>

              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {tr.verifyEmailText}
              </p>
            </div>

            {message && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
                {message}
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={resendVerification}
              disabled={loading}
              className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
              {loading ? tr.sending : tr.resendVerification}
            </button>

            <button
              onClick={() => {
                setMode('login')
                setError('')
                setMessage('')
              }}
              className="w-full text-sm text-gray-600 dark:text-gray-400 hover:text-orange-500 transition-colors"
            >
              {tr.backToLogin}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo variant="glass" size="lg" />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            {mode === 'reset' ? tr.resetPassword : mode === 'signup' ? tr.signup : tr.login}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
              {message}
            </div>
          )}

          <form
            onSubmit={
              mode === 'reset'
                ? handlePasswordReset
                : mode === 'signup'
                ? handleSignup
                : handleEmailLogin
            }
            className="space-y-4"
          >
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {tr.email}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (fieldErrors.email) validateField('email', e.target.value)
                }}
                onBlur={(e) => validateField('email', e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border ${
                  fieldErrors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all`}
                placeholder="user@example.com"
                disabled={loading}
                autoComplete="email"
              />
              {fieldErrors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.email}</p>
              )}
            </div>

            {mode !== 'reset' && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {tr.password}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (fieldErrors.password) validateField('password', e.target.value)
                    }}
                    onBlur={(e) => validateField('password', e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border ${
                      fieldErrors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all`}
                    placeholder="••••••••"
                    disabled={loading}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.password}</p>
                )}
              </div>
            )}

            {mode === 'signup' && (
              <>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {tr.confirmPassword}
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        if (fieldErrors.confirmPassword) validateField('confirmPassword', e.target.value)
                      }}
                      onBlur={(e) => validateField('confirmPassword', e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border ${
                        fieldErrors.confirmPassword ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all`}
                      placeholder="••••••••"
                      disabled={loading}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.confirmPassword}</p>
                  )}
                </div>

                <div className="space-y-3 pt-2">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={gdprConsent}
                      onChange={(e) => setGdprConsent(e.target.checked)}
                      className="form-checkbox mt-1 w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600 text-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-0 cursor-pointer transition-colors"
                      disabled={loading}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 flex-1">
                      {tr.gdprConsent}{' '}
                      <a href="/privacy-policy.html" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-600 underline">
                        {tr.privacyPolicy}
                      </a>
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={termsConsent}
                      onChange={(e) => setTermsConsent(e.target.checked)}
                      className="form-checkbox mt-1 w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600 text-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-0 cursor-pointer transition-colors"
                      disabled={loading}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 flex-1">
                      {tr.termsConsent}{' '}
                      <a href="/terms-of-service.html" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-600 underline">
                        {tr.termsOfService}
                      </a>
                    </span>
                  </label>
                </div>
              </>
            )}

            {mode === 'login' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setMode('reset')
                    setError('')
                    setMessage('')
                    setFieldErrors({})
                  }}
                  className="text-sm text-orange-500 hover:text-orange-600 transition-colors"
                >
                  {tr.forgotPassword}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !isFormValid()}
              className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-orange-500"
            >
              {loading
                ? mode === 'signup'
                  ? tr.signingUp
                  : mode === 'login'
                  ? tr.loggingIn
                  : tr.sending
                : mode === 'reset'
                ? tr.resetPassword
                : mode === 'signup'
                ? tr.signup
                : tr.login}
            </button>
          </form>

          {mode !== 'reset' && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    {tr.continueWith}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Google</span>
                </button>

                <button
                  type="button"
                  onClick={handleAppleLogin}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Apple</span>
                </button>
              </div>
            </>
          )}

          <div className="mt-6 text-center">
            {mode === 'login' ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {tr.noAccount}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup')
                    setError('')
                    setMessage('')
                    setFieldErrors({})
                  }}
                  className="text-orange-500 hover:text-orange-600 font-medium transition-colors"
                >
                  {tr.signupNow}
                </button>
              </p>
            ) : mode === 'signup' ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {tr.hasAccount}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login')
                    setError('')
                    setMessage('')
                    setFieldErrors({})
                  }}
                  className="text-orange-500 hover:text-orange-600 font-medium transition-colors"
                >
                  {tr.loginNow}
                </button>
              </p>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMode('login')
                  setError('')
                  setMessage('')
                  setFieldErrors({})
                }}
                className="text-sm text-orange-500 hover:text-orange-600 transition-colors"
              >
                {tr.backToLogin}
              </button>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              <a href="/privacy-policy.html" target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 transition-colors">
                {tr.privacyPolicy}
              </a>
              {' • '}
              <a href="/terms-of-service.html" target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 transition-colors">
                {tr.termsOfService}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}