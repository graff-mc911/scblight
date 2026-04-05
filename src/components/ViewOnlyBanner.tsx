import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';

export default function ViewOnlyBanner() {
  const navigate = useNavigate();

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3">
      <div className="flex items-center gap-2">
        <Lock size={14} className="text-amber-400 flex-shrink-0" />
        <span className="text-sm text-amber-300">View-only mode. Upgrade to unlock editing.</span>
      </div>
      <button
        onClick={() => navigate('/upgrade')}
        className="flex-shrink-0 text-xs font-medium text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
      >
        Upgrade
      </button>
    </div>
  );
}
