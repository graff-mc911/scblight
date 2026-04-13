import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, X } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { useLanguage } from '../contexts/LanguageContext';
import { useToastContext } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const ClientForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useLanguage();
  const { showSuccess, showError } = useToastContext();
  const queryClient = useQueryClient();

  // Дані форми
  const [formData, setFormData] = useState({
    client_number: '',
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  // Отримуємо поточну сесію
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    },
  });

  // Якщо це режим редагування — завантажуємо клієнта
  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ['client', id, session?.user?.id],
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

  // Коли клієнт завантажився — заповнюємо форму
  useEffect(() => {
    if (client) {
      setFormData({
        client_number: client.client_number || '',
        name: client.name || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
      });
    }
  }, [client]);

  // Якщо створюється новий клієнт — генеруємо номер
  useEffect(() => {
    if (!id && session?.user?.id) {
      void generateClientNumber();
    }
  }, [id, session?.user?.id]);

  // Генерація наступного номера клієнта
  const generateClientNumber = async () => {
    if (!session?.user?.id) return;

    const { data, error } = await supabase
      .from('clients')
      .select('client_number')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Помилка генерації номера клієнта:', error);
      showError('Не вдалося згенерувати номер клієнта');
      return;
    }

    let nextNumber = 1;

    if (data?.client_number) {
      const match = data.client_number.match(/\d+$/);
      if (match) {
        nextNumber = parseInt(match[0], 10) + 1;
      }
    }

    const clientNumber = `CLI-${String(nextNumber).padStart(4, '0')}`;

    setFormData((prev) => ({
      ...prev,
      client_number: clientNumber,
    }));
  };

  // Збереження клієнта
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Перевіряємо авторизацію
      if (!session?.user?.id) {
        throw new Error('Користувач не авторизований');
      }

      // Мінімальна валідація
      const normalizedName = formData.name.trim();
      const normalizedEmail = formData.email.trim().toLowerCase();
      const normalizedPhone = formData.phone.trim();
      const normalizedAddress = formData.address.trim();
      const normalizedClientNumber = formData.client_number.trim();

      if (!normalizedName) {
        throw new Error("Введіть ім'я клієнта");
      }

      if (!normalizedClientNumber) {
        throw new Error('Не вдалося сформувати номер клієнта');
      }

      const payload = {
        client_number: normalizedClientNumber,
        name: normalizedName,
        email: normalizedEmail,
        phone: normalizedPhone,
        address: normalizedAddress,
        user_id: session.user.id,
      };

      if (id) {
        const { error } = await supabase
          .from('clients')
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('user_id', session.user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('clients').insert([payload]);

        if (error) throw error;
      }
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clients'] });
      showSuccess(t('clientSaved') || 'Клієнта збережено');
      navigate('/clients');
    },

    onError: (error: any) => {
      console.error('Помилка збереження клієнта:', error);
      showError(error?.message || t('errorSavingClient') || 'Не вдалося зберегти клієнта');
    },
  });

  // Відправка форми
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  const isPageLoading = sessionLoading || (Boolean(id) && clientLoading);

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 md:px-6 max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/clients')}
        className="flex items-center justify-center p-2 bg-white/10 backdrop-blur-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/20 rounded-xl mb-6 transition-all active:scale-95"
        title={t('back')}
        type="button"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>

      <h1 className="text-2xl font-semibold text-white mb-6">
        {id ? t('edit') || 'Редагувати' : t('newClient') || 'Новий клієнт'}
      </h1>

      <Card className="p-6">
        {isPageLoading ? (
          <p className="text-white/60">{t('loading') || 'Завантаження'}...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label={t('clientNumber') || 'Номер клієнта'}
              value={formData.client_number}
              onChange={(e) =>
                setFormData({ ...formData, client_number: e.target.value })
              }
              disabled={!id}
            />

            <Input
              label={t('clientName') || "Ім'я клієнта"}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <Input
              label={t('email') || 'Email'}
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />

            <Input
              label={t('phone') || 'Телефон'}
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />

            <Textarea
              label={t('address') || 'Адреса'}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={3}
            />

            <div className="flex gap-2 pt-2 justify-end">
              <button
                type="button"
                onClick={() => navigate('/clients')}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-gray-300 hover:text-white transition-all active:scale-95"
                title={t('cancel') || 'Скасувати'}
              >
                <X className="h-4 w-4" />
              </button>

              <button
                type="submit"
                disabled={
                  saveMutation.isPending ||
                  !session?.user?.id ||
                  !formData.client_number.trim()
                }
                className="p-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-all active:scale-95 disabled:opacity-50"
                title={t('save') || 'Зберегти'}
              >
                <Save className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};