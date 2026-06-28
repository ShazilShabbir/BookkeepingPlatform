import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongoose';
import JournalEntry from '@/lib/models/JournalEntry';
import JournalLine from '@/lib/models/JournalLine';
import Account from '@/lib/models/Account';
import Invoice from '@/lib/models/Invoice';
import User from '@/lib/models/User';
import { getCurrencySymbol } from '@/lib/format';

interface SearchResult {
  id: string;
  type: 'entry' | 'account' | 'invoice';
  title: string;
  subtitle: string;
  href: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { q, limit = '8' } = req.query;
  const query = (q as string || '').trim();
  const limitNum = Math.min(20, Math.max(1, parseInt(limit as string, 10)));

  if (query.length < 2) {
    return res.status(200).json({ success: true, data: [] });
  }

  try {
    await dbConnect();

    const userId = session.user.email;
    const searchRegex = { $regex: query, $options: 'i' };

    const userDoc = await User.findOne({ id: userId }).select('baseCurrency').lean().catch(() => null) as any;
    const baseCurrency = userDoc?.baseCurrency || 'USD';

    // Search in parallel
    const [entries, accounts, invoices] = await Promise.all([
      // Search journal entries via their lines
      JournalLine.find({
        userId,
        $or: [
          { description: searchRegex },
          { accountCode: searchRegex },
        ],
      })
        .limit(limitNum * 2)
        .select('journalEntryId description accountCode debit credit')
        .lean()
        .then(async (lines) => {
          // Get unique entry IDs
          const entryIds = [...new Set(lines.map(l => l.journalEntryId))];
          if (entryIds.length === 0) return [];

          // Fetch the journal entries
          const entries = await JournalEntry.find({ _id: { $in: entryIds } })
            .select('_id date description')
            .lean();

          // Map entries with their lines
          const entryMap = new Map(entries.map((e: any) => [e._id.toString(), e]));
          const results: SearchResult[] = [];
          const seen = new Set<string>();

          for (const line of lines) {
            if (seen.has(line.journalEntryId) || results.length >= limitNum) continue;
            seen.add(line.journalEntryId);
            const entry = entryMap.get(line.journalEntryId);
            if (entry) {
              const amount = line.debit - line.credit;
              results.push({
                id: line.journalEntryId,
                type: 'entry',
                title: entry.description || line.description || 'Transaction',
                subtitle: `${line.accountCode} · ${entry.date} · ${amount >= 0 ? '+' : ''}${getCurrencySymbol(baseCurrency)}${Math.abs(amount).toFixed(2)}`,
                href: '/dashboard?tab=transactions',
              });
            }
          }
          return results;
        }),

      // Search accounts
      Account.find({
        userId,
        $or: [
          { name: searchRegex },
          { code: searchRegex },
        ],
      })
        .limit(limitNum)
        .select('_id name code type')
        .lean()
        .then(results => results.map((r: any) => ({
          id: r._id.toString(),
          type: 'account' as const,
          title: r.name,
          subtitle: `${r.code} · ${r.type}`,
          href: '/dashboard?tab=accounts',
        }))),

      // Search invoices
      Invoice.find({
        userId,
        $or: [
          { invoiceNumber: searchRegex },
          { customerName: searchRegex },
        ],
      })
        .limit(limitNum)
        .select('_id invoiceNumber customerName total status currency')
        .lean()
        .then(results => results.map((r: any) => ({
          id: r._id.toString(),
          type: 'invoice' as const,
          title: `Invoice ${r.invoiceNumber}`,
          subtitle: `${r.customerName || 'No customer'} · ${getCurrencySymbol(r.currency || 'USD')}${(r.total || 0).toFixed(2)} · ${r.status || 'draft'}`,
          href: '/dashboard?tab=invoices',
        }))),
    ]);

    // Combine and sort by relevance
    const allResults = [
      ...entries.slice(0, 4),
      ...accounts.slice(0, 4),
      ...invoices.slice(0, 4),
    ].slice(0, limitNum);

    return res.status(200).json({ success: true, data: allResults });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ success: false, data: [] });
  }
}
