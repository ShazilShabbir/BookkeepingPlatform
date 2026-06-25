import { Button } from '@/components/ui/Button';
import clsx from 'clsx';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export default function EmptyState({ icon, title, description, actionLabel, actionHref, onAction, className }: EmptyStateProps) {
  const handleClick = () => {
    if (onAction) onAction();
    else if (actionHref) window.location.href = actionHref;
  };

  return (
    <div className={clsx('flex flex-col items-center justify-center py-16 px-4', className)}>
      <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-surface-900 mb-1">{title}</h3>
      <p className="text-sm text-surface-500 text-center max-w-sm mb-6">{description}</p>
      {actionLabel && (
        <Button onClick={handleClick}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
