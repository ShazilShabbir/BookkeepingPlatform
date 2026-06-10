import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import JournalEntry from '@/lib/models/JournalEntry';
import JournalLine from '@/lib/models/JournalLine';
import ClosedPeriod from '@/lib/models/ClosedPeriod';
import mongoose from 'mongoose';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = token.sub!;

  await dbConnect();

  const { entryId } = req.query;
  if (!entryId || Array.isArray(entryId)) return res.status(400).json({ error: 'Invalid entryId' });

  const entry = await JournalEntry.findOne({ _id: entryId, userId: uid }).lean();
  if (!entry) return res.status(404).json({ error: 'Entry not found' });

  if (req.method === 'GET') {
    const lines = await JournalLine.find({ journalEntryId: entryId, userId: uid }).lean();
    return res.status(200).json({ success: true, data: { ...entry, lines } });
  }

  if (req.method === 'PUT') {
    const { date, description } = req.body;
    if (!date) return res.status(400).json({ error: 'date is required' });

    const period = (entry as any).date?.slice(0, 7);
    if (period) {
      const closed = await ClosedPeriod.findOne({ userId: uid, yearMonth: period });
      if (closed) return res.status(403).json({ error: 'Cannot edit entries in a closed period' });
    }

    await JournalEntry.findByIdAndUpdate(entryId, {
      $set: { date, description: description || '', updatedAt: new Date() },
    });

    return res.status(200).json({ success: true });
  }

  if (req.method === 'DELETE') {
    const period = (entry as any).date?.slice(0, 7);
    if (period) {
      const closed = await ClosedPeriod.findOne({ userId: uid, yearMonth: period });
      if (closed) return res.status(403).json({ error: 'Cannot delete entries in a closed period' });
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      await JournalEntry.findByIdAndDelete(entryId, { session });
      await JournalLine.deleteMany({ journalEntryId: entryId, userId: uid }, { session });
      await session.commitTransaction();
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      session.endSession();
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
