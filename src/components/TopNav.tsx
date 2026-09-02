import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LogOut,
  Globe,
  Settings,
  Home,
  FileText,
  FilePlus,
  Receipt,
  Users,
  User,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { currencies, languages } from '../lib/languages';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from './Logo';

const iconButtonClass =
  'relative flex items-center justify-center h-10 w-10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all active:scale-95';

export const TopNav: React.FC = () => {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState(() => {
    return localStorage.getItem('defaultCurrency') || 'EUR';
  });
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    localStorage.setItem('defaultCurrency', defaultCurrency);
  }, [defaultCurrency]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!navRef.current?.contains(event.target as Node)) {
        setShowLanguageMenu(false);
        setShowCurrencyMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = React.useMemo(
    () => [
      { to: '/', icon: Home, label: t('home') || 'Головна', end: true },
      { to: '/invoices', icon: FileText, label: t('invoices') || 'Рахунки' },
      { to: '/clients', icon: Users, label: t('clients') || 'Клієнти' },
      { to: '/receipts', icon: Receipt, label: t('receipts') || 'Витрати' },
      { to: '/pdf-creator', icon: FilePlus, label: t('createPdfBtn') || 'PDF' },
      { to: '/account', icon: User, label: t('account') || 'Акаунт' },
    ],
    [t],
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const currentLanguage = languages.find((lang) => lang.code === language) || languages[0];
  const currentCurrency =
    currencies.find((item) => item.code === defaultCurrency) || currencies[0];

  return (
    <header
      ref={navRef}
      className="hidden lg:block fixed top-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-xl border-b border-white/10"
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6 min-w-0">
          <Logo variant="glass" size="sm" />
          <nav className="flex items-center gap-1 min-w-0">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium tracking-tight whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                      : 'text-white/75 hover:text-white hover:bg-white/10'
                  }`
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="relative">
            <button
              type="button"
              aria-label={t('language') || 'Мова'}
              onClick={() => {
                setShowCurrencyMenu(false);
                setShowLanguageMenu((open) => !open);
              }}
              className={iconButtonClass}
            >
              <Globe className="h-4 w-4" />
              <span className="absolute -top-0.5 -right-0.5 text-xs leading-none">
                {currentLanguage.flag}
              </span>
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

          <div className="relative">
            <button
              type="button"
              aria-label={t('currency') || 'Валюта'}
              onClick={() => {
                setShowLanguageMenu(false);
                setShowCurrencyMenu((open) => !open);
              }}
              className={iconButtonClass}
            >
              <span className="text-sm font-semibold leading-none">{currentCurrency.symbol}</span>
            </button>
            <AnimatePresence>
              {showCurrencyMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute right-0 top-full mt-2 w-56 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-lg overflow-hidden p-2 z-50 max-h-80 overflow-y-auto"
                >
                  {currencies.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => {
                        setDefaultCurrency(item.code);
                        setShowCurrencyMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-all flex items-center gap-3 ${
                        defaultCurrency === item.code
                          ? 'text-orange-400 bg-orange-500/10'
                          : 'text-white/70 hover:bg-white/10'
                      }`}
                    >
                      <span className="w-8 text-center font-semibold">{item.symbol}</span>
                      <span className="truncate">{item.name}</span>
                      <span className="ml-auto text-xs text-white/40">{item.code}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="button"
            aria-label={t('settings') || 'Налаштування'}
            onClick={() => navigate('/settings')}
            className={iconButtonClass}
          >
            <Settings className="h-4 w-4" />
          </button>

          <button
            type="button"
            aria-label={t('logout') || 'Вийти'}
            onClick={() => void handleLogout()}
            className={`${iconButtonClass} hover:text-red-400`}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};