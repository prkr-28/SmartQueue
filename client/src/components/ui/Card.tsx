import React from 'react';
import { clsx } from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, hoverable = false, className, ...props }) => {
  return (
    <div
      className={clsx(
        'bg-white dark:bg-navy-900 border border-navy-200 dark:border-navy-800 rounded-xl p-5 shadow-card transition-all',
        hoverable && 'hover:shadow-elevated hover:border-navy-300 dark:hover:border-navy-700 cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
