import clsx from 'clsx';

interface BottomNavTab {
  id: string;
  label: string;
  icon: string;
}

const tabs: BottomNavTab[] = [
  { id: 'dashboard', label: 'Overview', icon: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z' },
  { id: 'transactions', label: 'Transactions', icon: 'M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L12 12m0 0l2.25-2.25M12 12l-2.25 2.25M5.25 16.5h-.75a.75.75 0 01-.75-.75v-3a.75.75 0 01.75-.75h.75a.75.75 0 01.75.75v3a.75.75 0 01-.75.75z' },
  { id: 'accounts', label: 'Accounting', icon: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33' },
  { id: 'invoices', label: 'Business', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { id: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
];

function getGroupForTab(tab: string): string {
  if (['dashboard', 'reports', 'schedules'].includes(tab)) return 'dashboard';
  if (['import', 'transactions', 'reclassify', 'reconciliation'].includes(tab)) return 'transactions';
  if (['accounts', 'budget', 'custom-reports', 'period-close'].includes(tab)) return 'accounts';
  if (['invoices', 'customers', 'clients', 'team', 'support', 'trash'].includes(tab)) return 'invoices';
  if (['settings', 'billing'].includes(tab)) return 'settings';
  return 'dashboard';
}

interface BottomNavProps {
  activeTab: string;
  onChange: (tab: string) => void;
}

export default function BottomNav({ activeTab, onChange }: BottomNavProps) {
  const activeGroup = getGroupForTab(activeTab);

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[var(--bottomnav-height)] bg-white border-t border-surface-200 z-40 lg:hidden">
      <div className="flex items-center justify-around h-full px-2 relative">
        {tabs.map(tab => {
          const isActive = activeGroup === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                const firstTab: Record<string, string> = {
                  dashboard: 'dashboard',
                  transactions: 'import',
                  accounts: 'accounts',
                  invoices: 'invoices',
                  settings: 'settings',
                };
                onChange(firstTab[tab.id] || tab.id);
              }}
              className={clsx(
                'flex flex-col items-center justify-center gap-0.5 min-w-14 min-h-12 rounded-lg transition-colors duration-200 relative',
                isActive ? 'text-primary-600' : 'text-surface-400 hover:text-surface-600',
              )}
            >
              {isActive && <span className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary-500 rounded-full" />}
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive ? 2 : 1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
              </svg>
              <span className="text-[10px] font-medium leading-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}