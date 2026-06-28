import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import JournalEntry from '@/lib/models/JournalEntry';
import JournalLine from '@/lib/models/JournalLine';
import Account from '@/lib/models/Account';
import User from '@/lib/models/User';
import { resolveUserIdFromQuery } from '@/lib/customerContext';
import { linearRegression } from '@/lib/forecast';
import { formatCurrency } from '@/lib/format';
import { convertJournalLines } from '@/lib/currency';

interface TrendPoint {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

function stddev(arr: number[]): number {
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
  return Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = await resolveUserIdFromQuery(token, req);

    await dbConnect();

    const userDoc = await User.findById(uid).select('baseCurrency').lean() as any;
    const baseCurrency = userDoc?.baseCurrency || 'USD';

    try {
    const { startDate: sdParam, endDate: edParam } = req.query;
    let dateFilter: Record<string, any>;
    if (sdParam || edParam) {
      dateFilter = {};
      if (sdParam) dateFilter.$gte = sdParam;
      if (edParam) dateFilter.$lte = edParam;
    } else {
      const monthsBack = 12;
      const sd = new Date();
      sd.setMonth(sd.getMonth() - monthsBack);
      dateFilter = { $gte: sd.toISOString().slice(0, 10) };
    }

    const entries = await JournalEntry.find({ userId: uid, date: dateFilter }).select('_id date').lean();
    const entryIds = entries.map(e => (e as any)._id.toString());

    const lines = await JournalLine.find({ journalEntryId: { $in: entryIds }, userId: uid }).lean();
    const accountDocs = await Account.find({ userId: uid, isActive: true }).lean();
    const accountMap = new Map<string, string>();
    const currencyMap = new Map<string, { currency?: string }>();
    for (const a of accountDocs) {
      accountMap.set(a.code, a.type);
      currencyMap.set(a.code, { currency: (a as any).currency || 'USD' });
    }

    const convertedLines = await convertJournalLines(uid, lines, currencyMap, baseCurrency);

    const monthlyData = new Map<string, { revenue: number; expenses: number }>();

    for (const entry of entries) {
      const month = (entry as any).date?.slice(0, 7);
      if (!month) continue;
      if (!monthlyData.has(month)) monthlyData.set(month, { revenue: 0, expenses: 0 });
    }

    for (const line of convertedLines) {
      const entry = entries.find(e => (e as any)._id.toString() === line.journalEntryId);
      if (!entry) continue;
      const month = (entry as any).date?.slice(0, 7);
      if (!month) continue;
      const acctType = accountMap.get(line.accountCode);
      if (!acctType || (acctType !== 'revenue' && acctType !== 'expense')) continue;

      const data = monthlyData.get(month)!;
      const net = (line.credit || 0) - (line.debit || 0);
      if (acctType === 'revenue') data.revenue += net;
      else data.expenses -= net;
    }

    const months: TrendPoint[] = Array.from(monthlyData.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        revenue: Math.round(data.revenue * 100) / 100,
        expenses: Math.round(data.expenses * 100) / 100,
        profit: Math.round((data.revenue - data.expenses) * 100) / 100,
      }));

    if (months.length === 0) {
      return res.status(200).json({ success: true, data: { insights: [], hasData: false } });
    }

    const revenues = months.map(m => m.revenue);
    const expenses = months.map(m => m.expenses);
    const profits = months.map(m => m.profit);

    const bestRevenueMonth = months.reduce((best, m) => m.revenue > best.revenue ? m : best, months[0]);
    const worstRevenueMonth = months.reduce((worst, m) => m.revenue < worst.revenue ? m : worst, months[0]);
    const bestExpenseMonth = months.reduce((best, m) => m.expenses > best.expenses ? m : best, months[0]);
    const bestProfitMonth = months.reduce((best, m) => m.profit > best.profit ? m : best, months[0]);
    const worstProfitMonth = months.reduce((worst, m) => m.profit < worst.profit ? m : worst, months[0]);

