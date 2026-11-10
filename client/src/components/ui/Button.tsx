import React from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className,
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';

  const variants = {
    primary:
      'bg-medical-600 text-white hover:bg-medical-700 focus:ring-medical-500 shadow-sm hover:shadow dark:bg-medical-500 dark:hover:bg-medical-600',
    secondary:
      'bg-navy-100 text-navy-800 hover:bg-navy-200 focus:ring-navy-400 dark:bg-navy-800 dark:text-navy-100 dark:hover:bg-navy-700',
    outline:
      'border border-navy-300 text-navy-700 hover:bg-navy-50 focus:ring-medical-500 dark:border-navy-700 dark:text-navy-200 dark:hover:bg-navy-800',
    danger:
      'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 shadow-sm hover:shadow dark:bg-rose-500 dark:hover:bg-rose-600',
    ghost:
      'text-navy-600 hover:bg-navy-100 hover:text-navy-900 focus:ring-navy-400 dark:text-navy-400 dark:hover:bg-navy-800 dark:hover:text-navy-100',
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  return (
    <button
      className={clsx(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {!isLoading && leftIcon}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};
