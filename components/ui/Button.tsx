
import React, { useEffect } from 'react';

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'type'> {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'gold' | 'danger' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  iconOnly?: boolean;
  type?: 'button' | 'submit';
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  iconOnly = false,
  disabled,
  type = 'button',
  className = '',
  'aria-label': ariaLabel,
  ...buttonProps
}: ButtonProps) {
  useEffect(() => {
    if ((import.meta as any).env?.DEV && iconOnly && !ariaLabel) {
      console.warn('Button with iconOnly requires an aria-label.');
    }
  }, [ariaLabel, iconOnly]);

  const baseStyle = 'relative inline-flex items-center justify-center rounded-lg font-semibold transition-colors duration-150 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

  const variants = {
    primary: 'bg-brand-900 text-white shadow-sm hover:bg-brand-800',
    secondary: 'border border-brand-900/70 bg-white text-brand-900 hover:bg-brand-50',
    gold: 'bg-gold-gradient text-brand-900 shadow-sm hover:brightness-105',
    danger: 'border border-red-300 bg-white text-red-700 shadow-sm hover:border-red-400 hover:bg-red-50 dark:border-red-800 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-950/40',
    warning: 'border border-amber-300 bg-amber-50 text-amber-800 shadow-sm hover:border-amber-400 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200 dark:hover:bg-amber-950/50',
  };
  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-11 px-5 text-base',
  };
  const width = iconOnly ? 'w-auto aspect-square px-0' : 'w-full';

  return (
    <button
      aria-busy={loading}
      aria-label={ariaLabel}
      type={type}
      disabled={disabled || loading}
      className={`${baseStyle} ${sizes[size]} ${width} ${variants[variant]} ${className}`}
      {...buttonProps}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="absolute h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      ) : null}
      <span className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap ${loading ? 'invisible' : ''}`}>{children}</span>
    </button>
  );
}
