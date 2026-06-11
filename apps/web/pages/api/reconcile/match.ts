import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import Reconciliation from '@/lib/models/Reconciliation';
import ReconciliationLine from '@/lib/models/ReconciliationLine';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = token.sub!;

  await dbConnect();

  try {
    const { reconciliationId, lineId, action, matchedEntryId, matchedLineIds } = req.body;
    if (!reconciliationId || !lineId || !action) {
      return res.status(400).json({ error: 'reconciliationId, lineId, and action are required' });
    }

    const rec = await Reconciliation.findOne({ _id: reconciliationId, userId: uid });
    if (!rec) return res.status(404).json({ error: 'Reconciliation not found' });

    if (action === 'match') {
      if (!matchedEntryId) return res.status(400).json({ error: 'matchedEntryId required for match action' });

      await ReconciliationLine.findByIdAndUpdate(lineId, {
        status: 'matched',
        matchedEntryId,
        matchedLineIds: matchedLineIds || [],
        confidence: 1,
      });

      rec.matchedCount += 1;
      rec.unmatchedCount = Math.max(0, rec.unmatchedCount - 1);
      await rec.save();
    } else if (action === 'unmatch') {
      await ReconciliationLine.findByIdAndUpdate(lineId, {
        status: 'unmatched',
        matchedEntryId: null,
        matchedLineIds: [],
        confidence: 0,
      });

      rec.matchedCount = Math.max(0, rec.matchedCount - 1);
      rec.unmatchedCount += 1;
      await rec.save();
    } else if (action === 'exclude') {
      await ReconciliationLine.findByIdAndUpdate(lineId, {
        status: 'excluded',
        matchedEntryId: null,
        matchedLineIds: [],
      });

      rec.unmatchedCount = Math.max(0, rec.unmatchedCount - 1);
      await rec.save();
    } else {
      return res.status(400).json({ error: 'Invalid action. Use match, unmatch, or exclude.' });
    }

    return res.status(200).json({ success: true, data: { matchedCount: rec.matchedCount, unmatchedCount: rec.unmatchedCount } });
  } catch (e: any) {
    console.error('reconcile/match error:', e?.message || e);
    return res.status(500).json({ error: e?.message || 'Internal server error' });
  }
}
