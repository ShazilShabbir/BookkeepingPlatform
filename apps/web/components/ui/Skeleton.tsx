import clsx from 'clsx';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className, variant = 'text', width, height }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'skeleton-shimmer rounded',
        variant === 'circular' && 'rounded-full',
        variant === 'text' && 'h-4 rounded',
        className,
      )}
      style={{ width, height }}
    />
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-card border border-surface-200 p-6 space-y-3">
      <Skeleton width="60%" />
      <Skeleton width="40%" height="2rem" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-card border border-surface-200 p-6">
      <Skeleton width="40%" className="mb-6" />
      <Skeleton variant="rectangular" height={250} className="w-full" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-xl shadow-card border border-surface-200 overflow-hidden">
      <div className="border-b border-surface-100 p-3 flex gap-4">
        {[...Array(cols)].map((_, i) => (
          <Skeleton key={i} width={`${100 / cols}%`} className="h-4" />
        ))}
      </div>
      {[...Array(rows)].map((_, r) => (
        <div key={r} className="border-b border-surface-50 p-3 flex gap-4">
          {[...Array(cols)].map((_, c) => (
            <Skeleton key={c} width={`${100 / cols}%`} height="0.75rem" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-surface-200 p-5 animate-pulse">
          <div className="h-10 w-10 rounded-lg bg-surface-100 mb-3" />
          <div className="h-3 w-20 bg-surface-100 rounded mb-2" />
          <div className="h-7 w-28 bg-surface-100 rounded" />
        </div>
      ))}
    </div>
  );
}
