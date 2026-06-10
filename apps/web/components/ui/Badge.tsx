import { HTMLAttributes } from 'react';
import clsx from 'clsx';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-surface-100 text-surface-700',
  primary: 'bg-indigo-50 text-indigo-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
  info: 'bg-blue-50 text-blue-700',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

export function Badge({ variant = 'default', size = 'sm', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
