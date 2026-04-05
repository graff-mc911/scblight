import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Moon, Sun, Globe, LogOut, ArrowLeft, Trash2, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { languages } from '../lib/languages';
import { motion } from 'framer-motion';

export default function Settings() {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.toLowerCase() !== 'delete') return;
    setDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('invoices').delete().eq('user_id', user.id);
      await supabase.from('clients').delete().eq('user_id', user.id);
      await supabase.from('receipts').delete().eq('user_id', user.id);
      await supabase.from('company_profile').delete().eq('user_id', user.id);

      await supabase.auth.signOut();
      navigate('/login');
    } catch {
      setDeleting(false);
    }
  };

  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const currentLanguage = languages.find(lang => lang.code === language) || languages[0];

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 md:px-6 max-w-4xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center justify-center p-2 bg-white/10 backdrop-blur-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/20 rounded-xl mb-6 transition-all active:scale-95"
        title={t('back') || 'Назад'}
      >
        <ArrowLeft className="h-4 w-4" />
      </button>

      <h1 className="text-2xl font-semibold text-white mb-6">
        {t('settings') || 'Налаштування'}
      </h1>

      <div className="space-y-4">
        <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-medium text-white mb-4">
            {t('appearance') || 'Зовнішній вигляд'}
          </h2>

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              {isDark ? <Moon className="h-5 w-5 text-white/70" /> : <Sun className="h-5 w-5 text-white/70" />}
              <div>
                <p className="font-medium text-white">
                  {t('theme') || 'Тема'}
                </p>
                <p className="text-sm text-white/60">
                  {isDark ? (t('darkTheme') || 'Темна тема') : (t('lightTheme') || 'Світла тема')}
                </p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/20 rounded-xl transition-all active:scale-95"
            >
              {isDark ? (t('switchToLight') || 'Світла') : (t('switchToDark') || 'Темна')}
            </button>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-medium text-white mb-4">
            {t('legal') || 'Правова інформація'}
          </h2>

          <Link
            to="/privacy"
            className="flex items-center justify-between py-3 border-b border-white/10 hover:bg-white/5 transition-colors rounded-lg px-2"
          >
            <span className="text-white">
              {t('privacyPolicy') || 'Політика конфіденційності'}
            </span>
            <span className="text-white/40">›</span>
          </Link>

          <Link
            to="/terms"
            className="flex items-center justify-between py-3 hover:bg-white/5 transition-colors rounded-lg px-2"
          >
            <span className="text-white">
              {t('termsOfService') || 'Умови використання'}
            </span>
            <span className="text-white/40">›</span>
          </Link>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full py-3 px-4 bg-white/10 backdrop-blur-xl border border-white/10 text-red-400 hover:text-red-300 hover:bg-red-500/10 hover:border-red-500/20 transition-all rounded-xl active:scale-95"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">{t('logout') || 'Вийти'}</span>
          </button>
        </div>

        <div className="bg-red-500/5 backdrop-blur-xl border border-red-500/20 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <h2 className="text-lg font-medium text-red-400">
              {t('dangerZone') || 'Небезпечна зона'}
            </h2>
          </div>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-3 w-full py-3 px-4 bg-red-500/10 border border-red-500/30 text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-all rounded-xl active:scale-95"
            >
              <Trash2 className="h-5 w-5" />
              <span className="font-medium">{t('deleteAccount') || 'Видалити акаунт'}</span>
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-white/60">
                {t('deleteAccountWarning') || 'Ця дія незворотна. Усі ваші дані (рахунки, клієнти, квитанції) будуть видалені назавжди.'}
              </p>
              <p className="text-sm text-white/80">
                {t('deleteAccountConfirmPrompt') || 'Введіть "delete" для підтвердження:'}
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder='delete'
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-red-500/50 text-sm"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                  className="flex-1 py-2.5 px-4 bg-white/10 border border-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-all rounded-xl text-sm font-medium active:scale-95"
                >
                  {t('cancel') || 'Скасувати'}
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText.toLowerCase() !== 'delete' || deleting}
                  className="flex-1 py-2.5 px-4 bg-red-500/80 hover:bg-red-500 disabled:bg-red-500/30 disabled:cursor-not-allowed text-white transition-all rounded-xl text-sm font-medium active:scale-95"
                >
                  {deleting ? (t('deleting') || 'Видалення...') : (t('deleteAccount') || 'Видалити акаунт')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
