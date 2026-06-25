export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export const tabLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  reports: 'Reports',
  schedules: 'Schedules',
  import: 'Import',
  transactions: 'Transactions',
  reclassify: 'Reclassify',
  accounts: 'Chart of Accounts',
  budget: 'Budget',
  'custom-reports': 'Custom Reports',
  reconciliation: 'Reconciliation',
  'period-close': 'Period Close',
  invoices: 'Invoices',
  customers: 'Customers',
  clients: 'Clients',
  team: 'Team',
  support: 'Support',
  trash: 'Trash',
  settings: 'Settings',
};

export const ALL_SIDEBAR_IDS = [
  'dashboard', 'reports', 'schedules',
  'import', 'transactions', 'reclassify',
  'accounts', 'budget', 'custom-reports', 'reconciliation', 'period-close',
  'invoices', 'customers', 'clients', 'team', 'support', 'trash',
];
