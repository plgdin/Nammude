import React from 'react';
import { cn } from '@/lib/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  size = 'md',
  children,
  ...props
}) => {
  const variants = {
    success: 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/60',
    warning: 'bg-amber-950/70 text-amber-400 border border-amber-800/60',
    danger: 'bg-rose-950/70 text-rose-400 border border-rose-800/60',
    info: 'bg-blue-950/70 text-blue-400 border border-blue-800/60',
    neutral: 'bg-surface-elevated text-gray-300 border border-surface-border',
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 rounded-full font-medium',
    md: 'text-xs px-2.5 py-1 rounded-full font-medium',
  };

  return (
    <span className={cn('inline-flex items-center gap-1.5 select-none', variants[variant], sizes[size], className)} {...props}>
      {children}
    </span>
  );
};
