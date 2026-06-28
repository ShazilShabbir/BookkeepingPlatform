import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import JournalEntry from '@/lib/models/JournalEntry';
import JournalLine from '@/lib/models/JournalLine';
import Account from '@/lib/models/Account';
import User from '@/lib/models/User';
import { convertJournalLines } from '@/lib/currency';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = token.sub as string;

  await dbConnect();

  const userDoc = await User.findById(uid).select('baseCurrency').lean() as any;
  const baseCurrency = userDoc?.baseCurrency || 'USD';

  const { type, startDate, endDate, month, category, accountCode, entryId, page = '1', limit = '25' } = req.query;
  const pg = Math.max(1, parseInt(page as string, 10) || 1);
  const lim = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 25));
  const skip = (pg - 1) * lim;

  try {
    const matchUser: any = { userId: uid };
    let dateFilter: any = {};
    if (startDate) dateFilter.$gte = startDate;
    if (endDate) dateFilter.$lte = endDate;
    if (startDate || endDate) matchUser.date = dateFilter;

    const allAccounts = await Account.find({ userId: uid, isActive: true }).lean();
    const currencyMap = new Map(allAccounts.map(a => [a.code, { currency: (a as any).currency || 'USD' }]));

    if (type === 'revenue' || type === 'expenses') {
      const entries = await JournalEntry.find(matchUser).select('_id date').lean();
      const entryIds = entries.map(e => (e as any)._id.toString());
      const accMap = new Map(allAccounts.filter(a => a.type === (type === 'revenue' ? 'revenue' : 'expense')).map(a => [a.code, a.name]));
      const accCodes = [...accMap.keys()];

      const rawLines = await JournalLine.find({ journalEntryId: { $in: entryIds }, userId: uid, accountCode: { $in: accCodes } }).lean();
      const lines = await convertJournalLines(uid, rawLines, currencyMap, baseCurrency);
      const breakdown = new Map<string, { amount: number; count: number }>();
      for (const line of lines) {
        const name = accMap.get(line.accountCode) || line.accountCode;
        const existing = breakdown.get(name) || { amount: 0, count: 0 };
        existing.amount += (line.credit || 0) - (line.debit || 0);
        existing.count += 1;
        breakdown.set(name, existing);
      }
      const total = Array.from(breakdown.values()).reduce((s, v) => s + Math.abs(v.amount), 0);
      const result = Array.from(breakdown.entries())
        .map(([name, data]) => ({ category: name, amount: Math.round(data.amount * 100) / 100, count: data.count, percentage: total > 0 ? Math.round((Math.abs(data.amount) / total) * 1000) / 10 : 0 }))
        .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
      return res.status(200).json({ success: true, data: { breakdown: result, total: Math.round(Array.from(breakdown.values()).reduce((s, v) => s + v.amount, 0) * 100) / 100, baseCurrency } });
    }

    if (type === 'net-profit') {
      const entries = await JournalEntry.find(matchUser).select('_id date').lean();
      const entryIds = entries.map(e => (e as any)._id.toString());
      const accMap = new Map(allAccounts.map(a => [a.code, a]));
      const rawLines = await JournalLine.find({ journalEntryId: { $in: entryIds }, userId: uid }).lean();
      const lines = await convertJournalLines(uid, rawLines, currencyMap, baseCurrency);
      let revenue = 0, expenses = 0;
      for (const line of lines) {
        const info = accMap.get(line.accountCode);
        if (!info) continue;
        const net = (line.credit || 0) - (line.debit || 0);
        if (info.type === 'revenue') revenue += net;
        else if (info.type === 'expense') expenses += Math.abs(net);
      }
      revenue = Math.round(revenue * 100) / 100;
      expenses = Math.round(expenses * 100) / 100;
      const netProfit = Math.round((revenue - expenses) * 100) / 100;
      return res.status(200).json({ success: true, data: { revenue, expenses, netProfit, margin: revenue > 0 ? Math.round((netProfit / revenue) * 1000) / 10 : 0, baseCurrency } });
    }

    if (type === 'profit-margin') {
      const entries = await JournalEntry.find(matchUser).sort({ date: 1 }).select('_id date').lean();
      const entryIds = entries.map(e => (e as any)._id.toString());
      const accMap = new Map(allAccounts.map(a => [a.code, a]));
      const rawLines = await JournalLine.find({ journalEntryId: { $in: entryIds }, userId: uid }).lean();
      const lines = await convertJournalLines(uid, rawLines, currencyMap, baseCurrency);
      const byMonth = new Map<string, { revenue: number; expenses: number }>();
      for (const entry of entries) {
        const month = (entry as any).date?.slice(0, 7);
        if (month && !byMonth.has(month)) byMonth.set(month, { revenue: 0, expenses: 0 });
      }
      for (const line of lines) {
        const info = accMap.get(line.accountCode);
        if (!info) continue;
        const e = entries.find(en => (en as any)._id.toString() === line.journalEntryId);
        if (!e) continue;
        const month = (e as any).date?.slice(0, 7);
        if (!month || !byMonth.has(month)) continue;
        const d = byMonth.get(month)!;
        const net = (line.credit || 0) - (line.debit || 0);
        if (info.type === 'revenue') d.revenue += net;
        else if (info.type === 'expense') d.expenses += Math.abs(net);
      }
      const monthly = Array.from(byMonth.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([m, d]) => ({
        month: m,
        margin: d.revenue > 0 ? Math.round(((d.revenue - d.expenses) / d.revenue) * 1000) / 10 : 0,
      }));
      return res.status(200).json({ success: true, data: { monthly, baseCurrency } });
    }

    if (type === 'cash-balance') {
      const cashAccounts = allAccounts.filter(a => /^1(0|1)\d{2}$/.test(a.code));
      const cashCodes = cashAccounts.map(a => a.code);
      const aggregated = await JournalLine.aggregate([
        { $match: { userId: uid, accountCode: { $in: cashCodes } } },
        { $group: { _id: '$accountCode', totalDebit: { $sum: '$debit' }, totalCredit: { $sum: '$credit' } } },
      ]);
      const { convertAmount } = await import('@/lib/currency');
      const balanceMap = new Map<string, number>();
      for (const l of aggregated) {
        const fromCurrency = currencyMap.get(l._id)?.currency || 'USD';
        const rawBalance = l.totalDebit - l.totalCredit;
        if (fromCurrency === baseCurrency) {
          balanceMap.set(l._id, Math.round(rawBalance * 100) / 100);
        } else {
          const absConverted = await convertAmount(uid, Math.abs(rawBalance), fromCurrency, baseCurrency);
          balanceMap.set(l._id, Math.round((rawBalance < 0 ? -absConverted : absConverted) * 100) / 100);
        }
      }
      const result = cashAccounts.map(a => ({ accountCode: a.code, accountName: a.name, balance: balanceMap.get(a.code) || 0 }));
      const total = Math.round(result.reduce((s, r) => s + r.balance, 0) * 100) / 100;
      return res.status(200).json({ success: true, data: { accounts: result, total, baseCurrency } });
    }

    if (type === 'entries' || type === 'month-revenue' || type === 'month-expense') {
      const query: any = { userId: uid };
      if (month) query.date = { $regex: `^${month}` };
      else { if (startDate) query.date = { ...query.date, $gte: startDate }; if (endDate) query.date = { ...query.date, $lte: endDate }; }

      const totalCount = await JournalEntry.countDocuments(query);
      const entries = await JournalEntry.find(query).sort({ date: -1 }).skip(skip).limit(lim).lean();

      let resultEntries = entries.map(e => ({ _id: (e as any)._id.toString(), date: (e as any).date, description: (e as any).description || '', amount: Math.round(((e as any).totalDebit || 0) * 100) / 100 }));

      if (type === 'month-revenue' || type === 'month-expense') {
        const entryIds = entries.map(e => (e as any)._id.toString());
        const acc = allAccounts.filter(a => a.type === (type === 'month-revenue' ? 'revenue' : 'expense'));
        const accCodes = new Set(acc.map(a => a.code));
        const rawLines = await JournalLine.find({ journalEntryId: { $in: entryIds }, userId: uid, accountCode: { $in: [...accCodes] } }).lean();
        const lines = await convertJournalLines(uid, rawLines, currencyMap, baseCurrency);
        const lineTotals = new Map<string, number>();
        for (const line of lines) {
          const curr = lineTotals.get(line.journalEntryId) || 0;
          lineTotals.set(line.journalEntryId, curr + (line.credit || 0) - (line.debit || 0));
        }
        resultEntries = resultEntries.map(e => ({ ...e, amount: Math.round((lineTotals.get(e._id) || 0) * 100) / 100 }));
      }

      return res.status(200).json({ success: true, data: { entries: resultEntries, total: totalCount, page: pg, totalPages: Math.ceil(totalCount / lim), baseCurrency } });
    }

    if (type === 'category-detail') {
      const cat = category as string;
      const accMap = new Map(allAccounts.map(a => [a.code, a]));
      const catAccount = allAccounts.find(a => a.name === cat);
      if (!catAccount) return res.status(404).json({ success: false, error: 'Category not found' });

      const entries = await JournalEntry.find(matchUser).select('_id date').lean();
      const entryIds = entries.map(e => (e as any)._id.toString());
      const rawLines = await JournalLine.find({ journalEntryId: { $in: entryIds }, userId: uid, accountCode: { $regex: catAccount.type === 'revenue' ? '^4' : '^5' } }).lean();
      const lines = await convertJournalLines(uid, rawLines, currencyMap, baseCurrency);
      const accTotals = new Map<string, { amount: number; count: number }>();
      for (const line of lines) {
        const info = accMap.get(line.accountCode);
        if (!info || info.name !== cat) continue;
        const existing = accTotals.get(line.accountCode) || { amount: 0, count: 0 };
        existing.amount += (info.type === 'revenue' ? 1 : -1) * ((line.credit || 0) - (line.debit || 0));
        existing.count += 1;
        accTotals.set(line.accountCode, existing);
      }
      const total = Array.from(accTotals.values()).reduce((s, v) => s + Math.abs(v.amount), 0);
      const result = Array.from(accTotals.entries())
        .map(([code, data]) => ({ accountCode: code, accountName: accMap.get(code)?.name || code, amount: Math.round(data.amount * 100) / 100, count: data.count, percentage: total > 0 ? Math.round((Math.abs(data.amount) / total) * 1000) / 10 : 0 }))
        .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
      return res.status(200).json({ success: true, data: { accounts: result, total: Math.round(Array.from(accTotals.values()).reduce((s, v) => s + v.amount, 0) * 100) / 100, baseCurrency } });
    }

    if (type === 'entry-detail') {
      const eid = entryId as string;
      const entry = await JournalEntry.findById(eid).lean();
      if (!entry || (entry as any).userId !== uid) return res.status(404).json({ error: 'Entry not found' });
      const accMap = new Map(allAccounts.map(a => [a.code, a]));
      const rawLines = await JournalLine.find({ journalEntryId: eid, userId: uid }).lean();
      const lines = await convertJournalLines(uid, rawLines, currencyMap, baseCurrency);
      const lineDetails = lines.map(l => ({ accountCode: l.accountCode, accountName: accMap.get(l.accountCode)?.name || l.accountCode, debit: l.debit || 0, credit: l.credit || 0, description: l.description || '' }));
      return res.status(200).json({ success: true, data: { entry: { _id: (entry as any)._id.toString(), date: (entry as any).date, description: (entry as any).description || '' }, lines: lineDetails, baseCurrency } });
    }

    if (type === 'account-journal') {
      const ac = accountCode as string;
      const accountInfo = allAccounts.find(a => a.code === ac);
      if (!accountInfo) return res.status(404).json({ error: 'Account not found' });
      const rawLines = await JournalLine.find({ userId: uid, accountCode: ac }).sort({ _id: -1 }).skip(skip).limit(lim).lean();
      const lines = await convertJournalLines(uid, rawLines, currencyMap, baseCurrency);
      const entryIds = lines.map(l => l.journalEntryId);
      const entries = await JournalEntry.find({ _id: { $in: entryIds }, userId: uid }).select('date description').lean();
      const entryMap = new Map(entries.map(e => [(e as any)._id.toString(), e]));
      const totalCount = await JournalLine.countDocuments({ userId: uid, accountCode: ac });
      const result = lines.map(l => {
        const e = entryMap.get(l.journalEntryId);
        return { date: (e as any)?.date || '', description: (e as any)?.description || l.description || '', debit: l.debit || 0, credit: l.credit || 0, balance: Math.round(((l.debit || 0) - (l.credit || 0)) * 100) / 100 };
      });
      return res.status(200).json({ success: true, data: { accountInfo: { code: (accountInfo as any).code, name: (accountInfo as any).name, type: (accountInfo as any).type }, lines: result, total: totalCount, page: pg, totalPages: Math.ceil(totalCount / lim), baseCurrency } });
    }

    return res.status(400).json({ error: 'Invalid type' });
  } catch (e: any) {
    console.error('drilldown error:', e?.message || e);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
