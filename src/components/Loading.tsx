import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export function Loading() {
  const { t } = useLanguage();

  return (
    <div className="flex items-center justify-center min-h-screen bg-dark-700">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 text-lg">{t('loadingMessage')}</p>
      </div>
    </div>
  );
}
