import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../components/ui/Card';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

export const ClientView: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useLanguage();

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: client, isLoading } = useQuery({
    queryKey: ['client-view', id, session?.user?.id],
    queryFn: async () => {
      if (!id || !session?.user?.id) return null;

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id && !!session?.user?.id,
  });

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 md:px-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={() => navigate('/clients')}
          className="flex items-center justify-center p-2 bg-white/10 border border-white/10 text-gray-300 hover:text-white hover:bg-white/20 rounded-xl"
          title={t('back') || 'Назад'}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        {id && (
          <button
            type="button"
            onClick={() => navigate(`/clients/${id}/edit`)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Pencil className="h-4 w-4" />
            <span>{t('edit') || 'Редагувати'}</span>
          </button>
        )}
      </div>

      <Card className="p-6">
        {isLoading ? (
          <p className="text-white/60">{t('loading') || 'Завантаження'}...</p>
        ) : !client ? (
          <p className="text-white/60">Контакт не знайдено</p>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-white/50">{t('clientNumber') || 'Номер клієнта'}</p>
              <p className="text-white">{client.client_number || '-'}</p>
            </div>

            <div>
              <p className="text-sm text-white/50">{t('clientName') || "Ім'я клієнта"}</p>
              <p className="text-white">{client.name || '-'}</p>
            </div>

            <div>
              <p className="text-sm text-white/50">{t('email') || 'Email'}</p>
              <p className="text-white">{client.email || '-'}</p>
            </div>

            <div>
              <p className="text-sm text-white/50">{t('phone') || 'Телефон'}</p>
              <p className="text-white">{client.phone || '-'}</p>
            </div>

            <div>
              <p className="text-sm text-white/50">{t('address') || 'Адреса'}</p>
              <p className="text-white whitespace-pre-line">{client.address || '-'}</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};