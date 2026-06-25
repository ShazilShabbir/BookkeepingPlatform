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
import BudgetPanel from '@/components/BudgetPanel';
import CustomReportList from '@/components/CustomReportList';
import CustomReportBuilder from '@/components/CustomReportBuilder';
import CustomReportViewer from '@/components/CustomReportViewer';
import OnboardingChecklist from '@/components/OnboardingChecklist';
import SetupWizard from '@/components/SetupWizard';

import Head from 'next/head';
import { ALL_SIDEBAR_IDS } from '@/lib/navigation';

const tabTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  accounts: 'Chart of Accounts',
  reclassify: 'Reclassify Entries',
  import: 'Import Data',
  invoices: 'Invoices',
  transactions: 'Transactions',
  customers: 'Customers',
  'period-close': 'Period Close',
  'custom-reports': 'Custom Reports',
  budget: 'Budget',
  reports: 'Financial Reports',
  schedules: 'Report Schedules',
  team: 'Team Members',
  clients: 'Clients',
  support: 'Support Tickets',
  trash: 'Trash',
  reconciliation: 'Reconciliation',
};

export default function Dashboard() {
  const { data: session, status } = useSession();
  const user = useUserStore((state) => state.user);
  const customerUid = useCustomerStore((state) => state.customerUid);
  const customerName = useCustomerStore((state) => state.customerName);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [crView, setCrView] = useState<'list' | 'builder' | 'viewer'>('list');
  const [crReport, setCrReport] = useState<any>(null);
  const [showSetupWizard, setShowSetupWizard] = useState(false);

  const effectiveUserId = useMemo(() => customerUid || user?.id || '', [customerUid, user?.id]);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    setCrView('list');
    setCrReport(null);
    router.push({ query: { ...router.query, tab } }, undefined, { shallow: true });
  }, [router]);

  useEffect(() => {
    const tab = router.query.tab as string;
    if (tab && ALL_SIDEBAR_IDS.includes(tab)) {
      setActiveTab(tab);
    }
  }, [router.query.tab]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const setupCompleted = localStorage.getItem('bookkeep_setup_completed');
    if (!setupCompleted && status === 'authenticated') {
      setShowSetupWizard(true);
    }
  }, [status]);

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
        <title>{tabTitles[activeTab] || 'Dashboard'} | BookKeep</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div className="py-4 sm:py-6 animate-slide-up overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-surface-900">
            {tabTitles[activeTab] || 'Dashboard'}
          </h1>
          {activeTab === 'dashboard' && (
            <p className="text-sm text-surface-500 mt-1">
              {customerUid ? `Viewing ${customerName}'s data` : `Welcome back, ${user.name || user.email}`}
            </p>
          )}
        </div>

        {activeTab === 'dashboard' && (
          <div className="animate-fade-in" key={effectiveUserId}>
            {!customerUid && <OnboardingChecklist />}
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

        {activeTab === 'custom-reports' && (
          <div className="animate-fade-in" key={effectiveUserId}>
            {crView === 'builder' && crReport ? (
              <CustomReportBuilder report={crReport} userId={effectiveUserId} onSaved={() => { setCrView('list'); setCrReport(null); }} onCancel={() => { setCrView('list'); setCrReport(null); }} />
            ) : crView === 'viewer' && crReport ? (
              <CustomReportViewer report={crReport} userId={effectiveUserId} onBack={() => { setCrView('list'); setCrReport(null); }} />
            ) : (
              <CustomReportList userId={effectiveUserId} onEdit={(r) => { setCrReport(r); setCrView('builder'); }} onView={(r) => { setCrReport(r); setCrView('viewer'); }} />
            )}
          </div>
        )}

        {activeTab === 'budget' && (
          <div className="animate-fade-in" key={effectiveUserId}>
            <BudgetPanel userId={effectiveUserId} />
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
      {showSetupWizard && (
        <SetupWizard onComplete={() => setShowSetupWizard(false)} />
      )}
    </>
  );
}

export { getServerSession as getServerSideProps } from '@/lib/getServerSession';
