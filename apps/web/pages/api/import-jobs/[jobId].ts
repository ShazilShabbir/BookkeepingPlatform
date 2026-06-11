import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import ImportJob from '@/lib/models/ImportJob';
import JournalEntry from '@/lib/models/JournalEntry';
import JournalLine from '@/lib/models/JournalLine';
import mongoose from 'mongoose';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = token.sub!;

  await dbConnect();

  const { jobId } = req.query;
  if (!jobId || Array.isArray(jobId)) return res.status(400).json({ error: 'Invalid jobId' });

  if (req.method === 'GET') {
    const job = await ImportJob.findOne({ _id: jobId, userId: uid }).lean();
    if (!job) return res.status(404).json({ error: 'Import job not found' });

    const entries = await JournalEntry.find({ userId: uid, jobId }).sort({ date: -1 }).lean();
    const results = [];
    for (const entry of entries) {
      const lines = await JournalLine.find({ journalEntryId: (entry as any)._id.toString(), userId: uid }).lean();
      results.push({ ...entry, lines });
    }

    return res.status(200).json({ success: true, data: { job, entries: results } });
  }

  if (req.method === 'DELETE') {
    const job = await ImportJob.findOne({ _id: jobId, userId: uid }).lean();
    if (!job) return res.status(404).json({ error: 'Import job not found' });

    const entries = await JournalEntry.find({ userId: uid, jobId }).lean();

    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      await ImportJob.findByIdAndDelete(jobId, { session });
      for (const entry of entries) {
        await JournalLine.deleteMany({ journalEntryId: (entry as any)._id.toString(), userId: uid }, { session });
        await JournalEntry.findByIdAndDelete(entry._id, { session });
      }
      await session.commitTransaction();
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      session.endSession();
    }

    return res.status(200).json({ success: true, data: { deletedEntries: entries.length } });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
