import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  return (
    <div
      className={`bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl shadow-lg transition-all ${
        onClick ? 'cursor-pointer hover:bg-white/15 hover:border-orange-500/30' : ''
      } ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
