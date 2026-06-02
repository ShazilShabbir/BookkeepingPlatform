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
