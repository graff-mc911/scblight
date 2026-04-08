import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Building2, Save, Upload, X, CheckCircle, Crown, AlertCircle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useLanguage } from '../contexts/LanguageContext';
import { useToastContext } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

export const Account: React.FC = () => {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToastContext();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [billingSuccess, setBillingSuccess] = useState(false);

  useEffect(() => {
    if (searchParams.get('billing') === 'success') {
      setBillingSuccess(true);
      showSuccess('Ваш 30-денний пробний період розпочато!');
      const p = new URLSearchParams(searchParams);
      p.delete('billing');
      setSearchParams(p, { replace: true });
    }
  }, []);

  const [formData, setFormData] = useState({
    company_name: 'Sovban BAU',
    logo_url: '',
    address: 'Lichtenbergerstr. 22, 64405 Fischbachtal',
    phone: '+4917622613093',
    email: 'Sovbanbau@gmail.com',
    bank_name: 'Sparkasse Dieburg',
    iban: 'DE91 5085 2651 0075 1467 95',
    bic: 'HELADEF1DIE',
    tax_number: '00887031624',
    google_client_ids: '',
  });

  const [uploading, setUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [googleClientIdsError, setGoogleClientIdsError] = useState<string>('');

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_profile')
        .select('*')
        .eq('user_id', session?.user?.id || '')
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!session?.user?.id,
  });

  const { data: subscription } = useQuery({
    queryKey: ['subscription', session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('status, plan, trial_end, current_period_end, cancel_at_period_end')
        .eq('user_id', session?.user?.id || '')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id,
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        company_name: profile.company_name || '',
        logo_url: profile.logo_url || '',
        address: profile.address || '',
        phone: profile.phone || '',
        email: profile.email || '',
        bank_name: profile.bank_name || '',
        iban: profile.iban || '',
        bic: profile.bic || '',
        tax_number: profile.tax_number || '',
        google_client_ids: profile.google_client_ids || '',
      });
      setLogoPreview(profile.logo_url || '');
    }
  }, [profile]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.user?.id) return;

    if (!file.type.startsWith('image/')) {
      showError(t('uploadImageOnly'));
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showError(t('fileSizeLimit'));
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      setFormData({ ...formData, logo_url: publicUrl });
      setLogoPreview(publicUrl);
      showSuccess(t('logoUploaded') || 'Logo uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      showError(t('failedUploadLogo'));
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!session?.user?.id || !formData.logo_url) return;

    try {
      const fileName = formData.logo_url.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('company-logos')
          .remove([`${session.user.id}/${fileName}`]);
      }

      setFormData({ ...formData, logo_url: '' });
      setLogoPreview('');
    } catch (error) {
      console.error('Remove error:', error);
    }
  };

  const validateGoogleClientIds = (value: string): boolean => {
    if (!value.trim()) {
      setGoogleClientIdsError('');
      return true;
    }

    const ids = value.split(',').map(id => id.trim()).filter(id => id);

    const validPatterns = [
      /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.[a-zA-Z0-9._-]+$/,
      /^[0-9]+-[a-zA-Z0-9]+\.apps\.googleusercontent\.com$/,
    ];

    const allValid = ids.every(id =>
      validPatterns.some(pattern => pattern.test(id))
    );

    if (!allValid) {
      setGoogleClientIdsError(t('invalidGoogleClientIdsFormat'));
      return false;
    }

    setGoogleClientIdsError('');
    return true;
  };

  const handleGoogleClientIdsChange = (value: string) => {
    const trimmedValue = value.split(',').map(id => id.trim()).join(', ');
    setFormData({ ...formData, google_client_ids: trimmedValue });
    validateGoogleClientIds(value);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!validateGoogleClientIds(formData.google_client_ids)) {
        throw new Error(t('invalidGoogleClientIdsFormat'));
      }

      if (profile) {
        const { error } = await supabase
          .from('company_profile')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('user_id', session?.user?.id || '');
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('company_profile')
          .insert([{ ...formData, user_id: session?.user?.id }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      showSuccess(t('profileSaved'));
    },
    onError: (error: Error) => {
      if (error.message.includes('Google Client IDs')) {
        showError(googleClientIdsError || t('invalidGoogleClientIdsFormat'));
      } else {
        showError(t('errorSavingProfile'));
      }
    },
  });

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 md:px-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold text-white mb-6">{t('account')}</h1>

      {billingSuccess && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
          <CheckCircle size={18} className="shrink-0" />
          <span>Ваш 30-денний пробний період розпочато. Всі функції розблоковано.</span>
        </div>
      )}

      <div className="space-y-4">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
              <Crown className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h2 className="font-medium text-white">Підписка</h2>
              <p className="text-sm text-white/60">SCB Light Pro</p>
            </div>
          </div>

          {!subscription || subscription.status === 'none' ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl">
              <AlertCircle size={18} className="text-white/40 shrink-0" />
              <p className="text-sm text-white/60 flex-1">Активна підписка відсутня</p>
              <button
                onClick={() => navigate('/paywall')}
                className="shrink-0 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Отримати Pro
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                <div>
                  <p className="text-sm text-white/60 mb-0.5">Статус</p>
                  <div className="flex items-center gap-2">
                    {subscription.status === 'active' || subscription.status === 'trialing' ? (
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-400">
                        <span className="w-2 h-2 bg-green-400 rounded-full" />
                        {subscription.status === 'trialing' ? 'Пробний період' : 'Активна'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-400">
                        <span className="w-2 h-2 bg-red-400 rounded-full" />
                        {subscription.status === 'canceled' ? 'Скасована' : subscription.status}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-white/60 mb-0.5">
                    {subscription.plan === 'yearly' ? 'Річна' : 'Місячна'}
                  </p>
                  <p className="text-sm font-medium text-white">
                    {subscription.plan === 'yearly' ? '€50/рік' : '€5/міс'}
                  </p>
                </div>
              </div>

              {subscription.trial_end && subscription.status === 'trialing' && (
                <p className="text-xs text-white/40 px-1">
                  Пробний період до:{' '}
                  {format(new Date(subscription.trial_end), 'dd.MM.yyyy')}
                </p>
              )}

              {subscription.current_period_end && subscription.status !== 'trialing' && (
                <p className="text-xs text-white/40 px-1">
                  {subscription.cancel_at_period_end
                    ? `Скасовано. Доступ до: ${format(new Date(subscription.current_period_end), 'dd.MM.yyyy')}`
                    : `Наступне списання: ${format(new Date(subscription.current_period_end), 'dd.MM.yyyy')}`}
                </p>
              )}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
              <Building2 className="h-6 w-6 text-orange-400" />
            </div>
            <div>
              <h2 className="font-medium text-white">{t('companyProfile')}</h2>
              <p className="text-sm text-white/60">{t('updateCompanyInfo')}</p>
            </div>
          </div>

          <div className="space-y-5">
            <Input
              label={t('companyName')}
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
            />

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                {t('companyLogo')}
              </label>

              {logoPreview ? (
                <div className="relative inline-block">
                  <img
                    src={logoPreview}
                    alt="Company Logo"
                    className="w-32 h-32 object-contain border border-white/10 rounded-lg bg-white/5 p-2"
                  />
                  <button
                    onClick={handleRemoveLogo}
                    className="absolute -top-2 -right-2 bg-red-500/90 border border-red-600/50 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  type="button"
                  className="flex items-center gap-2 px-4 py-3 bg-white/10 backdrop-blur-xl border border-white/10 rounded-xl text-gray-300 hover:text-white hover:bg-white/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="h-5 w-5" />
                  <span className="text-sm">
                    {uploading ? t('uploading') : t('uploadLogo')}
                  </span>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <p className="text-xs text-white/50 mt-2">
                {t('pngJpgUpTo2mb')}
              </p>
            </div>

            <Input
              label={t('address')}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={t('phone')}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <Input
                label={t('email')}
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <Input
              label={t('bankName')}
              value={formData.bank_name}
              onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={t('iban')}
                value={formData.iban}
                onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
              />
              <Input
                label={t('bic')}
                value={formData.bic}
                onChange={(e) => setFormData({ ...formData, bic: e.target.value })}
              />
            </div>
            <Input
              label={t('taxNumber')}
              value={formData.tax_number}
              onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('googleClientIds')}
              </label>
              <Input
                placeholder={t('googleClientIdsPlaceholder')}
                value={formData.google_client_ids}
                onChange={(e) => handleGoogleClientIdsChange(e.target.value)}
              />
              {googleClientIdsError && (
                <p className="text-xs text-red-500 mt-1">{googleClientIdsError}</p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                {t('googleClientIdsHelp')}
              </p>
            </div>
          </div>

          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !!googleClientIdsError}
            className="w-full mt-6"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? t('saving') : t('save')}
          </Button>
        </Card>
      </div>
    </div>
  );
};
