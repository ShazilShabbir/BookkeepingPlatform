import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import Reconciliation from '@/lib/models/Reconciliation';
import ReconciliationLine from '@/lib/models/ReconciliationLine';
import JournalEntry from '@/lib/models/JournalEntry';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = token.sub!;

  await dbConnect();

  try {
    const { reconciliationId } = req.body;
    if (!reconciliationId) return res.status(400).json({ error: 'reconciliationId required' });

    const rec = await Reconciliation.findOne({ _id: reconciliationId, userId: uid });
    if (!rec) return res.status(404).json({ error: 'Reconciliation not found' });
    if (rec.status === 'completed') return res.status(400).json({ error: 'Reconciliation already completed' });

    const matchedLines = await ReconciliationLine.find({ reconciliationId, status: 'matched' }).lean();
    const unmatchedLines = await ReconciliationLine.find({ reconciliationId, status: 'unmatched' }).lean();
    const excludedCount = await ReconciliationLine.countDocuments({ reconciliationId, status: 'excluded' });

    // Mark matched journal entries as reconciled
    const matchedEntryIds = [...new Set(matchedLines.map((l: any) => l.matchedEntryId).filter(Boolean))];
    for (const eid of matchedEntryIds) {
      await JournalEntry.findByIdAndUpdate(eid, { $set: { reconciled: true, reconciledAt: new Date().toISOString() } });
    }

    // Calculate final balances
    let ledgerTotal = 0;
    for (const line of matchedLines) {
      ledgerTotal += line.amount;
    }

    const difference = rec.statementBalance - rec.startingBalance - ledgerTotal;

    rec.status = 'completed';
    rec.ledgerBalance = Math.round(ledgerTotal * 100) / 100;
    rec.difference = Math.round(difference * 100) / 100;
    rec.matchedCount = matchedLines.length;
    rec.unmatchedCount = unmatchedLines.length;
    await rec.save();

    return res.status(200).json({
      success: true,
      data: {
        reconciliationId: rec._id.toString(),
        status: 'completed',
        matchedCount: matchedLines.length,
        unmatchedCount: unmatchedLines.length,
        excludedCount,
        startingBalance: rec.startingBalance,
        statementBalance: rec.statementBalance,
        ledgerBalance: rec.ledgerBalance,
        difference: rec.difference,
      },
    });
  } catch (e: any) {
    console.error('reconcile/confirm error:', e?.message || e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
