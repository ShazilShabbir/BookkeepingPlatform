import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import JournalEntry from '@/lib/models/JournalEntry';
import JournalLine from '@/lib/models/JournalLine';
import Account from '@/lib/models/Account';
import ClosedPeriod from '@/lib/models/ClosedPeriod';
import mongoose from 'mongoose';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = token.sub!;

  await dbConnect();

  const { entryId, lineId, newAccountCode } = req.body;
  if (!entryId || !lineId || !newAccountCode) {
    return res.status(400).json({ error: 'entryId, lineId, and newAccountCode are required' });
  }

  const entry = await JournalEntry.findOne({ _id: entryId, userId: uid }).lean();
  if (!entry) return res.status(404).json({ error: 'Entry not found' });

  const period = (entry as any).date?.slice(0, 7);
  if (period) {
    const closed = await ClosedPeriod.findOne({ userId: uid, yearMonth: period });
    if (closed) return res.status(403).json({ error: 'Cannot reclassify entries in a closed period' });
  }

  const account = await Account.findOne({ userId: uid, code: newAccountCode }).lean();
  if (!account) return res.status(400).json({ error: 'Target account not found' });

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const line = await JournalLine.findOne({ _id: lineId, journalEntryId: entryId, userId: uid }).session(session);
    if (!line) throw new Error('Line not found');

    const oldCode = line.accountCode;
    line.accountCode = newAccountCode;
    await line.save({ session });

    await session.commitTransaction();
    return res.status(200).json({ success: true, data: { oldCode, newCode: newAccountCode } });
  } catch (e: any) {
    await session.abortTransaction();
    return res.status(500).json({ error: e?.message || 'Reclassification failed' });
  } finally {
    session.endSession();
  }
}
