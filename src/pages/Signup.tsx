import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, UserPlus } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate('/');
      }
    };
    checkSession();
  }, [navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!acceptedTerms) {
      setError(t('mustAcceptTerms') || 'You must accept the Terms of Service and Privacy Policy');
      return;
    }

    if (password !== confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }

    if (password.length < 8) {
      setError(t('passwordRequirements'));
      return;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      setError(t('passwordRequirements'));
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('breached')) {
          setError(t('passwordCompromised'));
        } else {
          throw signUpError;
        }
        setLoading(false);
        return;
      }

      if (data.session) {
        navigate('/');
      } else {
        setError(t('registrationSuccess'));
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <Logo variant="glass" size="lg" className="mb-6" />
          <p className="text-white/60 text-sm">{t('createAccount')}</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-5">
          {error && (
            <div className={`p-3 border rounded-lg ${
              error.includes(t('registrationSuccess')) || error.includes('Success')
                ? 'bg-green-500/20 border-green-500/30'
                : 'bg-red-500/20 border-red-500/30'
            }`}>
              <p className={`text-sm ${
                error.includes(t('registrationSuccess')) || error.includes('Success') ? 'text-green-400' : 'text-red-400'
              }`}>
                {error}
              </p>
            </div>
          )}

          <Input
            type="text"
            label={t('fullName')}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <Input
            type="email"
            label={t('email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
          />

          <Input
            type="password"
            label={t('password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <Input
            type="password"
            label={t('confirmPassword')}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <p className="text-xs text-white/40">
            {t('passwordRequirements')}
          </p>

          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex-shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${acceptedTerms ? 'bg-orange-500 border-orange-500' : 'border-white/30 bg-white/5 group-hover:border-white/50'}`}>
                {acceptedTerms && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-xs text-white/60 leading-relaxed">
              {t('iAcceptThe') || 'I accept the'}{' '}
              <Link to="/terms" target="_blank" className="text-orange-400 hover:text-orange-300 underline">
                {t('termsOfService') || 'Terms of Service'}
              </Link>
              {' '}{t('and') || 'and'}{' '}
              <Link to="/privacy" target="_blank" className="text-orange-400 hover:text-orange-300 underline">
                {t('privacyPolicy') || 'Privacy Policy'}
              </Link>
            </span>
          </label>

          <Button
            type="submit"
            disabled={loading || !acceptedTerms}
            className="w-full"
          >
            {loading ? `${t('loading')}...` : t('signup')}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-white/60">
            {t('haveAccount')}{' '}
            <Link to="/login" className="text-orange-400 hover:text-orange-300 font-medium">
              {t('login')}
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};
