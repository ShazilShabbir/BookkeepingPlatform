import { useState, useMemo } from 'react';

interface TabItem {
  id: string;
  label: string;
}

interface GroupConfig {
  id: string;
  label: string;
  icon: string;
  tabs: TabItem[];
}

const groups: GroupConfig[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zm0 9.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zm0 9.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z',
    tabs: [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'reports', label: 'Reports' },
      { id: 'schedules', label: 'Schedules' },
    ],
  },
  {
    id: 'transactions',
    label: 'Transactions',
    icon: 'M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L12 12m0 0l2.25-2.25M12 12l-2.25 2.25M5.25 16.5h-.75a.75.75 0 01-.75-.75v-3a.75.75 0 01.75-.75h.75a.75.75 0 01.75.75v3a.75.75 0 01-.75.75z',
    tabs: [
      { id: 'import', label: 'Import' },
      { id: 'transactions', label: 'Transactions' },
      { id: 'reclassify', label: 'Reclassify' },
    ],
  },
  {
    id: 'accounting',
    label: 'Accounting',
    icon: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    tabs: [
      { id: 'accounts', label: 'Chart of Accounts' },
      { id: 'reconciliation', label: 'Reconciliation' },
      { id: 'period-close', label: 'Period Close' },
    ],
  },
  {
    id: 'business',
    label: 'Business',
    icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    tabs: [
      { id: 'invoices', label: 'Invoices' },
      { id: 'customers', label: 'Customers' },
      { id: 'clients', label: 'Clients' },
      { id: 'team', label: 'Team' },
      { id: 'support', label: 'Support' },
      { id: 'trash', label: 'Trash' },
    ],
  },
];

export const ALL_TAB_IDS = groups.flatMap(g => g.tabs.map(t => t.id));

interface GroupedTabsProps {
  activeTab: string;
  onChange: (tab: string) => void;
}

export default function GroupedTabs({ activeTab, onChange }: GroupedTabsProps) {
  const currentGroup = useMemo(() => {
    return groups.find(g => g.tabs.some(t => t.id === activeTab)) || groups[0];
  }, [activeTab]);

  const [activeGroup, setActiveGroup] = useState(currentGroup.id);

  const handleGroupChange = (groupId: string) => {
    setActiveGroup(groupId);
    const group = groups.find(g => g.id === groupId);
    if (group) onChange(group.tabs[0].id);
  };

  return (
    <div className="space-y-1">
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => handleGroupChange(g.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              activeGroup === g.id
                ? 'bg-primary-50 text-primary-700 shadow-sm'
                : 'text-surface-500 hover:text-surface-700 hover:bg-surface-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={g.icon} />
            </svg>
            {g.label}
          </button>
        ))}
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide border-b border-surface-200">
        {currentGroup.tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-200 ${
              activeTab === tab.id
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
