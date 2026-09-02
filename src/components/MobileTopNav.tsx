import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, Moon, Sun, Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { currencies, languages } from '../lib/languages';
import { Logo } from './Logo';

const iconButtonClass =
  'relative flex items-center justify-center h-10 w-10 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-95';

export const MobileTopNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language, setLanguage } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState(() => {
    return localStorage.getItem('defaultCurrency') || 'EUR';
  });
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

  useEffect(() => {
    localStorage.setItem('defaultCurrency', defaultCurrency);
  }, [defaultCurrency]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const navItems = React.useMemo(
    () => [
      { path: '/', label: t('home') },
      { path: '/invoices', label: t('invoices') },
      { path: '/clients', label: t('clients') },
      { path: '/receipts', label: t('receipts') },
      { path: '/pdf-creator', label: t('createPdfBtn') },
      { path: '/account', label: t('account') },
    ],
    [t],
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    setIsMenuOpen(false);
  };

  const currentLanguage = languages.find((lang) => lang.code === language) || languages[0];
  const currentCurrency =
    currencies.find((item) => item.code === defaultCurrency) || currencies[0];

  return (
    <nav className="lg:hidden fixed top-0 left-0 right-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 z-50 shadow-lg">
      <div className="flex items-center justify-between px-4 h-16">
        <Logo variant="glass" size="sm" />

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setShowCurrencyMenu(false);
              setShowLanguageMenu(!showLanguageMenu);
              setIsMenuOpen(false);
            }}
            className={iconButtonClass}
            aria-label={t('language') || 'Мова'}
          >
            <Globe className="h-5 w-5 text-brand-anthracite dark:text-white" />
            <span className="absolute -top-0.5 -right-0.5 text-xs leading-none">
              {currentLanguage.flag}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowLanguageMenu(false);
              setShowCurrencyMenu(!showCurrencyMenu);
              setIsMenuOpen(false);
            }}
            className={iconButtonClass}
            aria-label={t('currency') || 'Валюта'}
          >
            <span className="text-sm font-semibold text-brand-anthracite dark:text-white">
              {currentCurrency.symbol}
            </span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className={iconButtonClass}
            aria-label={t('theme') || 'Тема'}
          >
            {isDark ? (
              <Sun className="h-5 w-5 text-brand-anthracite dark:text-white" />
            ) : (
              <Moon className="h-5 w-5 text-brand-anthracite dark:text-white" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setShowLanguageMenu(false);
              setShowCurrencyMenu(false);
              setIsMenuOpen(!isMenuOpen);
            }}
            className={iconButtonClass}
            aria-label="Menu"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6 text-brand-anthracite dark:text-white" />
            ) : (
              <Menu className="h-6 w-6 text-brand-anthracite dark:text-white" />
            )}
          </button>
        </div>
      </div>

      {showLanguageMenu && (
        <div className="absolute top-full left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 shadow-premium">
          <div className="grid grid-cols-2 gap-2 p-3 max-h-80 overflow-y-auto">
            {languages.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  setLanguage(lang.code);
                  setShowLanguageMenu(false);
                }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left ${
                  language === lang.code
                    ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-500'
                    : ''
                }`}
              >
                <span className="text-xl">{lang.flag}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{lang.name}</span>
                {language === lang.code && <span className="ml-auto text-orange-500">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {showCurrencyMenu && (
        <div className="absolute top-full left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 shadow-premium">
          <div className="p-3 max-h-80 overflow-y-auto space-y-1">
            {currencies.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => {
                  setDefaultCurrency(item.code);
                  setShowCurrencyMenu(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left ${
                  defaultCurrency === item.code
                    ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-500'
                    : ''
                }`}
              >
                <span className="w-8 text-center text-sm font-semibold text-gray-900 dark:text-white">
                  {item.symbol}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</span>
                <span className="ml-auto text-xs text-gray-500">{item.code}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {isMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 shadow-premium">
          <div className="flex flex-col px-3 py-2">
            {navItems.map((item) => {
              const isActive =
                item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path);

              return (
                <div key={item.path} className="my-1">
                  <button
                    type="button"
                    onClick={() => handleNavClick(item.path)}
                    className={`w-full px-4 py-3 text-left transition-all rounded-xl text-sm font-medium tracking-tight ${
                      isActive
                        ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {item.label}
                  </button>
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => void handleLogout()}
              className="px-4 py-3 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2 border-t border-gray-200 dark:border-gray-800 text-sm font-medium"
            >
              <LogOut className="h-4 w-4" />
              {t('logout')}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};