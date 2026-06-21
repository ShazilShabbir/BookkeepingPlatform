import { Button } from '@/components/ui';

const actions = [
  { id: 'import', label: 'Import Data', icon: 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5', color: 'text-primary-600 bg-primary-50 hover:bg-primary-100' },
  { id: 'transactions', label: 'Add Entry', icon: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' },
  { id: 'invoices', label: 'New Invoice', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' },
  { id: 'reports', label: 'Run Report', icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z', color: 'text-blue-600 bg-blue-50 hover:bg-blue-100' },
];

export default function QuickActions({ onAction }: { onAction: (tabId: string) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {actions.map((a) => (
        <button
          key={a.id}
          onClick={() => onAction(a.id)}
          className={`flex items-center gap-3 p-3 sm:p-4 rounded-xl border border-surface-200 bg-white transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 ${a.color}`}
        >
          <div className={`p-2 rounded-lg shrink-0 ${a.color}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={a.icon} />
            </svg>
          </div>
          <span className="text-sm font-medium text-surface-700">{a.label}</span>
        </button>
      ))}
    </div>
  );
}
