import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import JournalEntry from '@/lib/models/JournalEntry';
import JournalLine from '@/lib/models/JournalLine';
import Account from '@/lib/models/Account';
import User from '@/lib/models/User';
import { checkFeatureAccess } from '@/lib/subscription';
import { resolveUserIdFromQuery } from '@/lib/customerContext';
import { convertJournalLines } from '@/lib/currency';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = await resolveUserIdFromQuery(token, req);

  const { allowed } = await checkFeatureAccess(uid!, 'trial-balance');
  if (!allowed) return res.status(403).json({ error: 'Trial Balance requires Pro plan or higher. Visit /pricing to upgrade.', code: 'UPGRADE_REQUIRED' });

  await dbConnect();

  try {
    const userDoc = await User.findById(uid).select('baseCurrency').lean() as any;
    const baseCurrency = userDoc?.baseCurrency || 'USD';

    const { startDate, endDate } = req.query;
    const query: Record<string, any> = { userId: uid };
    if (startDate) query.date = { $gte: startDate as string };
    if (endDate) query.date = { ...query.date, $lte: endDate as string };

    const entries = await JournalEntry.find(query).select('_id').lean();
    const entryIds = entries.map(e => (e as any)._id.toString());

    const accountDocs = await Account.find({ userId: uid, isActive: true }).lean();
    const accountMap = new Map<string, { name: string; type: string; normalBalance: string }>();
    const currencyMap = new Map<string, { currency?: string }>();
    for (const a of accountDocs) {
      accountMap.set(a.code, { name: a.name, type: a.type, normalBalance: a.normalBalance || 'debit' });
      currencyMap.set(a.code, { currency: (a as any).currency || 'USD' });
    }

    const rawLines = await JournalLine.find({ journalEntryId: { $in: entryIds }, userId: uid }).lean();
    const lines = await convertJournalLines(uid, rawLines, currencyMap, baseCurrency);
    const accountTotals = new Map<string, { debits: number; credits: number }>();
    for (const line of lines) {
      const code = line.accountCode;
      if (!code) continue;
      const totals = accountTotals.get(code) || { debits: 0, credits: 0 };
      totals.debits += line.debit || 0;
      totals.credits += line.credit || 0;
      accountTotals.set(code, totals);
    }

    const rows: any[] = [];
    let totalDebits = 0, totalCredits = 0;
    for (const [code, totals] of accountTotals) {
      const info = accountMap.get(code);
      if (!info) continue;
      const normalBalance = info.normalBalance === 'credit' ? 'credit' : 'debit';
      const netBalance = normalBalance === 'credit' ? totals.credits - totals.debits : totals.debits - totals.credits;
      rows.push({ accountCode: code, accountName: info.name, accountType: info.type, normalBalance, totalDebits: totals.debits, totalCredits: totals.credits, netBalance });
      totalDebits += totals.debits;
      totalCredits += totals.credits;
    }
    rows.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    return res.status(200).json({
      success: true,
      data: {
        rows,
        totals: {
          totalDebits: Math.round(totalDebits * 100) / 100,
          totalCredits: Math.round(totalCredits * 100) / 100,
          difference: Math.round(Math.abs(totalDebits - totalCredits) * 100) / 100,
          balanced: Math.abs(totalDebits - totalCredits) < 0.01,
        },
        baseCurrency,
      },
    });
  } catch (e: any) {
    console.error('trial-balance error:', e?.message || e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
