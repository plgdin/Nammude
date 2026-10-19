import React from 'react';
import { cn } from '@/lib/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]';

    const variants = {
      primary: 'bg-brand hover:bg-brand-hover text-brand-fg shadow-sm',
      secondary: 'bg-surface-elevated hover:bg-surface-active text-gray-100 border border-surface-border',
      outline: 'border border-surface-border hover:bg-surface-elevated text-gray-200 hover:text-white',
      ghost: 'hover:bg-surface-elevated text-gray-300 hover:text-white',
      danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm',
    };

    const sizes = {
      sm: 'h-9 px-3 text-xs rounded-md min-h-[36px]',
      md: 'h-11 px-4 py-2 text-sm rounded-lg min-h-[44px]',
      lg: 'h-13 px-6 py-3 text-base rounded-lg min-h-[48px]',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && (
          <svg
            className="mr-2 h-4 w-4 animate-spin text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
