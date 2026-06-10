import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import JournalEntry from '@/lib/models/JournalEntry';
import JournalLine from '@/lib/models/JournalLine';
import Account from '@/lib/models/Account';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = token.sub!;

  await dbConnect();

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const q = (req.query.q as string) || '';
  const page = parseInt((req.query.page as string) || '1');
  const pageSize = Math.min(parseInt((req.query.pageSize as string) || '50'), 100);

  if (!q.trim()) {
    const total = await JournalEntry.countDocuments({ userId: uid });
    const entries = await JournalEntry.find({ userId: uid })
      .sort({ date: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();

    const results = [];
    for (const entry of entries) {
      const lines = await JournalLine.find({ journalEntryId: entry._id.toString(), userId: uid }).lean();
      results.push({ ...entry, lines });
    }

    return res.status(200).json({
      success: true,
      data: results,
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
    });
  }

  const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const searchRegex = new RegExp(escapedQ, 'i');

  const matchingAccounts = await Account.find({
    userId: uid,
    $or: [{ code: searchRegex }, { name: searchRegex }],
  }).lean();
  const accountCodes = matchingAccounts.map(a => a.code);

  const matchingLines = await JournalLine.find({
    userId: uid,
    $or: [
      { description: searchRegex },
      { accountCode: { $in: accountCodes } },
    ],
  }).lean();

  const matchedEntryIds = [...new Set(matchingLines.map(l => l.journalEntryId))];

  const total = matchedEntryIds.length;
  const paginatedEntryIds = matchedEntryIds.slice((page - 1) * pageSize, page * pageSize);

  const results = [];
  for (const eid of paginatedEntryIds) {
    const entry = await JournalEntry.findOne({ _id: eid, userId: uid }).lean();
    if (!entry) continue;
    const lines = await JournalLine.find({ journalEntryId: eid, userId: uid }).lean();
    results.push({ ...entry, lines });
  }

  return res.status(200).json({
    success: true,
    data: results,
    page,
    pageSize,
    total,
    hasMore: page * pageSize < total,
  });
}
