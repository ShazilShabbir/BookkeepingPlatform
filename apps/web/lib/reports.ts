import dbConnect from '@/lib/mongoose';
import JournalEntry from '@/lib/models/JournalEntry';
import JournalLine from '@/lib/models/JournalLine';
import Account from '@/lib/models/Account';
import ExchangeRate from '@/lib/models/ExchangeRate';
import { convertJournalLines } from '@/lib/currency';

export interface BrandingOptions {
  logo?: string;
  primaryColor?: string;
  companyName?: string;
}

export interface AccountBalanceDetail {
  accountCode: string;
  accountName: string;
  balance: number;
}

export interface StatementSection {
  title: string;
  type: string;
  total: number;
  accounts: AccountBalanceDetail[];
}

export interface FinancialStatements {
  profitLoss: {
    sections: StatementSection[];
    netIncome: number;
    netIncomeRatio: number;
  };
  balanceSheet: {
    sections: StatementSection[];
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
  };
  dateRange: { start: string | null; end: string | null };
  baseCurrency: string;
}

export interface CashFlowItem {
  accountCode: string;
  accountName: string;
  amount: number;
}

export interface CashFlowSection {
  title: string;
  items: CashFlowItem[];
  total: number;
}

export interface CashFlowReport {
  sections: CashFlowSection[];
  totalChange: number;
}

function defaultNormalBalance(type: string): string {
  return ['revenue', 'liability', 'equity'].includes(type) ? 'credit' : 'debit';
}

