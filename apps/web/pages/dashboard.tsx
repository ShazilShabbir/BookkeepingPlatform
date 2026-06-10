import { useEffect, useState, useMemo } from 'react';
import { useUserStore, useCustomerStore } from '@/lib/store';
import { useRouter } from 'next/router';
import ImportCSV from '@/components/ImportCSV';
import SearchEntries from '@/components/SearchEntries';
import ManageCustomers from '@/components/ManageCustomers';
import UnifiedDashboard from '@/components/UnifiedDashboard';
import { Tabs } from '@/components/ui';

const tabItems = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'import', label: 'Import' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'customers', label: 'Customers' },
];

export default function Dashboard() {
  const user = useUserStore((state) => state.user);
  const customerUid = useCustomerStore((state) => state.customerUid);
  const customerName = useCustomerStore((state) => state.customerName);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');

  const effectiveUserId = useMemo(() => customerUid || user?.id || '', [customerUid, user?.id]);

  useEffect(() => {
    const tab = router.query.tab as string;
    if (tab && ['import', 'transactions', 'customers'].includes(tab)) {
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
            <p className="mt-1 text-surface-500">
              {customerUid ? `Viewing ${customerName}'s data` : `Welcome back, ${user.name || user.email}`}
            </p>
          </div>
        </div>

        <Tabs tabs={tabItems} activeTab={activeTab} onChange={setActiveTab} className="mb-8" />

        {activeTab === 'dashboard' && (
          <div className="animate-fade-in">
            <UnifiedDashboard userId={effectiveUserId} />
          </div>
        )}

        {activeTab === 'import' && (
          <div className="animate-fade-in">
            {customerUid && (
              <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                Importing data for <strong>{customerName}</strong>
              </div>
            )}
            <ImportCSV userId={effectiveUserId} />
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="animate-fade-in">
            {customerUid && (
              <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                Viewing transactions for <strong>{customerName}</strong>
              </div>
            )}
            <SearchEntries userId={effectiveUserId} />
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="animate-fade-in">
            <ManageCustomers />
          </div>
        )}
      </div>
    </div>
  );
}
