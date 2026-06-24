import { ReactNode } from 'react';
import clsx from 'clsx';

interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
  render: (item: T) => ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  emptyMessage?: string;
  loading?: boolean;
  className?: string;
}

export function Table<T>({ columns, data, keyExtractor, onRowClick, sortKey, sortDir, onSort, emptyMessage, loading, className }: TableProps<T>) {
  return (
    <div className={clsx('overflow-x-auto scrollbar-hide -mx-4 sm:mx-0', className)}>
      <table className="w-full border-collapse min-w-[600px] sm:min-w-0">
        <thead>
          <tr className="border-b border-surface-200">
            {columns.map(col => (
              <th
                key={col.key}
                scope="col"
                className={clsx(
                  'px-4 py-3 text-xs font-semibold uppercase tracking-wider text-surface-500',
                  col.align === 'right' && 'text-right',
                  col.align === 'center' && 'text-center',
                  col.sortable && 'cursor-pointer hover:text-surface-700 select-none',
                )}
                style={col.width ? { width: col.width } : undefined}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={sortDir === 'asc' ? 'M4.5 15.75l7.5-7.5 7.5 7.5' : 'M19.5 8.25l-7.5 7.5-7.5-7.5'} />
                    </svg>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-100">
          {loading ? (
            [...Array(5)].map((_, i) => (
              <tr key={i}>
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3">
                    <div className="h-4 bg-surface-100 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-surface-400">
                {emptyMessage || 'No data'}
              </td>
            </tr>
          ) : (
            data.map((item, idx) => (
              <tr
                key={keyExtractor(item)}
                onClick={() => onRowClick?.(item)}
                className={clsx(
                  'animate-slide-up transition-all duration-150',
                  onRowClick && 'cursor-pointer hover:bg-surface-50',
                )}
                style={{ animationDelay: `${idx * 30}ms`, animationFillMode: 'backwards' }}
              >
                {columns.map(col => (
                  <td
                    key={col.key}
                    className={clsx(
                      'px-4 py-3 text-sm text-surface-700',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                    )}
                  >
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}