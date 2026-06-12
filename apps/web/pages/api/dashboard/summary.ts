import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import JournalEntry from '@/lib/models/JournalEntry';
import JournalLine from '@/lib/models/JournalLine';
import Account from '@/lib/models/Account';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = token.sub!;

  await dbConnect();

  try {
    const { startDate, endDate } = req.query;
    const query: Record<string, any> = { userId: uid };
    if (startDate) query.date = { $gte: startDate as string };
    if (endDate) query.date = { ...query.date, $lte: endDate as string };

    const entries = await JournalEntry.find(query).select('_id date').lean();
    const entryIds = entries.map(e => (e as any)._id.toString());

    const lines = await JournalLine.find({ journalEntryId: { $in: entryIds }, userId: uid }).lean();
    const accountDocs = await Account.find({ userId: uid, isActive: true }).lean();
    const accountMap = new Map<string, { name: string; type: string; normalBalance: string }>();
    for (const a of accountDocs) accountMap.set(a.code, { name: a.name, type: a.type, normalBalance: a.normalBalance || 'debit' });

    const accountTotals = new Map<string, { debits: number; credits: number }>();
    const linesByEntry = new Map<string, any[]>();
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

    const kpis = { totalRevenue: revenueTotal, totalExpenses: expenseTotal, netProfit: netIncome, profitMargin: revenueTotal > 0 ? Math.round((netIncome / revenueTotal) * 1000) / 10 : 0, entryCount: entryIds.length };

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
      const cashLine = el.find(l => l.accountCode === '1000');
      if (!cashLine) continue;
      for (const line of el.filter(l => l.accountCode !== '1000')) {
        const info = accountMap.get(line.accountCode);
        if (!info) continue;
        const side = cashLine.debit > 0 ? 'debit' : 'credit';
        const amount = Math.round((side === 'debit' ? (line.credit || 0) : -(line.debit || 0)) * 100) / 100;
        if (Math.abs(amount) < 0.01) continue;
        const item = { accountCode: line.accountCode, accountName: info.name, amount };
        const code = parseInt(line.accountCode);
        if (info.type === 'revenue' || info.type === 'expense') { operating.push(item); totOp += amount; }
        else if (code >= 1400 && code < 2000) { investing.push(item); totInv += amount; }
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

    return res.status(200).json({
      success: true,
      data: {
        kpis,
        profitLoss: { sections: plSections, netIncome, netIncomeRatio: kpis.profitMargin },
        balanceSheet: { sections: bsSections, totalAssets: bsSections.find(s => s.type === 'asset')?.total || 0, totalLiabilities: bsSections.find(s => s.type === 'liability')?.total || 0, totalEquity: bsSections.find(s => s.type === 'equity')?.total || 0 },
        cashFlow: { sections: [{ title: 'Operating Activities', items: operating, total: Math.round(totOp * 100) / 100 }, { title: 'Investing Activities', items: investing, total: Math.round(totInv * 100) / 100 }, { title: 'Financing Activities', items: financing, total: Math.round(totFin * 100) / 100 }], totalChange: Math.round((totOp + totInv + totFin) * 100) / 100 },
        trialBalance: { rows: tbRows, totals: { totalDebits: Math.round(totalDebits * 100) / 100, totalCredits: Math.round(totalCredits * 100) / 100, difference: Math.round(Math.abs(totalDebits - totalCredits) * 100) / 100, balanced: Math.abs(totalDebits - totalCredits) < 0.01 } },
        dateRange: { startDate: startDate || null, endDate: endDate || null },
      },
    });
  } catch (e: any) {
    console.error('dashboard summary error:', e?.message || e);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
