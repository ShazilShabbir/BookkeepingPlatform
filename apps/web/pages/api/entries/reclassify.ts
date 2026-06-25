import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongoose';
import JournalEntry from '@/lib/models/JournalEntry';
import JournalLine from '@/lib/models/JournalLine';
import Account from '@/lib/models/Account';
import ClosedPeriod from '@/lib/models/ClosedPeriod';
import mongoose from 'mongoose';
import { logAction } from '@/lib/audit';
import { requireAuth, checkCsrf } from '@/lib/auth';
import { resolveUserId } from '@/lib/customerContext';
import { withRateLimit } from '@/lib/apiRateLimit';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!checkCsrf(req, res)) return;

  const token = await requireAuth(req, res);
  if (!token) return;
  const uid = await resolveUserId(token, req.body.userId);

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

  const account = await Account.findOne({ userId: uid, code: newAccountCode }).lean() as any;
  if (!account) return res.status(400).json({ error: 'Target account not found' });

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const line = await JournalLine.findOne({ _id: lineId, journalEntryId: entryId, userId: uid }).session(session);
    if (!line) throw new Error('Line not found');

    const oldCode = line.accountCode;
    const oldAccount = await Account.findOne({ userId: uid, code: oldCode }).lean() as any;
    if (!oldAccount) throw new Error('Original account not found');
    if (oldAccount.type !== account.type) {
      throw new Error(`Cannot change account type from ${oldAccount.type} to ${account.type}`);
    }
    line.accountCode = newAccountCode;
    await line.save({ session });

    await session.commitTransaction();
    await logAction({ userId: uid, action: 'reclassify', resource: 'entry', resourceId: entryId, details: { lineId, oldCode: line.accountCode, newCode: newAccountCode }, req });
    return res.status(200).json({ success: true, data: { oldCode, newCode: newAccountCode } });
  } catch (e: any) {
    await session.abortTransaction();
    console.error('reclassify error:', e?.message || e);
    return res.status(500).json({ error: 'Reclassification failed' });
  } finally {
    session.endSession();
  }
}

export default withRateLimit(handler);
