import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import JournalEntry from '@/lib/models/JournalEntry';
import JournalLine from '@/lib/models/JournalLine';
import Account from '@/lib/models/Account';
import { checkFeatureAccess } from '@/lib/subscription';
import { resolveUserIdFromQuery } from '@/lib/customerContext';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = await resolveUserIdFromQuery(token, req);

  const [cfAccess, tbAccess] = await Promise.all([
    checkFeatureAccess(uid!, 'cash-flow'),
    checkFeatureAccess(uid!, 'trial-balance'),
  ]);

  await dbConnect();

  try {
    const { startDate, endDate } = req.query;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (startDate && !dateRegex.test(startDate as string)) return res.status(400).json({ error: 'Invalid startDate format. Use YYYY-MM-DD.' });
    if (endDate && !dateRegex.test(endDate as string)) return res.status(400).json({ error: 'Invalid endDate format. Use YYYY-MM-DD.' });
    const query: Record<string, any> = { userId: uid };
    if (startDate) query.date = { $gte: startDate as string };
    if (endDate) query.date = { ...query.date, $lte: endDate as string };

    const entries = await JournalEntry.find(query).select('_id date').lean();
    const entryIds = entries.map(e => (e as any)._id.toString());

    const entryDateMap = new Map<string, string>();
    for (const e of entries) entryDateMap.set((e as any)._id.toString(), (e as any).date || '');

    const lines = await JournalLine.find({ journalEntryId: { $in: entryIds }, userId: uid }).lean();
    const accountDocs = await Account.find({ userId: uid, isActive: true }).lean();
    const accountMap = new Map<string, { name: string; type: string; normalBalance: string }>();
    for (const a of accountDocs) accountMap.set(a.code, { name: a.name, type: a.type, normalBalance: a.normalBalance || 'debit' });

    const cashAccountDocs = accountDocs.filter(a => a.type === 'asset' && (a.normalBalance || 'debit') === 'debit').sort((a, b) => a.code.localeCompare(b.code));
    const cashAccountCode = cashAccountDocs.length > 0 ? cashAccountDocs[0].code : '1000';

    const accountTotals = new Map<string, { debits: number; credits: number }>();
    const linesByEntry = new Map<string, any[]>();
    const monthlyAccountTotals = new Map<string, Map<string, { debits: number; credits: number }>>();
    const dailyAccountTotals = new Map<string, Map<string, { debits: number; credits: number }>>();
    const revenueByCategory = new Map<string, { amount: number; count: number }>();
    const expensesByCategory = new Map<string, { amount: number; count: number }>();
    for (const line of lines) {
      const code = line.accountCode;
      if (!code) continue;
      const totals = accountTotals.get(code) || { debits: 0, credits: 0 };
      totals.debits += line.debit || 0;
      totals.credits += line.credit || 0;
      accountTotals.set(code, totals);
      const existing = linesByEntry.get(line.journalEntryId) || [];
      existing.push(line);
      linesByEntry.set(line.journalEntryId, existing);

      const entryDate = entryDateMap.get(line.journalEntryId);
      if (entryDate) {
        const month = entryDate.slice(0, 7);
        if (!monthlyAccountTotals.has(month)) monthlyAccountTotals.set(month, new Map());
        const mMap = monthlyAccountTotals.get(month)!;
        const mTotals = mMap.get(code) || { debits: 0, credits: 0 };
        mTotals.debits += line.debit || 0;
        mTotals.credits += line.credit || 0;
        mMap.set(code, mTotals);

        const day = entryDate.slice(0, 10);
        if (!dailyAccountTotals.has(day)) dailyAccountTotals.set(day, new Map());
        const dMap = dailyAccountTotals.get(day)!;
        const dTotals = dMap.get(code) || { debits: 0, credits: 0 };
        dTotals.debits += line.debit || 0;
        dTotals.credits += line.credit || 0;
        dMap.set(code, dTotals);

        const info = accountMap.get(code);
        if (info) {
          const balance = info.normalBalance === 'credit' ? (line.credit || 0) - (line.debit || 0) : (line.debit || 0) - (line.credit || 0);
          if (Math.abs(balance) >= 0.01) {
            if (info.type === 'revenue') {
              const c = revenueByCategory.get(info.name) || { amount: 0, count: 0 };
              c.amount += balance; c.count += 1;
              revenueByCategory.set(info.name, c);
            } else if (info.type === 'expense') {
              const c = expensesByCategory.get(info.name) || { amount: 0, count: 0 };
              c.amount += balance; c.count += 1;
              expensesByCategory.set(info.name, c);
            }
          }
        }
      }
    }

    const allTypes = ['revenue', 'expense', 'asset', 'liability', 'equity'];
    const typeLabels: Record<string, string> = { revenue: 'Revenue', expense: 'Expenses', asset: 'Assets', liability: 'Liabilities', equity: 'Equity' };

    const allSections: any[] = [];
    for (const accountType of allTypes) {
      const accounts: any[] = [];
      for (const [code, totals] of accountTotals) {
        const info = accountMap.get(code);
        if (!info || info.type !== accountType) continue;
        const normalBalance = info.normalBalance === 'credit' ? 'credit' : 'debit';
        const balance = normalBalance === 'credit' ? totals.credits - totals.debits : totals.debits - totals.credits;
        if (Math.abs(balance) < 0.01) continue;
        accounts.push({ accountCode: code, accountName: info.name, balance: Math.round(balance * 100) / 100 });
      }
      accounts.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
      const sectionTotal = accounts.reduce((sum, a) => sum + a.balance, 0);
      allSections.push({ title: typeLabels[accountType], type: accountType, total: Math.round(sectionTotal * 100) / 100, accounts });
    }

    const revenueTotal = allSections.find(s => s.type === 'revenue')?.total || 0;
    const expenseTotal = allSections.find(s => s.type === 'expense')?.total || 0;
    const netIncome = Math.round((revenueTotal - expenseTotal) * 100) / 100;

    const cashAcctTotals = accountTotals.get(cashAccountCode);
    const cashInfo = accountMap.get(cashAccountCode);
    const cashBalance = cashAcctTotals && cashInfo
      ? Math.round(((cashInfo.normalBalance === 'credit' ? cashAcctTotals.credits - cashAcctTotals.debits : cashAcctTotals.debits - cashAcctTotals.credits)) * 100) / 100
      : 0;

    const kpis = { totalRevenue: revenueTotal, totalExpenses: expenseTotal, netProfit: netIncome, profitMargin: revenueTotal > 0 ? Math.round((netIncome / revenueTotal) * 1000) / 10 : 0, entryCount: entryIds.length, cashBalance };

    const sortedMonths = Array.from(monthlyAccountTotals.keys()).sort();
    const revenueTrend: number[] = [];
    const expensesTrend: number[] = [];
    const profitTrend: number[] = [];
    for (const month of sortedMonths) {
      const mMap = monthlyAccountTotals.get(month)!;
      let monthRev = 0, monthExp = 0;
      for (const [code, mt] of mMap) {
        const info = accountMap.get(code);
        if (!info) continue;
        const bal = (info.normalBalance === 'credit' ? mt.credits - mt.debits : mt.debits - mt.credits);
        if (info.type === 'revenue') monthRev += bal;
        else if (info.type === 'expense') monthExp += bal;
      }
      revenueTrend.push(Math.round(monthRev * 100) / 100);
      expensesTrend.push(Math.round(monthExp * 100) / 100);
      profitTrend.push(Math.round((monthRev - monthExp) * 100) / 100);
    }

    const sortedDays = Array.from(dailyAccountTotals.keys()).sort();
    const dailyMetricsList = sortedDays.map(day => {
      const dMap = dailyAccountTotals.get(day)!;
      let dayRev = 0, dayExp = 0;
      for (const [code, dt] of dMap) {
        const info = accountMap.get(code);
        if (!info) continue;
        const bal = (info.normalBalance === 'credit' ? dt.credits - dt.debits : dt.debits - dt.credits);
        if (info.type === 'revenue') dayRev += bal;
        else if (info.type === 'expense') dayExp += bal;
      }
      return { date: day, revenue: Math.round(dayRev * 100) / 100, expenses: Math.round(dayExp * 100) / 100, profit: Math.round((dayRev - dayExp) * 100) / 100 };
    });

    const toCatStats = (map: Map<string, { amount: number; count: number }>) => {
      const entries = Array.from(map.entries());
      const total = entries.reduce((sum, [, data]) => sum + Math.abs(data.amount), 0) || 1;
      return entries.map(([category, data]) => ({
        category, amount: Math.round(Math.abs(data.amount) * 100) / 100, count: data.count, percentage: Math.round((Math.abs(data.amount) / total) * 1000) / 10,
      })).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
    };

    const revStats = toCatStats(revenueByCategory);
    const expStats = toCatStats(expensesByCategory);

    const allCatMap = new Map(revenueByCategory);
    for (const [name, data] of expensesByCategory) {
      const existing = allCatMap.get(name) || { amount: 0, count: 0 };
      existing.amount -= data.amount;
      existing.count += data.count;
      allCatMap.set(name, existing);
    }
    const catTotal = Math.abs(revenueTotal) + Math.abs(expenseTotal) || 1;
    const topCategories = Array.from(allCatMap.entries()).map(([category, data]) => ({
      category, amount: Math.round(data.amount * 100) / 100, count: data.count, percentage: Math.round((Math.abs(data.amount) / catTotal) * 1000) / 10,
    })).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)).slice(0, 10);

    const plSections = allSections.filter(s => ['revenue', 'expense'].includes(s.type));
    const bsSections = allSections.filter(s => ['asset', 'liability', 'equity'].includes(s.type));

    if (netIncome !== 0) {
      const eq = bsSections.find(s => s.type === 'equity');
      if (eq) { eq.total = Math.round((eq.total + netIncome) * 100) / 100; eq.accounts.push({ accountCode: 'net-income', accountName: 'Net Income (Current Period)', balance: netIncome }); }
    }

    // Cash flow
    const operating: any[] = [], investing: any[] = [], financing: any[] = [];
    let totOp = 0, totInv = 0, totFin = 0;
    for (const eid of entryIds) {
      const el = linesByEntry.get(eid) || [];
      const cashLine = el.find(l => l.accountCode === cashAccountCode);
      if (!cashLine) continue;
      for (const line of el.filter(l => l.accountCode !== cashAccountCode)) {
        const info = accountMap.get(line.accountCode);
        if (!info) continue;
        const side = cashLine.debit > 0 ? 'debit' : 'credit';
        const amount = Math.round((side === 'debit' ? (line.credit || 0) : -(line.debit || 0)) * 100) / 100;
        if (Math.abs(amount) < 0.01) continue;
        const item = { accountCode: line.accountCode, accountName: info.name, amount };
        const code = parseInt(line.accountCode);
        if (info.type === 'revenue' || info.type === 'expense') { operating.push(item); totOp += amount; }
        else if (!isNaN(code) && code >= 1400 && code < 2000) { investing.push(item); totInv += amount; }
        else { financing.push(item); totFin += amount; }
      }
    }

    // Trial balance
    const tbRows: any[] = [];
    let totalDebits = 0, totalCredits = 0;
    for (const [code, totals] of accountTotals) {
      const info = accountMap.get(code);
      if (!info) continue;
      const normalBalance = info.normalBalance === 'credit' ? 'credit' : 'debit';
      const netBalance = normalBalance === 'credit' ? totals.credits - totals.debits : totals.debits - totals.credits;
      tbRows.push({ accountCode: code, accountName: info.name, accountType: info.type, normalBalance, totalDebits: totals.debits, totalCredits: totals.credits, netBalance });
      totalDebits += totals.debits;
      totalCredits += totals.credits;
    }
    tbRows.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    const cashFlow = cfAccess.allowed
      ? { sections: [{ title: 'Operating Activities', items: operating, total: Math.round(totOp * 100) / 100 }, { title: 'Investing Activities', items: investing, total: Math.round(totInv * 100) / 100 }, { title: 'Financing Activities', items: financing, total: Math.round(totFin * 100) / 100 }], totalChange: Math.round((totOp + totInv + totFin) * 100) / 100 }
      : null;

    const trialBalance = tbAccess.allowed
      ? { rows: tbRows, totals: { totalDebits: Math.round(totalDebits * 100) / 100, totalCredits: Math.round(totalCredits * 100) / 100, difference: Math.round(Math.abs(totalDebits - totalCredits) * 100) / 100, balanced: Math.abs(totalDebits - totalCredits) < 0.01 } }
      : null;

    return res.status(200).json({
      success: true,
      data: {
        kpis,
        trends: { revenue: revenueTrend, expenses: expensesTrend, profit: profitTrend },
        topCategories,
        revenueByCategory: revStats,
        expensesByCategory: expStats,
        dailyMetrics: dailyMetricsList,
        profitLoss: { sections: plSections, netIncome, netIncomeRatio: kpis.profitMargin },
        balanceSheet: { sections: bsSections, totalAssets: bsSections.find(s => s.type === 'asset')?.total || 0, totalLiabilities: bsSections.find(s => s.type === 'liability')?.total || 0, totalEquity: bsSections.find(s => s.type === 'equity')?.total || 0 },
        cashFlow,
        trialBalance,
        dateRange: { startDate: startDate || null, endDate: endDate || null },
      },
    });
  } catch (e: any) {
    console.error('dashboard summary error:', e?.message || e);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
