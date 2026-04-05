import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PaywallCard from '../components/PaywallCard';
import { TopNav } from '../components/TopNav';

export default function Upgrade() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#1a1f24] text-white pb-24 pt-20">
      <TopNav />
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-white/8 hover:bg-white/15 transition-all"
          >
            <ArrowLeft size={18} className="text-white/70" />
          </button>
          <h1 className="text-xl font-semibold text-white">Premium</h1>
        </div>
        <PaywallCard />
      </div>
    </div>
  );
}
