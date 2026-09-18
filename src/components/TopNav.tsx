import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Globe, Settings } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { languages } from '../lib/languages';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from './Logo';

export const TopNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language, setLanguage } = useLanguage();
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
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

  const navItems = React.useMemo(
    () => [
      { path: '/', label: t('home') },
      { path: '/invoices', label: t('invoices') },
      { path: '/clients', label: t('clients') },
      { path: '/receipts', label: t('receipts') },
      { path: '/scan', label: t('scanReceiptTitle') },
      { path: '/account', label: t('account') },
    ],
    [t],
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const currentLanguage = languages.find((lang) => lang.code === language) || languages[0];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <Logo variant="glass" size="md" />

            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => navigate(item.path)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                      active
                        ? 'text-white bg-orange-500/20 border border-orange-500/30'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              >
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">{currentLanguage.flag}</span>
              </button>
              <AnimatePresence>
                {showLanguageMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-80 bg-white/10 backdrop-blur-xl border border-white/10 rounded-xl shadow-lg overflow-hidden p-2 z-50"
                  >
                    <div className="grid grid-cols-2 gap-1">
                      {languages.map((lang) => (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => {
                            setLanguage(lang.code);
                            setShowLanguageMenu(false);
                          }}
                          className={`text-left px-3 py-2 text-sm hover:bg-white/10 rounded-lg transition-all flex items-center gap-2 ${
                            language === lang.code
                              ? 'text-orange-500 bg-orange-500/10'
                              : 'text-white/70'
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
              onClick={() => navigate('/settings')}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            >
              <Settings className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => void handleLogout()}
              className="p-2 text-white/70 hover:text-red-400 hover:bg-white/10 rounded-lg transition-all"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};