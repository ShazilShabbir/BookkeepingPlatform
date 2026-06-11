import dbConnect from '@/lib/mongoose';
import JournalEntry from '@/lib/models/JournalEntry';
import JournalLine from '@/lib/models/JournalLine';
import Account from '@/lib/models/Account';

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
}

export async function getFinancialStatements(
  userId: string,
  startDate?: string | null,
  endDate?: string | null,
): Promise<FinancialStatements> {
  await dbConnect();

  const query: Record<string, any> = { userId };
  if (startDate) query.date = { $gte: startDate };
  if (endDate) query.date = { ...query.date, $lte: endDate };

  const entries = await JournalEntry.find(query).select('_id').lean();
  const entryIds = entries.map(e => (e as any)._id.toString());

  const lines = await JournalLine.find({ journalEntryId: { $in: entryIds }, userId }).lean();
  const accountTotals = new Map<string, { debits: number; credits: number }>();
  for (const line of lines) {
    const code = line.accountCode;
    if (!code) continue;
    const totals = accountTotals.get(code) || { debits: 0, credits: 0 };
    totals.debits += line.debit || 0;
    totals.credits += line.credit || 0;
    accountTotals.set(code, totals);
  }

  const accountDocs = await Account.find({ userId, isActive: true }).lean();
  const accountMap = new Map<string, { name: string; type: string; normalBalance: string }>();
  for (const a of accountDocs) {
    accountMap.set(a.code, { name: a.name, type: a.type, normalBalance: a.normalBalance || 'debit' });
  }

  const allTypes = ['revenue', 'expense', 'asset', 'liability', 'equity'];
  const typeLabels: Record<string, string> = {
    revenue: 'Revenue', expense: 'Expenses',
    asset: 'Assets', liability: 'Liabilities', equity: 'Equity',
  };

  const allSections: StatementSection[] = [];
  for (const accountType of allTypes) {
    const accounts: AccountBalanceDetail[] = [];
    for (const [code, totals] of accountTotals) {
      const info = accountMap.get(code);
      if (!info || info.type !== accountType) continue;
      const normalBalance = info.normalBalance === 'credit' ? 'credit' : 'debit';
      const balance = normalBalance === 'credit'
        ? totals.credits - totals.debits
        : totals.debits - totals.credits;
      if (Math.abs(balance) < 0.01) continue;
      accounts.push({
        accountCode: code,
        accountName: info.name,
        balance: Math.round(balance * 100) / 100,
      });
    }
    accounts.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
    const sectionTotal = accounts.reduce((sum, a) => sum + a.balance, 0);
    allSections.push({
      title: typeLabels[accountType] || accountType,
      type: accountType,
      total: Math.round(sectionTotal * 100) / 100,
      accounts,
    });
  }

  const plSections = ['revenue', 'expense'];
  const bsSections = ['asset', 'liability', 'equity'];

  const plResult = allSections.filter(s => plSections.includes(s.type));
  const bsResult = allSections.filter(s => bsSections.includes(s.type));

  const revenueTotal = allSections.find(s => s.type === 'revenue')?.total || 0;
  const expenseTotal = allSections.find(s => s.type === 'expense')?.total || 0;
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
  };
}

export function generateReportHTML(
  statements: FinancialStatements,
  ownerName: string,
  shareLink?: string,
): string {
  const { profitLoss, balanceSheet, dateRange } = statements;
  const netIncome = profitLoss.netIncome;
  const netIncomeStr = netIncome.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const marginStr = profitLoss.netIncomeRatio.toFixed(1);

  const revenueTotal = profitLoss.sections.find(s => s.type === 'revenue')?.total || 0;
  const expenseTotal = profitLoss.sections.find(s => s.type === 'expense')?.total || 0;
  const revenueStr = revenueTotal.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const expenseStr = expenseTotal.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

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
          ${a.balance >= 0 ? a.balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : `(${Math.abs(a.balance).toLocaleString('en-US', { style: 'currency', currency: 'USD' })})`}
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
          ${a.balance >= 0 ? a.balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : `(${Math.abs(a.balance).toLocaleString('en-US', { style: 'currency', currency: 'USD' })})`}
        </td>
      </tr>`).join('');
  };

  const dateLabel = dateRange.start && dateRange.end
    ? `${dateRange.start} – ${dateRange.end}`
    : 'All Time';

  const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f1f5f9;margin:0;padding:0">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:24px">Financial Report</h1>
      <p style="color:#c7d2fe;margin:8px 0 0;font-size:14px">${ownerName} &middot; ${dateLabel}</p>
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
          <td style="width:50%;padding:16px;text-align:center;background:#eef2ff;border-radius:8px;margin-left:8px">
            <p style="color:#64748b;font-size:11px;margin:0;text-transform:uppercase;letter-spacing:0.5px">Profit Margin</p>
            <p style="color:#6366f1;font-size:24px;font-weight:700;margin:4px 0">${marginStr}%</p>
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
        <tfoot><tr style="background:#eef2ff">
          <td style="padding:8px 12px;font-weight:600;font-size:13px">Total Assets</td>
          <td style="padding:8px 12px;text-align:right;font-weight:600;font-size:13px;font-family:monospace;color:#6366f1">${fmt(balanceSheet.totalAssets)}</td>
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

    ${shareLink ? `
    <tr><td style="padding:0 24px 24px">
      <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;padding:16px;text-align:center">
        <p style="color:#4338ca;font-size:14px;font-weight:600;margin:0 0 8px">View Live Report</p>
        <a href="${shareLink}" style="color:#6366f1;font-size:13px;word-break:break-all">${shareLink}</a>
        <p style="color:#64748b;font-size:12px;margin:8px 0 0">Open this link anytime to see your up-to-date financial data.</p>
      </div>
    </td></tr>` : ''}

    <tr><td style="background:#f8fafc;padding:16px;text-align:center;color:#94a3b8;font-size:12px">
      <p style="margin:0">Generated by Bookkeeping Platform</p>
    </td></tr>
  </table>
</body>
</html>`;
}
