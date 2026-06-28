import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import CustomReport from '@/lib/models/CustomReport';
import JournalEntry from '@/lib/models/JournalEntry';
import JournalLine from '@/lib/models/JournalLine';
import Account from '@/lib/models/Account';
import { getFinancialStatements } from '@/lib/reports';
import { convertJournalLines } from '@/lib/currency';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = token.sub as string;

  await dbConnect();

  try {
    const { id } = req.query;
    if (!id || typeof id !== 'string') return res.status(400).json({ error: 'id required' });

    const report = await CustomReport.findOne({ _id: id, userId: uid }).lean();
    if (!report) return res.status(404).json({ error: 'Report not found' });

    const { filters } = report;
    const startDate = filters?.startDate || null;
    const endDate = filters?.endDate || null;

    const result: Record<string, any> = { reportName: report.name };

    const sectionTypes = new Set(report.sections?.map(s => s.type) || []);

    const userDoc = await (await import('@/lib/models/User')).default.findById(uid).select('baseCurrency').lean() as any;
    const baseCurrency = userDoc?.baseCurrency || 'USD';

    if (sectionTypes.has('kpi-summary') || sectionTypes.has('profit-loss') || sectionTypes.has('balance-sheet') || sectionTypes.has('cash-flow') || sectionTypes.has('trial-balance')) {
      const statements = await getFinancialStatements(uid, startDate, endDate, baseCurrency);
      result.profitLoss = statements.profitLoss;
      result.balanceSheet = statements.balanceSheet;
    }

    if (sectionTypes.has('category-breakdown') || sectionTypes.has('trend')) {
      const query: Record<string, any> = { userId: uid };
      if (startDate) query.date = { $gte: startDate };
      if (endDate) query.date = { ...query.date, $lte: endDate };

      const entries = await JournalEntry.find(query).select('_id date').lean();
      const entryIds = entries.map(e => (e as any)._id.toString());
      const accountDocs = await Account.find({ userId: uid, isActive: true }).lean();
      const accountMap = new Map<string, { name: string; type: string; normalBalance: string }>();
      const currencyMap = new Map<string, { currency?: string }>();
      for (const a of accountDocs) {
        accountMap.set(a.code, { name: a.name, type: a.type, normalBalance: a.normalBalance || 'debit' });
        currencyMap.set(a.code, { currency: (a as any).currency || 'USD' });
      }

      const revenueByCategory = new Map<string, { amount: number; count: number }>();
      const expensesByCategory = new Map<string, { amount: number; count: number }>();
      const monthlyData = new Map<string, { revenue: number; expenses: number }>();

      for (const entry of entries) {
        const month = (entry as any).date?.slice(0, 7);
        if (month && !monthlyData.has(month)) monthlyData.set(month, { revenue: 0, expenses: 0 });
      }

      const rawLines = await JournalLine.find({ journalEntryId: { $in: entryIds }, userId: uid }).lean();
      const lines = await convertJournalLines(uid, rawLines, currencyMap, baseCurrency);

      for (const line of lines) {
        const info = accountMap.get(line.accountCode);
        if (!info) continue;
        const entry = entries.find(e => (e as any)._id.toString() === line.journalEntryId);
        if (!entry) continue;
        const month = (entry as any).date?.slice(0, 7);
        if (!month) continue;

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

        if (monthlyData.has(month)) {
          const data = monthlyData.get(month)!;
          const net = (line.credit || 0) - (line.debit || 0);
          if (info.type === 'revenue') data.revenue += net;
          else if (info.type === 'expense') data.expenses -= net;
        }
      }

      const catTotal = (amt: number) => Math.abs(amt) || 1;
      result.revenueByCategory = Array.from(revenueByCategory.entries()).map(([category, data]) => ({ category, amount: Math.round(data.amount * 100) / 100, count: data.count, percentage: Math.round((Math.abs(data.amount) / catTotal(Array.from(revenueByCategory.values()).reduce((s, d) => s + d.amount, 0))) * 1000) / 10 })).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
      result.expensesByCategory = Array.from(expensesByCategory.entries()).map(([category, data]) => ({ category, amount: Math.round(data.amount * 100) / 100, count: data.count, percentage: Math.round((Math.abs(data.amount) / catTotal(Array.from(expensesByCategory.values()).reduce((s, d) => s + d.amount, 0))) * 1000) / 10 })).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
      result.monthlyTrend = Array.from(monthlyData.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([month, data]) => ({ month, revenue: Math.round(data.revenue * 100) / 100, expenses: Math.round(data.expenses * 100) / 100, profit: Math.round((data.revenue - data.expenses) * 100) / 100 }));
    }

    // KPI summary from the first entry or computed
    if (sectionTypes.has('kpi-summary')) {
      const rev = result.profitLoss?.sections?.find((s: any) => s.type === 'revenue')?.total || 0;
      const exp = result.profitLoss?.sections?.find((s: any) => s.type === 'expense')?.total || 0;
      const net = rev - exp;
      result.kpis = { totalRevenue: Math.round(rev * 100) / 100, totalExpenses: Math.round(exp * 100) / 100, netProfit: Math.round(net * 100) / 100, profitMargin: rev > 0 ? Math.round((net / rev) * 1000) / 10 : 0 };
    }

    return res.status(200).json({ success: true, data: { ...result, baseCurrency } });
  } catch (e: any) {
    console.error('generate report error:', e?.message || e);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
