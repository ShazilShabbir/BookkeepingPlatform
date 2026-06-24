import { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';

interface NavItem {
  id: string;
  label: string;
  icon: string;
}

interface NavGroup {
  id: string;
  label: string;
  icon: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zm0 9.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zm0 9.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zm0 9.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zm0 9.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z' },
      { id: 'reports', label: 'Reports', icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z' },
      { id: 'schedules', label: 'Schedules', icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z' },
    ],
  },
  {
    id: 'transactions',
    label: 'Transactions',
    icon: 'M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L12 12m0 0l2.25-2.25M12 12l-2.25 2.25M5.25 16.5h-.75a.75.75 0 01-.75-.75v-3a.75.75 0 01.75-.75h.75a.75.75 0 01.75.75v3a.75.75 0 01-.75.75z',
    items: [
      { id: 'import', label: 'Import', icon: 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5' },
      { id: 'transactions', label: 'Transactions', icon: 'M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5' },
      { id: 'reclassify', label: 'Reclassify', icon: 'M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z' },
    ],
  },
  {
    id: 'accounting',
    label: 'Accounting',
    icon: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    items: [
      { id: 'accounts', label: 'Chart of Accounts', icon: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
      { id: 'budget', label: 'Budget', icon: 'M3 9.75L12 3l9 6.75M3 9.75v7.5c0 .621.504 1.125 1.125 1.125h2.25c.621 0 1.125-.504 1.125-1.125v-4.5c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125v4.5c0 .621.504 1.125 1.125 1.125h2.25c.621 0 1.125-.504 1.125-1.125v-7.5' },
      { id: 'custom-reports', label: 'Custom Reports', icon: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z' },
      { id: 'reconciliation', label: 'Reconciliation', icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
      { id: 'period-close', label: 'Period Close', icon: 'M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z' },
    ],
  },
  {
    id: 'business',
    label: 'Business',
    icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    items: [
      { id: 'invoices', label: 'Invoices', icon: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z' },
      { id: 'customers', label: 'Customers', icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z' },
      { id: 'clients', label: 'Clients', icon: 'M12 21v-2.25m0-11.25V5.25m0 0A2.25 2.25 0 0114.25 3h4.5A2.25 2.25 0 0121 5.25v2.25A2.25 2.25 0 0118.75 9.75h-4.5A2.25 2.25 0 0112 7.5zM2.25 12.75A2.25 2.25 0 014.5 10.5h4.5a2.25 2.25 0 012.25 2.25v2.25a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25v-2.25z' },
      { id: 'team', label: 'Team', icon: 'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z' },
      { id: 'support', label: 'Support', icon: 'M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z' },
      { id: 'trash', label: 'Trash', icon: 'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0' },
    ],
  },
];

const bottomItems = [
  { id: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
];

interface SidebarProps {
  activeTab: string;
  collapsed: boolean;
  mobileOpen?: boolean;
  onToggle: () => void;
  onCloseMobile?: () => void;
  onNavigate: (tab: string) => void;
}

export default function Sidebar({ activeTab, collapsed, mobileOpen = false, onToggle, onCloseMobile, onNavigate }: SidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const g = navGroups.find(grp => grp.items.some(i => i.id === activeTab));
    return new Set(g ? [g.id] : []);
  });

  useEffect(() => {
    const g = navGroups.find(grp => grp.items.some(i => i.id === activeTab));
    if (g) setExpandedGroups(prev => new Set([...prev, g.id]));
  }, [activeTab]);

  const toggleGroup = useCallback((id: string) => {
    if (collapsed) return;
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, [collapsed]);

  const handleNav = useCallback((id: string) => {
    onNavigate(id);
    onCloseMobile?.();
  }, [onNavigate, onCloseMobile]);

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden animate-fade-in" onClick={() => onCloseMobile?.()} aria-label="Close navigation" />
      )}

      <aside
        className={clsx(
          'fixed top-0 left-0 h-full bg-white border-r border-surface-200 z-50 flex flex-col sidebar-transition',
          collapsed ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex items-center h-[var(--topbar-height)] px-4 border-b border-surface-200 shrink-0">
          <a href="/dashboard" className="flex items-center gap-2 min-w-0">
            <svg className="w-8 h-8 text-primary-600 shrink-0" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="currentColor" opacity="0.15" />
              <path d="M10 20V14M16 20V10M22 20V16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {!collapsed && <span className="text-lg font-bold text-surface-900 truncate">BookKeep</span>}
          </a>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-hide">
          {navGroups.map(group => {
            const groupActive = group.items.some(i => i.id === activeTab);
            const groupExpanded = expandedGroups.has(group.id);
            return (
              <div key={group.id}>
                {!collapsed && (
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className={clsx(
                      'flex items-center gap-2 w-full px-2 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors',
                      groupActive ? 'text-primary-600' : 'text-surface-400 hover:text-surface-600',
                    )}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={group.icon} />
                    </svg>
                    <span className="truncate">{group.label}</span>
                    <svg className={clsx('w-3 h-3 ml-auto transition-transform', groupExpanded && 'rotate-90')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
                <div className={clsx('mt-1 space-y-0.5 overflow-hidden transition-all duration-200', !collapsed && !groupExpanded && 'hidden')}>
                  {group.items.map(item => {
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNav(item.id)}
                        className={clsx(
                      'flex items-center gap-3 w-full rounded-lg transition-all duration-200 active:scale-[0.98] relative',
                      collapsed ? 'justify-center h-11 w-11 mx-auto' : 'px-3 h-10',
                      isActive
                        ? 'bg-primary-50 text-primary-700 font-semibold'
                        : 'text-surface-600 hover:text-surface-900 hover:bg-surface-50',
                        )}
                        title={collapsed ? item.label : undefined}
                      >
                        {collapsed ? (
                          <svg className={clsx('w-5 h-5 shrink-0', isActive ? 'text-primary-600' : 'text-surface-400')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                          </svg>
                        ) : (
                          <>
                            {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary-500 rounded-full" />}
                            <span className="text-sm truncate">{item.label}</span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-surface-200 px-3 py-2 shrink-0">
          <button onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} className={clsx('flex items-center gap-3 w-full rounded-lg transition-all duration-200 text-surface-400 hover:text-surface-600 hover:bg-surface-50', collapsed ? 'justify-center h-11 w-11 mx-auto' : 'px-3 h-10')}>
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={collapsed ? 'M3 12h18M15 18l6-6-6-6' : 'M21 12H3M9 18l-6-6 6-6'} />
            </svg>
            {!collapsed && <span className="text-sm truncate">Collapse</span>}
          </button>
          <div className="mt-1">
            {bottomItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={clsx(
                  'flex items-center gap-3 w-full rounded-lg transition-all duration-200 relative',
                  collapsed ? 'justify-center h-11 w-11 mx-auto' : 'px-3 h-10',
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-semibold'
                    : 'text-surface-600 hover:text-surface-900 hover:bg-surface-50',
                )}
                title={collapsed ? item.label : undefined}
              >
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {!collapsed && (
                  <>
                    {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary-500 rounded-full" />}
                    <span className="text-sm truncate">{item.label}</span>
                  </>
                )}
              </button>
            );
          })}
          </div>
        </div>
      </aside>
    </>
  );
}