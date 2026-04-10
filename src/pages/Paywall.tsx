import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Zap, ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

const MONTHLY_LINK = 'https://buy.stripe.com/test_bJe14o2ip6Oe99f0N49oc00';
const YEARLY_LINK = 'https://buy.stripe.com/test_eVq5kEbSZ0pQ5X3dzQ9oc01';

const FEATURES = [
  'Необмежена кількість рахунків',
  'Необмежена кількість клієнтів',
  'Генерація PDF рахунків',
  'Сканер та OCR квитанцій',
  'Створення PDF документів',
  'Хмарна синхронізація',
  'Підпис на документах',
  'Мультимовний інтерфейс',
];

export const Paywall: React.FC = () => {
  const navigate = useNavigate();

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const buildLink = (base: string) => {
    if (!session?.user) return base;
    const params = new URLSearchParams({
      client_reference_id: session.user.id,
      prefilled_email: session.user.email ?? '',
    });
    return `${base}?${params.toString()}`;
  };

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 md:px-6 max-w-2xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-6 text-sm"
      >
        <ArrowLeft size={16} />
        Назад
      </button>

      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-orange-500/20 rounded-2xl mb-4">
          <Zap className="h-7 w-7 text-orange-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">SCB Light Pro</h1>
        <p className="text-white/60 text-base max-w-md mx-auto">
          Отримайте доступ до всіх функцій. Почніть з 30-денного безкоштовного пробного
          періоду — без прихованих платежів.
        </p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-8">
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-3 text-sm text-white/80">
              <div className="shrink-0 w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Check size={12} className="text-orange-400" />
              </div>
              {f}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a
          href={buildLink(MONTHLY_LINK)}
          className="block bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/15 hover:border-white/20 transition-all group"
        >
          <p className="text-white/60 text-sm mb-1">Щомісяця</p>
          <p className="text-3xl font-bold text-white mb-1">
            €5<span className="text-lg font-normal text-white/60">/міс</span>
          </p>
          <p className="text-white/40 text-xs mb-5">30 днів безкоштовно</p>
          <div className="w-full py-2.5 bg-white/10 border border-white/10 rounded-xl text-center text-sm text-white/80 group-hover:bg-white/20 transition-all">
            Розпочати
          </div>
        </a>

        <a
          href={buildLink(YEARLY_LINK)}
          className="block bg-orange-500/10 backdrop-blur-xl border border-orange-500/30 rounded-2xl p-6 hover:bg-orange-500/15 transition-all group relative"
        >
          <div className="absolute top-3 right-3 bg-orange-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
            -17%
          </div>
          <p className="text-white/60 text-sm mb-1">Щорічно</p>
          <p className="text-3xl font-bold text-white mb-1">
            €50<span className="text-lg font-normal text-white/60">/рік</span>
          </p>
          <p className="text-white/40 text-xs mb-5">€4.17/міс &bull; 30 днів безкоштовно</p>
          <div className="w-full py-2.5 bg-orange-500 rounded-xl text-center text-sm text-white font-medium group-hover:bg-orange-600 transition-all">
            Розпочати
          </div>
        </a>
      </div>

      <p className="text-center text-white/30 text-xs mt-6">
        Скасувати можна будь-коли. Безпечна оплата через Stripe.
      </p>
    </div>
  );
};
