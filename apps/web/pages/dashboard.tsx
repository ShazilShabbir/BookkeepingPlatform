import { useEffect, useState, useMemo } from 'react';
import { useUserStore, useCustomerStore } from '@/lib/store';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import ImportCSV from '@/components/ImportCSV';
import SearchEntries from '@/components/SearchEntries';
import ManageCustomers from '@/components/ManageCustomers';
import UnifiedDashboard from '@/components/UnifiedDashboard';
import Reconcile from '@/components/Reconcile';
import ChartOfAccounts from '@/components/ChartOfAccounts';
import ReclassifyEntries from '@/components/ReclassifyEntries';
import PeriodClose from '@/components/PeriodClose';
import ReportPanel from '@/components/ReportPanel';
import ScheduleManager from '@/components/ScheduleManager';
import ClientManager from '@/components/ClientManager';
import TrashPanel from '@/components/TrashPanel';
import { Tabs } from '@/components/ui';
import Head from 'next/head';

const tabItems = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'accounts', label: 'Chart of Accounts' },
  { id: 'reclassify', label: 'Reclassify' },
  { id: 'import', label: 'Import' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'customers', label: 'Customers' },
  { id: 'reconciliation', label: 'Reconciliation' },
  { id: 'period-close', label: 'Period Close' },
  { id: 'reports', label: 'Reports' },
  { id: 'schedules', label: 'Schedules' },
  { id: 'clients', label: 'Clients' },
  { id: 'trash', label: 'Trash' },
];

export default function Dashboard() {
  const { data: session, status } = useSession();
  const user = useUserStore((state) => state.user);
  const customerUid = useCustomerStore((state) => state.customerUid);
  const customerName = useCustomerStore((state) => state.customerName);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');

  const effectiveUserId = useMemo(() => customerUid || user?.id || '', [customerUid, user?.id]);

  useEffect(() => {
    const tab = router.query.tab as string;
    if (tab && ['accounts', 'reclassify', 'import', 'transactions', 'customers', 'reconciliation', 'period-close', 'reports', 'schedules', 'clients', 'trash'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [router.query.tab]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard | BookKeep</title>
        <meta name="robots" content="noindex" />
      </Head>
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
          <div className="animate-fade-in" key={effectiveUserId}>
            <UnifiedDashboard userId={effectiveUserId} />
          </div>
        )}

        {activeTab === 'accounts' && (
          <div className="animate-fade-in" key={effectiveUserId}>
            <ChartOfAccounts userId={effectiveUserId} />
          </div>
        )}

        {activeTab === 'reclassify' && (
          <div className="animate-fade-in" key={effectiveUserId}>
            <ReclassifyEntries userId={effectiveUserId} />
          </div>
        )}

        {activeTab === 'import' && (
          <div className="animate-fade-in" key={effectiveUserId}>
            {customerUid && (
              <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                Importing data for <strong>{customerName}</strong>
              </div>
            )}
            <ImportCSV userId={effectiveUserId} customerUid={customerUid || undefined} />
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="animate-fade-in" key={effectiveUserId}>
            {customerUid && (
              <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                Viewing transactions for <strong>{customerName}</strong>
              </div>
            )}
            <SearchEntries userId={effectiveUserId} customerUid={customerUid || undefined} />
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="animate-fade-in">
            <ManageCustomers />
          </div>
        )}

        {activeTab === 'period-close' && (
          <div className="animate-fade-in" key={effectiveUserId}>
            <PeriodClose userId={effectiveUserId} />
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="animate-fade-in" key={effectiveUserId}>
            <ReportPanel userId={effectiveUserId} />
          </div>
        )}

        {activeTab === 'schedules' && (
          <div className="animate-fade-in" key={effectiveUserId}>
            <ScheduleManager userId={effectiveUserId} />
          </div>
        )}

        {activeTab === 'clients' && (
          <div className="animate-fade-in" key={effectiveUserId}>
            <ClientManager userId={effectiveUserId} />
          </div>
        )}

        {activeTab === 'trash' && (
          <div className="animate-fade-in" key={effectiveUserId}>
            <TrashPanel userId={effectiveUserId} />
          </div>
        )}

        {activeTab === 'reconciliation' && (
          <div className="animate-fade-in" key={effectiveUserId}>
            {customerUid && (
              <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                Reconciling data for <strong>{customerName}</strong>
              </div>
            )}
            <Reconcile userId={effectiveUserId} />
          </div>
        )}
      </div>
    </div>
    </>
  );
}

export { getServerSession as getServerSideProps } from '@/lib/getServerSession';
