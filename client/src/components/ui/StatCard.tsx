import React from 'react';
import { Card } from './Card';
import { clsx } from 'clsx';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  description?: string;
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color?: 'teal' | 'blue' | 'amber' | 'rose';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  description,
  icon,
  trend,
  color = 'teal',
}) => {
  const colorBgs = {
    teal: 'bg-medical-50 dark:bg-medical-950/40 text-medical-600 dark:text-medical-400',
    blue: 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400',
    amber: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
    rose: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400',
  };

  const displayText = subtitle || description;

  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return icon;
    }
    const IconComponent = icon as React.ComponentType<{ className?: string }>;
    return <IconComponent className="w-5 h-5" />;
  };

  return (
    <Card className="flex items-center justify-between">
      <div>
        <p className="text-xs font-semibold text-navy-500 dark:text-navy-400 uppercase tracking-wider">{title}</p>
        <h4 className="text-2xl font-bold text-navy-900 dark:text-navy-100 mt-1">{value}</h4>
        {displayText && <p className="text-xs text-navy-500 dark:text-navy-400 mt-1">{displayText}</p>}
        {trend && (
          <p
            className={clsx(
              'text-xs font-medium mt-1 flex items-center gap-1',
              trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            )}
          >
            {trend.isPositive ? '↑' : '↓'} {trend.value}
          </p>
        )}
      </div>
      {icon && <div className={clsx('p-3 rounded-xl', colorBgs[color])}>{renderIcon()}</div>}
    </Card>
  );
};
