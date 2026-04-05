import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  active = false,
  className = '',
  children,
  ...props
}) => {
  const baseStyles = 'font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-xl border border-white/10 rounded-xl hover:bg-white/20 active:scale-95';

  const variants = {
    primary: active ? 'text-orange-500' : 'text-gray-300 hover:text-white',
    secondary: 'text-gray-300 hover:text-white',
    danger: 'text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/20'
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-6 py-2.5 text-base',
    lg: 'px-8 py-3 text-lg'
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
