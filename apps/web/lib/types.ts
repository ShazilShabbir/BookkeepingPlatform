export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'client' | 'viewer';
  companyName: string;
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
