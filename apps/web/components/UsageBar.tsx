import clsx from 'clsx';

interface UsageBarProps {
  used: number;
  limit: number | string;
  label: string;
}

export default function UsageBar({ used, limit, label }: UsageBarProps) {
  if (limit === 'Unlimited') return null;

  const numericLimit = limit as number;
  const percent = Math.min(100, Math.round((used / numericLimit) * 100));
  const isOver = used >= numericLimit;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-surface-500">{label}</span>
        <span className={clsx('font-medium', isOver ? 'text-red-600' : 'text-surface-700')}>
          {used.toLocaleString()} / {numericLimit.toLocaleString()}
        </span>
      </div>
      <div className="w-full bg-surface-100 rounded-full h-1.5 overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-500', isOver ? 'bg-red-500' : percent > 80 ? 'bg-amber-500' : 'bg-primary-500')}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
