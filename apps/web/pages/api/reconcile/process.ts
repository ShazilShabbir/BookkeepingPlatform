import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import Reconciliation from '@/lib/models/Reconciliation';
import ReconciliationLine from '@/lib/models/ReconciliationLine';
import JournalEntry from '@/lib/models/JournalEntry';
import JournalLine from '@/lib/models/JournalLine';
import Account from '@/lib/models/Account';

function levenshteinDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a.toLowerCase(), b.toLowerCase()) / maxLen;
}

function parseDate(d: string): string {
  const dt = new Date(d);
  if (!isNaN(dt.getTime())) return dt.toISOString().split('T')[0];
  const parts = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (parts) {
    const d1 = new Date(`${parts[3]}-${parts[1]}-${parts[2]}`);
    if (!isNaN(d1.getTime())) return d1.toISOString().split('T')[0];
  }
  return d;
}

function daysBetween(a: string, b: string): number {
  const da = new Date(parseDate(a));
  const db = new Date(parseDate(b));
  return Math.abs((da.getTime() - db.getTime()) / (1000 * 60 * 60 * 24));
}

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
    if (rec.status !== 'draft') return res.status(400).json({ error: 'Reconciliation already processed' });

    const lines = await ReconciliationLine.find({ reconciliationId, status: 'unmatched' }).lean();
    const account = await Account.findOne({ userId: uid, code: rec.accountCode }).lean();
    if (!account) return res.status(400).json({ error: 'Account not found' });

    // Fetch all journal entries for this account in the period +-3 days buffer
    const bufferStart = new Date(rec.periodStart);
    bufferStart.setDate(bufferStart.getDate() - 3);
    const bufferEnd = new Date(rec.periodEnd);
    bufferEnd.setDate(bufferEnd.getDate() + 3);
    const bufStartStr = bufferStart.toISOString().split('T')[0];
    const bufEndStr = bufferEnd.toISOString().split('T')[0];

    const entries = await JournalEntry.find({
      userId: uid,
      date: { $gte: bufStartStr, $lte: bufEndStr },
    }).lean();

    const entryIds = entries.map(e => (e as any)._id.toString());
    const allLines = await JournalLine.find({
      journalEntryId: { $in: entryIds },
      accountCode: rec.accountCode,
    }).lean();

    const entryLineMap = new Map<string, any[]>();
    for (const line of allLines) {
      const existing = entryLineMap.get(line.journalEntryId) || [];
      existing.push(line);
      entryLineMap.set(line.journalEntryId, existing);
    }

    const entryMap = new Map<string, any>();
    for (const e of entries) entryMap.set((e as any)._id.toString(), e);

    const EXACT_MATCH_THRESHOLD = 0.85;
    const GOOD_MATCH_THRESHOLD = 0.6;
    const DAY_PENALTY = 0.05;

    let matchedCount = 0;
    let ledgerTotal = 0;

    for (const line of lines) {
      let bestScore = 0;
      let bestEntryId = '';
      let bestLineIds: string[] = [];

      for (const [entryId, jLines] of entryLineMap) {
        const entry = entryMap.get(entryId);
        if (!entry) continue;

        const lineTotal = jLines.reduce((sum: number, l: any) => sum + (l.debit || 0) + (l.credit || 0), 0);
        const amountsMatch = Math.abs(lineTotal - line.amount) < 0.01;
        if (!amountsMatch) continue;

        const dayDiff = daysBetween(line.date, entry.date);
        let score = 1 - dayDiff * DAY_PENALTY;
        if (score < 0) score = 0;

        const descSim = similarity(line.description, entry.description || '');
        score = score * 0.6 + descSim * 0.4;

        if (score > bestScore) {
          bestScore = score;
          bestEntryId = entryId;
          bestLineIds = jLines.map((l: any) => l._id.toString());
        }
      }

      if (bestScore >= EXACT_MATCH_THRESHOLD) {
        await ReconciliationLine.findByIdAndUpdate((line as any)._id.toString(), {
          status: 'matched',
          matchedEntryId: bestEntryId,
          matchedLineIds: bestLineIds,
          confidence: Math.round(bestScore * 100) / 100,
        });
        matchedCount++;
        const entry = entryMap.get(bestEntryId);
        if (entry) {
          const jLines = entryLineMap.get(bestEntryId) || [];
          ledgerTotal += jLines.reduce((sum: number, l: any) => sum + (l.debit || 0) + (l.credit || 0), 0);
        }
      } else if (bestScore >= GOOD_MATCH_THRESHOLD) {
        await ReconciliationLine.findByIdAndUpdate((line as any)._id.toString(), {
          matchedEntryId: bestEntryId,
          matchedLineIds: bestLineIds,
          confidence: Math.round(bestScore * 100) / 100,
        });
      }
    }

    const unmatchedCount = await ReconciliationLine.countDocuments({ reconciliationId, status: 'unmatched' });
    rec.status = 'in_progress';
    rec.matchedCount = matchedCount;
    rec.unmatchedCount = unmatchedCount;
    rec.ledgerBalance = ledgerTotal;
    rec.difference = rec.statementBalance - rec.startingBalance - ledgerTotal;
    await rec.save();

    const updatedLines = await ReconciliationLine.find({ reconciliationId }).sort({ date: 1 }).lean();

    return res.status(200).json({
      success: true,
      data: {
        reconciliationId: rec._id.toString(),
        matchedCount,
        unmatchedCount,
        ledgerBalance: rec.ledgerBalance,
        statementBalance: rec.statementBalance,
        startingBalance: rec.startingBalance,
        difference: rec.difference,
        totalLines: lines.length,
        lines: updatedLines,
      },
    });
  } catch (e: any) {
    console.error('reconcile/process error:', e?.message || e);
    return res.status(500).json({ error: e?.message || 'Internal server error' });
  }
}
