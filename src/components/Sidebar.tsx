import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, FileText, FilePlus, Receipt, Users } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Logo } from './Logo';

export const Sidebar: React.FC = () => {
  const { t } = useLanguage();

  const navItems = [
    { to: '/', icon: Home, label: t('home') || 'Головна' },
    { to: '/invoices', icon: FileText, label: t('invoices') || 'Рахунки' },
    { to: '/pdf-creator', icon: FilePlus, label: t('createPdfBtn') || 'Створити PDF' },
    { to: '/receipts', icon: Receipt, label: t('receipts') || 'Витрати' },
    { to: '/clients', icon: Users, label: t('clients') || 'Клієнти' },
  ];

  return (
    <>
      {/* Desktop — верхня панель */}
      <header className="hidden lg:block fixed top-0 left-0 right-0 z-40 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
          <Logo variant="glass" size="sm" />
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Mobile — нижня панель */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-2 py-1.5">
        <nav className="flex items-center justify-around">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center py-1 px-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              <item.icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] truncate max-w-[64px]">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </>
  );
};