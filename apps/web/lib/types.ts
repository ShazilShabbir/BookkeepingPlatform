export interface BrandingOptions {
  logo?: string;
  primaryColor?: string;
  companyName?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'superadmin' | 'admin' | 'client' | 'viewer';
  companyName: string;
  branding?: BrandingOptions;
  createdAt: string;
  updatedAt: string;
}

export interface ClientAccount {
  id: string;
  userId: string;
  clientName: string;
  accessToken?: string;
  customFields: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export type SourceType = 'bank-statement' | 'sales-csv' | 'manual' | 'adjustment' | 'import';

export interface JournalEntry {
  id: string;
  userId: string;
  clientId: string;
  date: string;
  description: string;
  source: SourceType;
  sourceFile?: string;
  reference?: string;
  status: 'posted' | 'draft';
  lineCount: number;
  createdAt: string;
  jobId?: string;
}

export interface JournalLine {
  id: string;
  journalEntryId: string;
  userId: string;
  clientId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  debit: number;
  credit: number;
  description?: string;
  rawData?: Record<string, any>;
  ledgerEntryId?: string;
  jobId?: string;
}

export interface LedgerEntry {
  id: string;
  clientId: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  note?: string;
  source: string;
  metadata?: Record<string, any>;
  importedAt: string;
  accountCode?: string;
  accountName?: string;
  accountType?: AccountType;
  journalEntryId?: string;
  jobId?: string;
}

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface Account {
  id: string;
  userId: string;
  code: string;
  name: string;
  type: AccountType;
  normalBalance: 'debit' | 'credit';
  description?: string;
  isActive: boolean;
  parentCode?: string;
  sortOrder: number;
  createdAt: string;
}

export interface CategoryMapping {
  id: string;
  userId: string;
  csvCategory: string;
  accountCode: string;
  createdAt: string;
}

export interface ImportSummary {
  file: string;
  imported: number;
  skipped: number;
  duplicates: number;
  totalIncome: number;
  totalExpenses: number;
  net: number;
}

export interface ReportConfig {
  id: string;
  clientId: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  emailRecipients: string[];
  charts: ChartConfig[];
  filters: ReportFilter;
  createdAt: string;
  updatedAt: string;
}

export interface ChartConfig {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'area';
  title: string;
  metric: 'revenue' | 'profit' | 'expenses' | 'count';
  groupBy?: 'date' | 'category' | 'region' | 'channel' | 'product';
  timeRange?: 'week' | 'month' | 'quarter' | 'year' | 'custom';
  customStart?: string;
  customEnd?: string;
}

export interface ReportFilter {
  startDate?: string;
  endDate?: string;
  categories?: string[];
  regions?: string[];
  channels?: string[];
  minAmount?: number;
  maxAmount?: number;
}

export interface DashboardMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  entryCount: number;
  topCategories: CategoryStat[];
  revenueByCategory: CategoryStat[];
  expensesByCategory: CategoryStat[];
  dailyMetrics: DailyMetric[];
}

export interface CategoryStat {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface DailyMetric {
  date: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export type AmountMode = 'single_with_sign' | 'revenue_and_cost' | 'debit_credit';

export interface CsvMapping {
  dateColumn: string;
  amountColumn: string;
  amountColumn2?: string;
  descriptionColumn?: string;
  categoryColumn?: string;
  amountMode?: AmountMode;
}

export interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean';
  required?: boolean;
  csvColumn: string | null;
}

export interface CsvProfile {
  name: string;
  csvMapping: CsvMapping;
  customFields: CustomField[];
}

export interface ImportJob {
  _id: string;
  userId: string;
  fileName: string;
  filePath: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalRows: number;
  processedRows: number;
  importedEntries: number;
  skippedRows: number;
  errors: { row: number; reason: string }[];
  mapping: Record<string, string>;
  csvMapping?: CsvMapping;
  customFields?: CustomField[];
  customFieldMapping?: Record<string, string>;
  duplicatesSkipped?: number;
  duplicateRows?: { row: number; description: string; date: string; matchedDescription: string }[];
  excludedRows?: number[];
  dedupEnabled?: boolean;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}
