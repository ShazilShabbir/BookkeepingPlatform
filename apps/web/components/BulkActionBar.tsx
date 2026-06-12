import { Button } from '@/components/ui';

interface BulkAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
}

interface BulkActionBarProps {
  selectedCount: number;
  actions: BulkAction[];
  onClear: () => void;
}

export default function BulkActionBar({ selectedCount, actions, onClear }: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky bottom-4 z-30 flex items-center justify-between bg-surface-900 text-white rounded-xl px-5 py-3 shadow-elevated mx-auto max-w-2xl">
      <span className="text-sm font-medium">
        {selectedCount} selected
      </span>
      <div className="flex items-center gap-2">
        {actions.map((action, i) => (
          <Button
            key={i}
            size="sm"
            variant={action.variant === 'danger' ? 'danger' : action.variant === 'secondary' ? 'secondary' : 'primary'}
            onClick={action.onClick}
            loading={action.loading}
          >
            {action.label}
          </Button>
        ))}
        <button
          onClick={onClear}
          className="ml-2 text-xs text-surface-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
