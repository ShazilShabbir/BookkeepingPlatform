import clsx from 'clsx';

interface EmptyStateProps {
  icon?: React.ReactNode;
  illustration?: React.ReactNode;
  title: string;
  description?: string;
  tip?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, illustration, title, description, tip, action, className }: EmptyStateProps) {
  return (
    <div className={clsx('text-center py-12 sm:py-16', className)}>
      {illustration ? (
        <div className="mb-6 flex justify-center">{illustration}</div>
      ) : icon ? (
        <div className="w-14 h-14 rounded-full bg-surface-50 flex items-center justify-center mx-auto mb-4">
          <div className="w-7 h-7 text-surface-400">{icon}</div>
        </div>
      ) : null}
      <h3 className="text-sm font-semibold text-surface-900 mb-1">{title}</h3>
      {description && <p className="text-sm text-surface-500 max-w-sm mx-auto">{description}</p>}
      {tip && <p className="text-xs text-surface-400 max-w-sm mx-auto mt-2 italic">Tip: {tip}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
