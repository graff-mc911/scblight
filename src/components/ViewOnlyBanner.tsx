import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Clock } from 'lucide-react';

interface ViewOnlyBannerProps {
  trialDaysLeft: number | null;
  isTrialing?: boolean;
}

const ViewOnlyBanner: React.FC<ViewOnlyBannerProps> = ({ trialDaysLeft, isTrialing }) => {
  const navigate = useNavigate();

  if (isTrialing && trialDaysLeft !== null && trialDaysLeft > 0) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-orange-500/10 border border-orange-500/20 rounded-xl mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <Clock className="h-4 w-4 text-orange-400 shrink-0" />
          <p className="text-sm text-orange-300">
            Пробний період: залишилось <span className="font-semibold">{trialDaysLeft} {trialDaysLeft === 1 ? 'день' : trialDaysLeft < 5 ? 'дні' : 'днів'}</span>
          </p>
        </div>
        <button
          onClick={() => navigate('/settings')}
          className="shrink-0 text-xs px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-all font-medium"
        >
          Підписатись
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-xl mb-4">
      <div className="flex items-center gap-2.5 min-w-0">
        <Lock className="h-4 w-4 text-white/50 shrink-0" />
        <p className="text-sm text-white/60">
          Режим перегляду. Для редагування потрібна підписка.
        </p>
      </div>
      <button
        onClick={() => navigate('/settings')}
        className="shrink-0 text-xs px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-all font-medium"
      >
        Підписатись
      </button>
    </div>
  );
};

export default ViewOnlyBanner;
