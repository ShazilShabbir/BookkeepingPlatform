import { useEffect, useState } from 'react';
import { useUserStore } from '@/lib/store';
import { useRouter } from 'next/router';
import DashboardMetrics from '@/components/DashboardMetrics';
import RevenueChart from '@/components/RevenueChart';
import ExpenseChart from '@/components/ExpenseChart';
import ImportCSV from '@/components/ImportCSV';
import ReportPanel from '@/components/ReportPanel';
import ClientManager from '@/components/ClientManager';
import { Tabs } from '@/components/ui';

const tabItems = [
  { id: 'overview', label: 'Overview' },
  { id: 'import', label: 'Import Data' },
  { id: 'reports', label: 'Reports' },
  { id: 'clients', label: 'Clients' },
];

export default function Dashboard() {
  const user = useUserStore((state) => state.user);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const tab = router.query.tab as string;
    if (tab && ['import', 'reports', 'clients'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [router.query.tab]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="py-8 animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">Dashboard</h1>
            <p className="mt-1 text-surface-500">Welcome back, {user.name || user.email}</p>
          </div>
        </div>

        <Tabs tabs={tabItems} activeTab={activeTab} onChange={setActiveTab} className="mb-8" />

        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            <DashboardMetrics userId={user.id} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RevenueChart userId={user.id} />
              <ExpenseChart userId={user.id} />
            </div>
          </div>
        )}

        {activeTab === 'import' && (
          <div className="animate-fade-in">
            <ImportCSV userId={user.id} />
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="animate-fade-in">
            <ReportPanel userName={user.name || user.email || ''} />
          </div>
        )}

        {activeTab === 'clients' && (
          <div className="animate-fade-in">
            <ClientManager />
          </div>
        )}
      </div>
    </div>
  );
}
