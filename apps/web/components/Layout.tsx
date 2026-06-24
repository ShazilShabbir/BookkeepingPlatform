import { useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import clsx from 'clsx';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import BottomNav from '@/components/BottomNav';
import Breadcrumbs from '@/components/Breadcrumbs';
import { BreadcrumbItem, tabLabels, ALL_SIDEBAR_IDS } from '@/lib/navigation';

interface LayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  breadcrumb?: BreadcrumbItem[];
}

export default function Layout({ children, activeTab: externalTab, onTabChange, breadcrumb }: LayoutProps) {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [internalTab, setInternalTab] = useState('dashboard');

  const activeTab = externalTab ?? internalTab;

  const handleTabChange = useCallback((tab: string) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
    setMobileOpen(false);
    if (ALL_SIDEBAR_IDS.includes(tab)) {
      router.push({ pathname: '/dashboard', query: { tab } }, undefined, { shallow: true });
    } else if (tab === 'settings' || tab === 'billing') {
      router.push(`/${tab}`);
    }
  }, [onTabChange, router]);

  const handleToggleSidebar = useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setMobileOpen(prev => !prev);
    } else {
      setSidebarCollapsed(prev => !prev);
    }
  }, []);

  const computedBreadcrumb = breadcrumb ?? [
    { label: 'Dashboard', href: '/dashboard' },
    { label: tabLabels[activeTab] || activeTab },
  ];

  return (
    <div className="h-screen overflow-hidden bg-surface-50">
      <Sidebar
        activeTab={activeTab}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileOpen}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onCloseMobile={() => setMobileOpen(false)}
        onNavigate={handleTabChange}
      />

      <div
        className={clsx(
          'flex flex-col h-full transition-all duration-300',
          sidebarCollapsed ? 'lg:ml-[var(--sidebar-collapsed-width)]' : 'lg:ml-[var(--sidebar-width)]',
        )}
      >
        <TopBar
          onToggleSidebar={handleToggleSidebar}
          breadcrumb={computedBreadcrumb}
        />

        <main className="flex-1 overflow-y-auto pb-[var(--bottomnav-height)] lg:pb-0">
          <div className="sm:hidden px-4 pt-3">
            <Breadcrumbs items={computedBreadcrumb} />
          </div>
          {children}
        </main>
      </div>

      <BottomNav activeTab={activeTab} onChange={handleTabChange} />
    </div>
  );
}