export async function getFinancialStatements(
  userId: string,
  startDate?: string | null,
  endDate?: string | null,
  baseCurrency: string = 'USD',
): Promise<FinancialStatements> {
  if (startDate && endDate && startDate > endDate) {
    throw new Error('Start date must be before end date');
  }

  await dbConnect();

  const accountDocs = await Account.find({ userId, isActive: true }).lean();
  const accountMap = new Map<string, { name: string; type: string; normalBalance: string; currency: string }>();
  for (const a of accountDocs) {
    accountMap.set(a.code, { name: a.name, type: a.type, normalBalance: a.normalBalance || defaultNormalBalance(a.type), currency: (a as any).currency || 'USD' });
  }

  const exchangeRateDocs = await ExchangeRate.find({ userId }).sort({ date: -1 }).lean();
  const rateMap = new Map<string, number>();
  for (const r of exchangeRateDocs) {
    const key = `${(r as any).baseCurrency}:${(r as any).targetCurrency}`;
    if (!rateMap.has(key)) rateMap.set(key, (r as any).rate);
  }

  const convertToBase = (amount: number, fromCurrency: string): number => {
    if (fromCurrency === baseCurrency || !fromCurrency) return amount;
    const key = `${fromCurrency}:${baseCurrency}`;
    const rate = rateMap.get(key);
    if (rate) return Math.round(amount * rate * 100) / 100;
    const inverseKey = `${baseCurrency}:${fromCurrency}`;
    const inverseRate = rateMap.get(inverseKey);
    if (inverseRate && inverseRate > 0) return Math.round(amount / inverseRate * 100) / 100;
    return amount;
  };

  const bsTypes = new Set(['asset', 'liability', 'equity']);
  const plTypes = new Set(['revenue', 'expense']);

  // P&L: date-filtered entries
  const plQuery: Record<string, any> = { userId };
  if (startDate) plQuery.date = { $gte: startDate };
  if (endDate) plQuery.date = { ...plQuery.date, $lte: endDate };
  const plEntries = await JournalEntry.find(plQuery).select('_id').lean();
  const plEntryIds = plEntries.map(e => (e as any)._id.toString());
  const plLines = await JournalLine.find({ journalEntryId: { $in: plEntryIds }, userId }).lean();

  const plTotals = new Map<string, { debits: number; credits: number }>();
  for (const line of plLines) {
    const code = line.accountCode;
    if (!code || !accountMap.has(code)) continue;
    const info = accountMap.get(code)!;
    if (!plTypes.has(info.type)) continue;
    const totals = plTotals.get(code) || { debits: 0, credits: 0 };
    totals.debits += convertToBase(line.debit || 0, info.currency);
    totals.credits += convertToBase(line.credit || 0, info.currency);
    plTotals.set(code, totals);
  }

  // BS: ALL entries up to endDate (cumulative)
  const bsQuery: Record<string, any> = { userId };
  if (endDate) bsQuery.date = { $lte: endDate };
  const bsEntries = await JournalEntry.find(bsQuery).select('_id').lean();
  const bsEntryIds = bsEntries.map(e => (e as any)._id.toString());
  const bsLines = await JournalLine.find({ journalEntryId: { $in: bsEntryIds }, userId }).lean();

  const bsTotals = new Map<string, { debits: number; credits: number }>();
  for (const line of bsLines) {
    const code = line.accountCode;
    if (!code || !accountMap.has(code)) continue;
    const info = accountMap.get(code)!;
    if (!bsTypes.has(info.type)) continue;
    const totals = bsTotals.get(code) || { debits: 0, credits: 0 };
    totals.debits += convertToBase(line.debit || 0, info.currency);
    totals.credits += convertToBase(line.credit || 0, info.currency);
    bsTotals.set(code, totals);
  }

  const allTypes = ['revenue', 'expense', 'asset', 'liability', 'equity'];
  const typeLabels: Record<string, string> = {
    revenue: 'Revenue', expense: 'Expenses',
    asset: 'Assets', liability: 'Liabilities', equity: 'Equity',
  };

  const buildSections = (types: string[], totals: Map<string, { debits: number; credits: number }>): StatementSection[] => {
    const sections: StatementSection[] = [];
    for (const accountType of types) {
      const accounts: AccountBalanceDetail[] = [];
      for (const [code, t] of totals) {
        const info = accountMap.get(code);
        if (!info || info.type !== accountType) continue;
        const nb = info.normalBalance || defaultNormalBalance(accountType);
        const balance = nb === 'credit' ? t.credits - t.debits : t.debits - t.credits;
        if (Math.abs(balance) < 0.01) continue;
        accounts.push({
          accountCode: code,
          accountName: info.name,
          balance: Math.round(balance * 100) / 100,
        });
      }
      accounts.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
      const sectionTotal = accounts.reduce((sum, a) => sum + a.balance, 0);
      sections.push({
        title: typeLabels[accountType] || accountType,
        type: accountType,
        total: Math.round(sectionTotal * 100) / 100,
        accounts,
      });
    }
    return sections;
  };

  const plResult = buildSections(['revenue', 'expense'], plTotals);
  const bsResult = buildSections(['asset', 'liability', 'equity'], bsTotals);

  const revenueTotal = plResult.find(s => s.type === 'revenue')?.total || 0;
  const expenseTotal = plResult.find(s => s.type === 'expense')?.total || 0;
  const netIncome = Math.round((revenueTotal - expenseTotal) * 100) / 100;

  if (netIncome !== 0) {
    const equitySection = bsResult.find(s => s.type === 'equity');
    if (equitySection) {
      equitySection.total = Math.round((equitySection.total + netIncome) * 100) / 100;
      equitySection.accounts.push({
        accountCode: 'net-income',
        accountName: 'Net Income (Current Period)',
        balance: netIncome,
      });
    }
  }

  const totalAssets = bsResult.find(s => s.type === 'asset')?.total || 0;
  const totalLiabilities = bsResult.find(s => s.type === 'liability')?.total || 0;
  const totalEquity = bsResult.find(s => s.type === 'equity')?.total || 0;

  return {
    profitLoss: {
      sections: plResult,
      netIncome,
      netIncomeRatio: revenueTotal > 0 ? Math.round((netIncome / revenueTotal) * 1000) / 10 : 0,
    },
    balanceSheet: {
      sections: bsResult,
      totalAssets,
      totalLiabilities,
      totalEquity,
    },
    dateRange: { start: startDate || null, end: endDate || null },
    baseCurrency,
  };
}

