import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, Search, Settings, Share2, User } from 'lucide-react';
import { usePdfWorkspace } from '../../lib/pdf/workspaceStore';

export const PDFHeader: React.FC = () => {
  const navigate = useNavigate();
  const setQuickToolsOpen = usePdfWorkspace((s) => s.setQuickToolsOpen);

  const links = [
    { label: 'Продукт', href: '#' },
    { label: 'Плани', href: '#' },
    { label: 'Швидкі інструменти', action: () => setQuickToolsOpen(true) },
    { label: 'Для бізнесу', href: '#' },
    { label: 'Підтримка', href: '#' },
  ];

  return (
    <header className="h-12 flex items-center gap-4 px-4 border-b border-[#e5e7eb] bg-white shrink-0 z-30">
      <button
        type="button"
        onClick={() => navigate('/')}
        className="flex items-center gap-2 shrink-0"
        title="На головну"
      >
        <span className="text-[#e11d48] font-bold text-xl tracking-tight lowercase">scb</span>
        <span className="text-[#64748b] text-xs font-medium hidden sm:inline">PDF</span>
      </button>

      <nav className="hidden md:flex items-center gap-1 flex-1 min-w-0">
        {links.map((link) =>
          link.action ? (
            <button
              key={link.label}
              type="button"
              onClick={link.action}
              className="px-3 py-1.5 text-[13px] text-[#334155] hover:text-[#0f172a] hover:bg-[#f1f5f9] rounded-md transition-colors whitespace-nowrap"
            >
              {link.label}
            </button>
          ) : (
            <a
              key={link.label}
              href={link.href}
              className="px-3 py-1.5 text-[13px] text-[#334155] hover:text-[#0f172a] hover:bg-[#f1f5f9] rounded-md transition-colors whitespace-nowrap"
            >
              {link.label}
            </a>
          ),
        )}
      </nav>

      <div className="flex items-center gap-1 ml-auto">
        <button
          type="button"
          onClick={() => setQuickToolsOpen(true)}
          className="md:hidden px-2 py-1.5 text-xs font-medium text-[#2563eb] hover:bg-[#eff6ff] rounded-md"
        >
          Інструменти
        </button>
        <button type="button" className="p-2 rounded-full hover:bg-[#f1f5f9] text-[#64748b]" title="Пошук">
          <Search size={18} />
        </button>
        <button type="button" className="p-2 rounded-full hover:bg-[#f1f5f9] text-[#64748b]" title="Поділитися">
          <Share2 size={18} />
        </button>
        <button type="button" className="p-2 rounded-full hover:bg-[#f1f5f9] text-[#64748b]" title="Допомога">
          <HelpCircle size={18} />
        </button>
        <button type="button" className="p-2 rounded-full hover:bg-[#f1f5f9] text-[#64748b]" title="Налаштування">
          <Settings size={18} />
        </button>
        <button
          type="button"
          onClick={() => navigate('/account')}
          className="ml-1 w-8 h-8 rounded-full bg-[#3b82f6] text-white flex items-center justify-center"
          title="Акаунт"
        >
          <User size={16} />
        </button>
      </div>
    </header>
  );
};
