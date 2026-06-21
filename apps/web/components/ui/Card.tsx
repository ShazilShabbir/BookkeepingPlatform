import { HTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  accent?: 'top' | 'left' | 'none';
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-4 sm:p-6',
  lg: 'p-6 sm:p-8',
};

const accentStyles = {
  top: 'relative before:absolute before:top-0 before:left-4 before:right-4 before:h-0.5 before:bg-gradient-to-r before:from-primary-500 before:to-primary-400 before:rounded-full',
  left: 'relative before:absolute before:left-0 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-primary-500 before:to-primary-400 before:rounded-full',
  none: '',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ hover, padding = 'md', accent = 'none', className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'bg-white rounded-xl shadow-card border border-surface-200',
          hover && 'hover:shadow-card-hover hover:-translate-y-0.5',
          'transition-all duration-200',
          paddingStyles[padding],
          accentStyles[accent],
          'pt-[calc(var(--card-p-top,0px))]',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';