export async function generateCashFlowReport(
  userId: string,
  startDate?: string | null,
  endDate?: string | null,
  baseCurrency: string = 'USD',
): Promise<CashFlowReport> {
  await dbConnect();

  const query: Record<string, any> = { userId };
  if (startDate) query.date = { $gte: startDate };
  if (endDate) query.date = { ...query.date, $lte: endDate };

  const entries = await JournalEntry.find(query).select('_id').lean();
  const entryIds = entries.map(e => (e as any)._id.toString());

  const rawLines = await JournalLine.find({ journalEntryId: { $in: entryIds }, userId }).lean();
  const accountDocs = await Account.find({ userId, isActive: true }).lean();
  const accountMap = new Map<string, { name: string; type: string }>();
  const currencyMap = new Map<string, { currency?: string }>();
  for (const a of accountDocs) {
    accountMap.set(a.code, { name: a.name, type: a.type });
    currencyMap.set(a.code, { currency: (a as any).currency || 'USD' });
  }

  const lines = await convertJournalLines(userId, rawLines, currencyMap, baseCurrency);

  const linesByEntry = new Map<string, any[]>();
  for (const line of lines) {
    const existing = linesByEntry.get(line.journalEntryId) || [];
    existing.push(line);
    linesByEntry.set(line.journalEntryId, existing);
  }

  const operating: CashFlowItem[] = [], investing: CashFlowItem[] = [], financing: CashFlowItem[] = [];
  let totOp = 0, totInv = 0, totFin = 0;

  for (const eid of entryIds) {
    const entryLines = linesByEntry.get(eid) || [];
    const cashLine = entryLines.find(l => l.accountCode === '1000');
    if (!cashLine) continue;
    for (const line of entryLines.filter(l => l.accountCode !== '1000')) {
      const info = accountMap.get(line.accountCode);
      if (!info) continue;
      const side = cashLine.debit > 0 ? 'debit' : 'credit';
      const amount = Math.round((side === 'debit' ? (line.credit || 0) : -(line.debit || 0)) * 100) / 100;
      if (Math.abs(amount) < 0.01) continue;
      const item: CashFlowItem = { accountCode: line.accountCode, accountName: info.name, amount };
      const code = parseInt(line.accountCode);
      if (info.type === 'revenue' || info.type === 'expense') { operating.push(item); totOp += amount; }
      else if (code >= 1400 && code < 2000) { investing.push(item); totInv += amount; }
      else { financing.push(item); totFin += amount; }
    }
  }

  return {
    sections: [
      { title: 'Operating Activities', items: operating, total: Math.round(totOp * 100) / 100 },
      { title: 'Investing Activities', items: investing, total: Math.round(totInv * 100) / 100 },
      { title: 'Financing Activities', items: financing, total: Math.round(totFin * 100) / 100 },
    ],
    totalChange: Math.round((totOp + totInv + totFin) * 100) / 100,
  };
}

