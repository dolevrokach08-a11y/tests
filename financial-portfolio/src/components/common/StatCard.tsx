import { clsx } from 'clsx';
import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: ReactNode;
  trend?: 'positive' | 'negative' | 'neutral';
  className?: string;
}

export function StatCard({
  label,
  value,
  subValue,
  icon,
  trend = 'neutral',
  className,
}: StatCardProps) {
  return (
    <div className={clsx('stat-card', className)}>
      <div className="flex items-center justify-between">
        <span className="stat-label">{label}</span>
        {icon && <span className="text-gray-400">{icon}</span>}
      </div>
      <span
        className={clsx('stat-value', {
          positive: trend === 'positive',
          negative: trend === 'negative',
        })}
      >
        {value}
      </span>
      {subValue && (
        <span
          className={clsx('text-sm', {
            'text-green-500': trend === 'positive',
            'text-red-500': trend === 'negative',
            'text-gray-500': trend === 'neutral',
          })}
        >
          {subValue}
        </span>
      )}
    </div>
  );
}
