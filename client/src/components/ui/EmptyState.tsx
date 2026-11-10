import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-navy-200 dark:border-navy-800 rounded-2xl bg-white/50 dark:bg-navy-900/50">
      {icon && <div className="p-3 bg-medical-50 dark:bg-medical-950/60 text-medical-600 dark:text-medical-400 rounded-2xl mb-3">{icon}</div>}
      <h3 className="text-base font-semibold text-navy-900 dark:text-navy-100">{title}</h3>
      <p className="text-sm text-navy-500 dark:text-navy-400 max-w-sm mt-1">{description}</p>
      {actionText && onAction && (
        <div className="mt-4">
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionText}
          </Button>
        </div>
      )}
    </div>
  );
};
