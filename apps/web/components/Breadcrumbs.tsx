import clsx from 'clsx';
import { BreadcrumbItem } from '@/lib/navigation';

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (!items || items.length === 0) return null;

  return (
    <nav className={clsx('flex items-center gap-1.5 text-sm min-w-0', className)}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && (
              <svg className="w-3.5 h-3.5 text-surface-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            )}
            {item.href && !isLast ? (
              <a
                href={item.href}
                className="text-surface-500 hover:text-surface-700 truncate transition-colors max-w-[120px] sm:max-w-[200px]"
              >
                {item.label}
              </a>
            ) : (
              <span className={clsx(
                'truncate max-w-[120px] sm:max-w-[200px]',
                isLast ? 'text-surface-900 font-medium' : 'text-surface-500',
              )}>
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}