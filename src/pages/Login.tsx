import React from 'react';
import Auth from '../components/Auth';

// --------------------------------------------------
// Сторінка входу
// Просто використовує загальний Auth-компонент
// у режимі login.
// --------------------------------------------------
export const Login: React.FC = () => {
  return (
    <Auth
      t={{}}
      onAuthSuccess={() => {
        window.location.href = '/';
      }}
    />
  );
};