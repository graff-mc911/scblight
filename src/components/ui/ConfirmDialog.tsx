import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { useLanguage } from '../../contexts/LanguageContext';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onClose: () => void;
  type?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmText,
  cancelText,
  onConfirm,
  onClose,
  type = 'danger',
}) => {
  const { t } = useLanguage();
  const colors = {
    danger: 'text-red-600',
    warning: 'text-orange-600',
    info: 'text-blue-600',
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-white/10 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl max-w-md w-full p-6 z-10"
          >
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 ${colors[type]}`}>
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-white/70 mb-6">{description}</p>
                <div className="flex gap-3 justify-end">
                  <Button
                    type="button"
                    onClick={onClose}
                    variant="secondary"
                  >
                    {cancelText || t('cancel')}
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => {
                      onConfirm();
                      onClose();
                    }}
                  >
                    {confirmText || t('delete')}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
