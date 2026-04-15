import React from 'react';
import { Navigate } from 'react-router-dom';

// --------------------------------------------------
// LOGIN ТЕПЕР НЕ МІСТИТЬ ОКРЕМОЇ ЛОГІКИ.
// Увесь auth живе в Signup.tsx.
// Цей файл лише перекидає на головну auth-сторінку.
// --------------------------------------------------
export const Login: React.FC = () => {
  return <Navigate to="/signup" replace />;
};