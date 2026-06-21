import { useEffect, useState, useMemo, useCallback } from 'react';
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
import TeamMembers from '@/components/TeamMembers';
import InvoiceList from '@/components/InvoiceList';
import SupportTickets from '@/components/SupportTickets';

import { Tabs } from '@/components/ui';
import Head from 'next/head';
import DashboardHeader from '@/components/DashboardHeader';
import GroupedTabs, { ALL_TAB_IDS } from '@/components/GroupedTabs';

const mobileTabItems = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'reclassify', label: 'Reclassify' },
  { id: 'import', label: 'Import' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'customers', label: 'Customers' },
  { id: 'reconciliation', label: 'Reconcile' },
  { id: 'period-close', label: 'Period Close' },
  { id: 'reports', label: 'Reports' },
  { id: 'schedules', label: 'Schedules' },
  { id: 'team', label: 'Team' },
  { id: 'clients', label: 'Clients' },
  { id: 'support', label: 'Support' },
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

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    router.push({ query: { ...router.query, tab } }, undefined, { shallow: true });
  }, [router]);

  useEffect(() => {
    const tab = router.query.tab as string;
    if (tab && ALL_TAB_IDS.includes(tab)) {
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
      <div className="flex items-center justify-center min-h-[40vh] sm:min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session || !user) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] sm:min-h-[60vh]">
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
      <div className="py-4 sm:py-6 animate-fade-in overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <DashboardHeader
          title="Dashboard"
          subtitle={customerUid ? `Viewing ${customerName}'s data` : `Welcome back, ${user.name || user.email}`}
        />

        <div className="hidden sm:block mb-6">
          <GroupedTabs activeTab={activeTab} onChange={handleTabChange} />
        </div>
        <div className="sm:hidden mb-6">
          <Tabs tabs={mobileTabItems} activeTab={activeTab} onChange={handleTabChange} />
        </div>

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

        {activeTab === 'invoices' && (
          <div className="animate-fade-in" key={effectiveUserId}>
            <InvoiceList userId={effectiveUserId} />
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

        {activeTab === 'team' && (
          <div className="animate-fade-in" key={effectiveUserId}>
            <TeamMembers />
          </div>
        )}

        {activeTab === 'clients' && (
          <div className="animate-fade-in" key={effectiveUserId}>
            <ClientManager userId={effectiveUserId} />
          </div>
        )}

        {activeTab === 'support' && (
          <div className="animate-fade-in" key={effectiveUserId}>
            <SupportTickets userId={effectiveUserId} />
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
