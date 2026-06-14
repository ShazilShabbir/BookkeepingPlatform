import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import JournalEntry from '@/lib/models/JournalEntry';
import JournalLine from '@/lib/models/JournalLine';
import Account from '@/lib/models/Account';
import { resolveUserIdFromQuery } from '@/lib/customerContext';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = await resolveUserIdFromQuery(token, req);

  await dbConnect();

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const params = req.method === 'POST' ? req.body : req.query;

  const q = (params.q as string) || '';
  const page = Math.max(1, parseInt((params.page as string) || '1'));
  const pageSize = Math.min(parseInt((params.pageSize as string) || '50'), 100);
  const startDate = params.startDate as string | undefined;
  const endDate = params.endDate as string | undefined;

  const match: Record<string, any> = { userId: uid };

  if (startDate || endDate) {
    match.date = {};
    if (startDate) match.date.$gte = startDate;
    if (endDate) match.date.$lte = endDate;
  }

  if (!q.trim()) {
    const total = await JournalEntry.countDocuments(match);
    const entries = await JournalEntry.find(match)
      .sort({ date: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();

    const results = [];
    for (const entry of entries) {
      const lines = await JournalLine.find({ journalEntryId: (entry as any)._id.toString(), userId: uid }).lean();
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

  const lineMatch: Record<string, any> = {
    userId: uid,
    $or: [{ description: searchRegex }, { accountCode: { $in: accountCodes } }],
  };

  const matchingLines = await JournalLine.find(lineMatch).lean();
  const matchedEntryIds = [...new Set(matchingLines.map(l => l.journalEntryId.toString()))];

  const entryMatch: Record<string, any> = { _id: { $in: matchedEntryIds }, userId: uid };
  if (startDate || endDate) {
    entryMatch.date = {};
    if (startDate) entryMatch.date.$gte = startDate;
    if (endDate) entryMatch.date.$lte = endDate;
  }

  const total = await JournalEntry.countDocuments(entryMatch);
  const entries = await JournalEntry.find(entryMatch)
    .sort({ date: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean();

  const results = [];
  for (const entry of entries) {
    const lines = await JournalLine.find({ journalEntryId: (entry as any)._id.toString(), userId: uid }).lean();
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
