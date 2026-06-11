import { Button } from '@/components/ui';

interface UpgradePromptProps {
  feature: string;
  inline?: boolean;
  message?: string;
}

export default function UpgradePrompt({ feature, inline, message }: UpgradePromptProps) {
  const content = (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <div className="flex-1">
        <p className="text-sm font-medium text-surface-900">
          {message || `${feature} requires an upgraded plan`}
        </p>
        <p className="text-xs text-surface-500 mt-0.5">
          Upgrade to Pro or Business to unlock this feature and more.
        </p>
      </div>
      <a href="/pricing">
        <Button className="bg-primary-600 hover:bg-primary-700 text-white text-sm shrink-0">
          View Plans
        </Button>
      </a>
    </div>
  );

  if (inline) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" />
      <div className="relative bg-white rounded-2xl shadow-elevated border border-surface-200 w-full max-w-md p-6 animate-scale-in">
        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-surface-900 text-center mb-2">Upgrade Required</h3>
        <p className="text-sm text-surface-500 text-center mb-6">
          {message || `${feature} is available on Pro and Business plans.`}
        </p>
        <div className="flex gap-3">
          <a href="/pricing" className="flex-1">
            <Button className="w-full bg-primary-600 hover:bg-primary-700 text-white">View Plans</Button>
          </a>
        </div>
      </div>
    </div>
  );
}
