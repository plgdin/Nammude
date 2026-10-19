import React from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, icon, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-gray-300">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && <div className="absolute left-3.5 text-gray-400 pointer-events-none">{icon}</div>}
          <input
            id={inputId}
            type={type}
            ref={ref}
            className={cn(
              'flex h-11 w-full rounded-lg border border-surface-border bg-surface-elevated px-3.5 py-2 text-sm text-gray-100 placeholder:text-gray-500 transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:cursor-not-allowed disabled:opacity-50',
              icon && 'pl-10',
              error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-rose-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
