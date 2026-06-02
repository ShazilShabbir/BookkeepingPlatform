import { ReactNode } from 'react';
import clsx from 'clsx';

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div className={clsx('flex space-x-1 border-b border-surface-200', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={clsx(
            'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200',
            'border-b-2 -mb-px',
            activeTab === tab.id
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300',
          )}
        >
          {tab.icon && <span className="shrink-0">{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
