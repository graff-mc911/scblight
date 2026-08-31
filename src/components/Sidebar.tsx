import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, FileText, FilePlus, Receipt, Users } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const BottomNav: React.FC = () => {
  const { t } = useLanguage();

  const navItems = [
    { to: '/', icon: Home, label: t('nav.home') || 'Головна' },
    { to: '/invoices', icon: FileText, label: t('nav.invoices') || 'Рахунки' },
    { to: '/pdf-creator', icon: FilePlus, label: t('nav.createPdf') || 'Створити PDF' },
    { to: '/receipts', icon: Receipt, label: t('nav.receipts') || 'Витрати' },
    { to: '/clients', icon: Users, label: t('nav.clients') || 'Клієнти' }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-2 py-1.5">
      <nav className="flex items-center justify-around">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center py-1 px-2 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'text-amber-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <item.icon className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] truncate max-w-[64px]">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
