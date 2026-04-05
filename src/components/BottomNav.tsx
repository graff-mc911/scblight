import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, FileText, Users, User, Receipt, Settings, Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { languages } from '../lib/languages';
import { motion, AnimatePresence } from 'framer-motion';

export const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language, setLanguage } = useLanguage();
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  const currentLanguage = languages.find(lang => lang.code === language) || languages[0];

  const navItems = React.useMemo(() => [
    { path: '/', icon: Home, label: t('home') },
    { path: '/invoices', icon: FileText, label: t('invoices') },
    { path: '/clients', icon: Users, label: t('clients') },
    { path: '/receipts', icon: Receipt, label: t('receipts') },
    { path: '/account', icon: User, label: t('account') },
  ], [t]);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/10 backdrop-blur-xl border-t border-white/10 pb-safe z-50">
      <AnimatePresence>
        {showLanguageMenu && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-full left-0 right-0 mb-2 mx-2 bg-white/10 backdrop-blur-xl border border-white/10 rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto"
          >
            <div className="p-2">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code);
                    setShowLanguageMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-all flex items-center gap-2 ${
                    language === lang.code ? 'text-orange-500' : 'text-white/70'
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.name}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between px-2 py-2">
        <div className="flex items-center gap-1 flex-1 overflow-x-auto">
          {navItems.map((item) => {
            const active = isActive(item.path);

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
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

        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
            className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <Globe className="h-4 w-4" />
            <span className="text-xs">{currentLanguage.flag}</span>
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </nav>
  );
};