export function generateReportHTML(
  statements: FinancialStatements,
  ownerName: string,
  shareLink?: string,
  branding?: BrandingOptions,
): string {
  const { profitLoss, balanceSheet, dateRange, baseCurrency } = statements;
  const netIncome = profitLoss.netIncome;
  const netIncomeStr = netIncome.toLocaleString('en-US', { style: 'currency', currency: baseCurrency });
  const marginStr = profitLoss.netIncomeRatio.toFixed(1);

  const revenueTotal = profitLoss.sections.find(s => s.type === 'revenue')?.total || 0;
  const expenseTotal = profitLoss.sections.find(s => s.type === 'expense')?.total || 0;
  const revenueStr = revenueTotal.toLocaleString('en-US', { style: 'currency', currency: baseCurrency });
  const expenseStr = expenseTotal.toLocaleString('en-US', { style: 'currency', currency: baseCurrency });

  const plRows = (type: string) => {
    const section = profitLoss.sections.find(s => s.type === type);
    if (!section || section.accounts.length === 0) return '';
    return section.accounts.map(a => `
      <tr>
        <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;font-size:13px">
          <span style="color:#94a3b8;font-family:monospace">${a.accountCode === 'net-income' ? '' : a.accountCode}</span>
          ${a.accountName}
        </td>
        <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:13px;font-family:monospace">
          ${a.balance >= 0 ? a.balance.toLocaleString('en-US', { style: 'currency', currency: baseCurrency }) : `(${Math.abs(a.balance).toLocaleString('en-US', { style: 'currency', currency: baseCurrency })})`}
        </td>
      </tr>`).join('');
  };

  const bsRows = (type: string) => {
    const section = balanceSheet.sections.find(s => s.type === type);
    if (!section || section.accounts.length === 0) return '';
    return section.accounts.map(a => `
      <tr>
        <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;font-size:13px">
          <span style="color:#94a3b8;font-family:monospace">${a.accountCode === 'net-income' ? '' : a.accountCode}</span>
          ${a.accountName}
        </td>
        <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:13px;font-family:monospace">
          ${a.balance >= 0 ? a.balance.toLocaleString('en-US', { style: 'currency', currency: baseCurrency }) : `(${Math.abs(a.balance).toLocaleString('en-US', { style: 'currency', currency: baseCurrency })})`}
        </td>
      </tr>`).join('');
  };

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const dateLabel = dateRange.start && dateRange.end
    ? `${dateRange.start} – ${dateRange.end}`
    : 'All Time';

  const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: baseCurrency });

  const pc = branding?.primaryColor || '#6366f1';
  const pcLighter = pc + '33';
  const pcLightest = pc + '1a';

  const safeOwnerName = esc(ownerName);
  const safeShareLink = shareLink ? esc(shareLink) : '';
  const brandCompanyName = esc(branding?.companyName || 'Bookkeeping Platform');
  const logoHtml = branding?.logo ? `<img src="${esc(branding.logo)}" alt="Logo" style="max-height:40px;max-width:200px;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto" />` : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f1f5f9;margin:0;padding:0">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <tr><td style="background:${pc};padding:32px;text-align:center">
      ${logoHtml}
      <h1 style="color:#fff;margin:0;font-size:24px">Financial Report</h1>
      <p style="color:rgba(255,255,255,0.7);margin:8px 0 0;font-size:14px">${safeOwnerName} &middot; ${dateLabel}</p>
    </td></tr>

    <tr><td style="padding:24px">
      <h2 style="color:#1e293b;font-size:16px;margin:0 0 16px">Summary</h2>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:50%;padding:16px;text-align:center;background:#f0fdf4;border-radius:8px">
            <p style="color:#64748b;font-size:11px;margin:0;text-transform:uppercase;letter-spacing:0.5px">Revenue</p>
            <p style="color:#10b981;font-size:24px;font-weight:700;margin:4px 0">${revenueStr}</p>
          </td>
          <td style="width:50%;padding:16px;text-align:center;background:#fef2f2;border-radius:8px;margin-left:8px">
            <p style="color:#64748b;font-size:11px;margin:0;text-transform:uppercase;letter-spacing:0.5px">Expenses</p>
            <p style="color:#ef4444;font-size:24px;font-weight:700;margin:4px 0">${expenseStr}</p>
          </td>
        </tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px">
        <tr>
          <td style="width:50%;padding:16px;text-align:center;background:${netIncome >= 0 ? '#f0fdf4' : '#fef2f2'};border-radius:8px">
            <p style="color:#64748b;font-size:11px;margin:0;text-transform:uppercase;letter-spacing:0.5px">Net Profit</p>
            <p style="color:${netIncome >= 0 ? '#10b981' : '#ef4444'};font-size:24px;font-weight:700;margin:4px 0">${netIncomeStr}</p>
          </td>
            <td style="width:50%;padding:16px;text-align:center;background:${pcLightest};border-radius:8px;margin-left:8px">
              <p style="color:#64748b;font-size:11px;margin:0;text-transform:uppercase;letter-spacing:0.5px">Profit Margin</p>
            <p style="color:${pc};font-size:24px;font-weight:700;margin:4px 0">${marginStr}%</p>
          </td>
        </tr>
      </table>
    </td></tr>

    <tr><td style="padding:0 24px 24px">
      <h2 style="color:#1e293b;font-size:16px;margin:0 0 12px">Profit & Loss</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
        <thead><tr style="background:#f8fafc">
          <th style="padding:8px 12px;text-align:left;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Revenue</th>
          <th style="padding:8px 12px;text-align:right;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Amount</th>
        </tr></thead>
        <tbody>${plRows('revenue')}</tbody>
        <tfoot><tr style="background:#f0fdf4">
          <td style="padding:8px 12px;font-weight:600;font-size:13px">Total Revenue</td>
          <td style="padding:8px 12px;text-align:right;font-weight:600;font-size:13px;font-family:monospace;color:#10b981">${revenueStr}</td>
        </tr></tfoot>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-top:12px">
        <thead><tr style="background:#f8fafc">
          <th style="padding:8px 12px;text-align:left;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Expenses</th>
          <th style="padding:8px 12px;text-align:right;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Amount</th>
        </tr></thead>
        <tbody>${plRows('expense')}</tbody>
        <tfoot><tr style="background:#fef2f2">
          <td style="padding:8px 12px;font-weight:600;font-size:13px">Total Expenses</td>
          <td style="padding:8px 12px;text-align:right;font-weight:600;font-size:13px;font-family:monospace;color:#ef4444">${expenseStr}</td>
        </tr></tfoot>
      </table>
    </td></tr>

    <tr><td style="padding:0 24px 24px">
      <h2 style="color:#1e293b;font-size:16px;margin:0 0 12px">Balance Sheet</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
        <thead><tr style="background:#f8fafc">
          <th style="padding:8px 12px;text-align:left;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Assets</th>
          <th style="padding:8px 12px;text-align:right;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Amount</th>
        </tr></thead>
        <tbody>${bsRows('asset')}</tbody>
        <tfoot><tr style="background:${pcLightest}">
          <td style="padding:8px 12px;font-weight:600;font-size:13px">Total Assets</td>
          <td style="padding:8px 12px;text-align:right;font-weight:600;font-size:13px;font-family:monospace;color:${pc}">${fmt(balanceSheet.totalAssets)}</td>
        </tr></tfoot>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-top:12px">
        <thead><tr style="background:#f8fafc">
          <th style="padding:8px 12px;text-align:left;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Liabilities</th>
          <th style="padding:8px 12px;text-align:right;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Amount</th>
        </tr></thead>
        <tbody>${bsRows('liability')}</tbody>
        <tfoot><tr style="background:#fef2f2">
          <td style="padding:8px 12px;font-weight:600;font-size:13px">Total Liabilities</td>
          <td style="padding:8px 12px;text-align:right;font-weight:600;font-size:13px;font-family:monospace;color:#ef4444">${fmt(balanceSheet.totalLiabilities)}</td>
        </tr></tfoot>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-top:12px">
        <thead><tr style="background:#f8fafc">
          <th style="padding:8px 12px;text-align:left;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Equity</th>
          <th style="padding:8px 12px;text-align:right;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Amount</th>
        </tr></thead>
        <tbody>${bsRows('equity')}</tbody>
        <tfoot><tr style="background:#f0fdf4">
          <td style="padding:8px 12px;font-weight:600;font-size:13px">Total Equity</td>
          <td style="padding:8px 12px;text-align:right;font-weight:600;font-size:13px;font-family:monospace;color:#10b981">${fmt(balanceSheet.totalEquity)}</td>
        </tr></tfoot>
      </table>
    </td></tr>

    <tr><td style="padding:0 24px 24px">
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;text-align:center">
        <p style="color:#64748b;font-size:12px;margin:0">
          Assets (${fmt(balanceSheet.totalAssets)}) = Liabilities (${fmt(balanceSheet.totalLiabilities)}) + Equity (${fmt(balanceSheet.totalEquity)})
          <br>
          <span style="color:${Math.abs(balanceSheet.totalAssets - balanceSheet.totalLiabilities - balanceSheet.totalEquity) < 0.01 ? '#10b981' : '#ef4444'};font-weight:600">
            ${Math.abs(balanceSheet.totalAssets - balanceSheet.totalLiabilities - balanceSheet.totalEquity) < 0.01 ? '✓ Balanced' : '⚠ Out of balance'}
          </span>
        </p>
      </div>
    </td></tr>

    ${safeShareLink ? `
    <tr><td style="padding:0 24px 24px">
      <div style="background:${pcLightest};border:1px solid ${pcLighter};border-radius:8px;padding:16px;text-align:center">
        <p style="color:${pc};font-size:14px;font-weight:600;margin:0 0 8px">View Live Report</p>
        <a href="${safeShareLink}" style="color:${pc};font-size:13px;word-break:break-all">${safeShareLink}</a>
        <p style="color:#64748b;font-size:12px;margin:8px 0 0">Open this link anytime to see your up-to-date financial data.</p>
      </div>
    </td></tr>` : ''}

    <tr><td style="background:#f8fafc;padding:16px;text-align:center;color:#94a3b8;font-size:12px">
      <p style="margin:0">Generated by ${brandCompanyName}</p>
    </td></tr>
  </table>
</body>
</html>`;
}