    const revForecast = linearRegression(revenues, 3);
    const expForecast = linearRegression(expenses, 3);
    const profitForecast = linearRegression(profits, 3);

    const avgRevenue = Math.round((revenues.reduce((s, v) => s + v, 0) / revenues.length) * 100) / 100;
    const avgExpenses = Math.round((expenses.reduce((s, v) => s + v, 0) / expenses.length) * 100) / 100;
    const avgProfit = Math.round((profits.reduce((s, v) => s + v, 0) / profits.length) * 100) / 100;

    const revStd = stddev(revenues);
    const expStd = stddev(expenses);

    const anomalies: { month: string; type: string; value: number; mean: number; deviation: number }[] = [];
    for (const m of months) {
      if (Math.abs(m.revenue - avgRevenue) > 2 * revStd) {
        anomalies.push({ month: m.month, type: 'revenue', value: m.revenue, mean: avgRevenue, deviation: Math.round((Math.abs(m.revenue - avgRevenue) / revStd) * 10) / 10 });
      }
      if (Math.abs(m.expenses - avgExpenses) > 2 * expStd) {
        anomalies.push({ month: m.month, type: 'expense', value: m.expenses, mean: avgExpenses, deviation: Math.round((Math.abs(m.expenses - avgExpenses) / expStd) * 10) / 10 });
      }
    }

    const trendDir = (slope: number) => {
      if (Math.abs(slope) < 50) return 'stable';
      return slope > 0 ? 'up' : 'down';
    };

    const insights = [
      {
        type: 'revenue_peak',
        label: 'Highest Revenue Month',
        detail: `${bestRevenueMonth.month} had the highest revenue at ${formatCurrency(bestRevenueMonth.revenue, baseCurrency)}.`,
        value: bestRevenueMonth.revenue,
        icon: 'trending_up',
      },
      {
        type: 'revenue_trend',
        label: 'Revenue Trend',
        detail: `Revenue is trending ${trendDir(revForecast.slope)} (slope: ${Math.round(revForecast.slope * 100) / 100}/mo). Next quarter projection: ${formatCurrency(Math.round(revForecast.projected.reduce((a, b) => a + b, 0)), baseCurrency)}.`,
        value: revForecast.slope,
        icon: 'show_chart',
      },
      {
        type: 'expense_trend',
        label: 'Expense Trend',
        detail: `Expenses trending ${trendDir(expForecast.slope)} (slope: ${Math.round(expForecast.slope * 100) / 100}/mo).`,
        value: expForecast.slope,
        icon: 'trending_down',
      },
      {
        type: 'profit_peak',
        label: 'Best Month',
        detail: `${bestProfitMonth.month} was the most profitable at ${formatCurrency(bestProfitMonth.profit, baseCurrency)}.`,
        value: bestProfitMonth.profit,
        icon: 'emoji_events',
      },
      {
        type: 'profit_low',
        label: 'Worst Month',
        detail: `${worstProfitMonth.month} had the lowest profit at ${formatCurrency(worstProfitMonth.profit, baseCurrency)}.`,
        value: worstProfitMonth.profit,
        icon: 'warning',
      },
      {
        type: 'avg_profit',
        label: 'Average Monthly Profit',
        detail: `Average monthly profit over ${months.length} months: ${formatCurrency(avgProfit, baseCurrency)}.`,
        value: avgProfit,
        icon: 'bar_chart',
      },
      ...anomalies.slice(0, 3).map(a => ({
        type: 'anomaly' as string,
        label: `${a.type === 'revenue' ? 'Revenue' : 'Expense'} Spike`,
        detail: `${a.month} had ${a.type} of ${formatCurrency(Math.round(a.value), baseCurrency)}, ${a.deviation}x the average.`,
        value: a.value,
        icon: 'bolt' as string,
      })),
    ];

    return res.status(200).json({ success: true, data: { insights, hasData: true } });
  } catch (e: any) {
    console.error('insights error:', e?.message || e);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
