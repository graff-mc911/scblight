import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, X } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSubscription } from '../hooks/useSubscription';
import ViewOnlyBanner from '../components/ViewOnlyBanner';

export const ClientForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { canEdit, isTrialing, trialDaysLeft, isLoading: subLoading } = useSubscription();
  const [formData, setFormData] = useState({
    client_number: '',
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: client } = useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id || '')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (!subLoading && !canEdit && !id) {
      navigate('/settings');
    }
  }, [subLoading, canEdit, id, navigate]);

  useEffect(() => {
    if (client) {
      setFormData({
        client_number: client.client_number || '',
        name: client.name || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
      });
    } else if (!id && session?.user?.id) {
      generateClientNumber();
    }
  }, [client, id, session?.user?.id]);

  const generateClientNumber = async () => {
    if (!session?.user?.id) return;

    const { data } = await supabase
      .from('clients')
      .select('client_number')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let nextNumber = 1;
    if (data?.client_number) {
      const match = data.client_number.match(/\d+$/);
      if (match) {
        nextNumber = parseInt(match[0]) + 1;
      }
    }

    const clientNumber = `CLI-${String(nextNumber).padStart(4, '0')}`;
    setFormData(prev => ({ ...prev, client_number: clientNumber }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (id) {
        const { error } = await supabase
          .from('clients')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('clients')
          .insert([{ ...formData, user_id: session?.user?.id }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      navigate('/clients');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    saveMutation.mutate();
  };

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 md:px-6 max-w-4xl mx-auto">
      {id && !canEdit && <ViewOnlyBanner trialDaysLeft={trialDaysLeft} isTrialing={isTrialing} />}
      <button
        onClick={() => navigate('/clients')}
        className="flex items-center justify-center p-2 bg-white/10 backdrop-blur-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/20 rounded-xl mb-6 transition-all active:scale-95"
        title={t('back')}
      >
        <ArrowLeft className="h-4 w-4" />
      </button>

      <h1 className="text-2xl font-semibold text-white mb-6">
        {id ? t('edit') : t('newClient')}
      </h1>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label={t('clientNumber') || 'Client Number'}
            value={formData.client_number}
            onChange={(e) => setFormData({ ...formData, client_number: e.target.value })}
            disabled={!id}
          />
          <Input
            label={t('clientName')}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label={t('email')}
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <Input
            label={t('phone')}
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          <Textarea
            label={t('address')}
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            rows={3}
          />
          <div className="flex gap-2 pt-2 justify-end">
            <button
              type="button"
              onClick={() => navigate('/clients')}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-gray-300 hover:text-white transition-all active:scale-95"
              title={t('cancel')}
            >
              <X className="h-4 w-4" />
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending || !canEdit}
              className="p-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              title={canEdit ? t('save') : 'Потрібна підписка'}
            >
              <Save className="h-4 w-4" />
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};
