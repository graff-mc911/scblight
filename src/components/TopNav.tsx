import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Globe, Settings } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { languages } from '../lib/languages';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from './Logo';

function languageShortCode(code: string): string {
  if (code === 'uk') return 'UA';
  return code.toUpperCase();
}

export const TopNav: React.FC = () => {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!navRef.current?.contains(event.target as Node)) {
        setShowLanguageMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = React.useMemo(
    () => [
      { to: '/', label: t('home') || 'Головна', end: true },
      { to: '/invoices', label: t('invoices') || 'Рахунки' },
      { to: '/clients', label: t('clients') || 'Контакти' },
      { to: '/receipts', label: t('receipts') || 'Чеки' },
      { to: '/account', label: t('account') || 'Акаунт' },
    ],
    [t],
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <header
      ref={navRef}
      className="fixed top-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-xl border-b border-white/10"
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8 min-w-0">
          <Logo variant="glass" size="sm" />

          <nav className="flex items-center gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `px-4 py-2 text-sm font-medium tracking-tight rounded-xl whitespace-nowrap transition-all ${
                    isActive
                      ? 'text-white bg-[#4a4038]/80'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="relative">
            <button
              type="button"
              aria-label={t('language') || 'Мова'}
              onClick={() => setShowLanguageMenu((open) => !open)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            >
              <Globe className="h-4 w-4" />
              <span>{languageShortCode(language)}</span>
            </button>
            <AnimatePresence>
              {showLanguageMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute right-0 top-full mt-2 w-80 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-lg overflow-hidden p-2 z-50"
                >
                  <div className="grid grid-cols-2 gap-1 max-h-80 overflow-y-auto">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          setLanguage(lang.code);
                          setShowLanguageMenu(false);
                        }}
                        className={`text-left px-3 py-2 text-sm rounded-lg transition-all flex items-center gap-2 ${
                          language === lang.code
                            ? 'text-orange-400 bg-orange-500/10'
                            : 'text-white/70 hover:bg-white/10'
                        }`}
                      >
                        <span>{lang.flag}</span>
                        <span className="truncate">{lang.name}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="button"
            aria-label={t('settings') || 'Налаштування'}
            onClick={() => navigate('/settings')}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <Settings className="h-4 w-4" />
          </button>

          <button
            type="button"
            aria-label={t('logout') || 'Вийти'}
            onClick={() => void handleLogout()}
            className="p-2 text-white/70 hover:text-red-400 hover:bg-white/10 rounded-xl transition-all"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};