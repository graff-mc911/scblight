import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Search, CreditCard as Edit2, Trash2, Eye } from 'lucide-react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useLanguage } from '../contexts/LanguageContext';
import { useToastContext } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { offlineStore } from '../lib/offlineStore';
import { useSubscription } from '../hooks/useSubscription';
import ViewOnlyBanner from '../components/ViewOnlyBanner';

export const Clients: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { showSuccess, showError } = useToastContext();
  const [search, setSearch] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<{ id: string; name: string } | null>(null);
  const queryClient = useQueryClient();
  const { canEdit, isTrialing, trialDaysLeft } = useSubscription();

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients', session?.user?.id],
    queryFn: async () => {
      const userId = session?.user?.id || '';
      if (!navigator.onLine) {
        return offlineStore.getClients(userId);
      }
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });
      if (error) {
        return offlineStore.getClients(userId);
      }
      const rows = data || [];
      await offlineStore.saveClients(rows);
      return rows;
    },
    enabled: !!session?.user?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      showSuccess(t('clientDeleted') || 'Client deleted successfully');
      setDeleteDialogOpen(false);
      setClientToDelete(null);
    },
    onError: () => {
      showError(t('errorDeletingClient') || 'Failed to delete client');
    },
  });

  const handleDeleteClick = useCallback((e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    setClientToDelete({ id, name });
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (clientToDelete) {
      deleteMutation.mutate(clientToDelete.id);
    }
  }, [clientToDelete, deleteMutation]);

  const filteredClients = clients.filter((client) =>
    client.name?.toLowerCase().includes(search.toLowerCase()) ||
    client.email?.toLowerCase().includes(search.toLowerCase()) ||
    client.address?.toLowerCase().includes(search.toLowerCase()) ||
    client.client_number?.toString().includes(search)
  );

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 md:px-6 max-w-6xl mx-auto">
      {!canEdit && <ViewOnlyBanner trialDaysLeft={trialDaysLeft} isTrialing={isTrialing} />}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-white">{t('clients')}</h2>
          <p className="text-white/60 text-sm mt-1">{t('manageClients') || 'Manage your clients'}</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => canEdit ? navigate('/clients/new') : navigate('/settings')}
            className={`p-2.5 rounded-xl backdrop-blur-xl border transition-all active:scale-95 ${canEdit ? 'bg-white/10 border-white/10 text-orange-500 hover:bg-white/20' : 'bg-white/5 border-white/10 text-white/30'}`}
            title={t('addClient') || 'New Client'}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg">
        <div className="relative mb-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder={t('searchClients') || 'Name, address, number...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="px-4 py-3 rounded-xl animate-pulse">
                <div className="h-4 bg-white/10 rounded w-48 mb-2" />
                <div className="h-3 bg-white/5 rounded w-32" />
              </div>
            ))}
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-orange-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Users size={32} className="text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {search ? (t('noSearchResults') || 'No results found') : (t('noClients') || 'No clients yet')}
            </h3>
            <p className="text-white/60 mb-6 text-sm">
              {search ? (t('tryDifferentSearch') || 'Try a different search term') : (t('addFirstClient') || 'Add your first client to get started')}
            </p>
            {!search && (
              <button
                onClick={() => canEdit ? navigate('/clients/new') : navigate('/settings')}
                className="bg-white/10 backdrop-blur-xl border border-white/10 text-orange-500 hover:bg-white/20 px-6 py-2.5 rounded-xl font-medium transition-all active:scale-95"
              >
                {canEdit ? (t('addClient') || 'Add Client') : 'Підписатись'}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_auto] gap-4 px-4 py-2 text-xs font-medium text-white/50 uppercase">
              <div>{t('name') || 'Name'}</div>
              <div>{t('address') || 'Address'}</div>
              <div>{t('clientNumber') || 'Number'}</div>
              <div className="text-right pr-2">{t('actions')}</div>
            </div>

            {filteredClients.map((client, index) => (
              <motion.div
                key={client.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="grid grid-cols-1 md:grid-cols-[2fr_1.5fr_1fr_auto] gap-3 md:gap-4 px-4 py-3 rounded-xl hover:bg-white/5 transition-all cursor-pointer"
                onClick={() => navigate(`/clients/${client.id}/invoices`)}
              >
                <div>
                  <span className="font-medium text-white">{client.name}</span>
                  {client.email && (
                    <div className="text-sm text-white/50 mt-0.5">{client.email}</div>
                  )}
                </div>

                <div className="text-white/60 text-sm truncate">
                  {client.address || '—'}
                </div>

                <div className="text-white/60 text-sm">
                  {client.client_number || '—'}
                </div>

                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/clients/${client.id}/invoices`); }}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-blue-400 transition-all active:scale-95"
                    title={t('view')}
                  >
                    <Eye size={16} />
                  </button>
                  {canEdit && (
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/clients/${client.id}`); }}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-orange-400 transition-all active:scale-95"
                      title={t('edit')}
                    >
                      <Edit2 size={16} />
                    </button>
                  )}
                  {canEdit && (
                    <button
                      onClick={(e) => handleDeleteClick(e, client.id, client.name)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-red-400 transition-all active:scale-95"
                      title={t('delete')}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => { setDeleteDialogOpen(false); setClientToDelete(null); }}
        onConfirm={handleDeleteConfirm}
        title={t('deleteClient') || 'Delete Client'}
        description={`${t('confirmDeleteClient') || 'Are you sure you want to delete'} "${clientToDelete?.name}"? ${t('actionCannotBeUndone') || 'This action cannot be undone.'}`}
      />
    </div>
  );
};
