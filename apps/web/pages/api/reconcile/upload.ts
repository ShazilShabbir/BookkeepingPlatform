import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import Reconciliation from '@/lib/models/Reconciliation';
import ReconciliationLine from '@/lib/models/ReconciliationLine';
import Papa from 'papaparse';
import { checkFeatureAccess } from '@/lib/subscription';

function detectColumns(headers: string[]): { dateCol: string; descCol: string; debitCol: string; creditCol: string; amountCol: string } {
  let dateCol = headers.find(h => /date|posted|transaction|time/i.test(h)) || '';
  let descCol = headers.find(h => /descript|memo|note|payee|name|detail|narration|particulars/i.test(h)) || '';
  let debitCol = headers.find(h => /debit|withdrawal|payment|charge|outflow|withdraw/i.test(h)) || '';
  let creditCol = headers.find(h => /credit|deposit|inflow/i.test(h)) || '';
  let amountCol = headers.find(h => /amount|total|value|sum/i.test(h)) || '';
  if (!dateCol) dateCol = headers[0] || '';
  if (!descCol && headers[1]) descCol = headers[1];
  return { dateCol, descCol, debitCol, creditCol, amountCol };
}

function parseAmount(raw: string): number {
  return parseFloat(raw.replace(/[$€£¥,\s]/g, '')) || 0;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = token.sub!;

  const { allowed } = await checkFeatureAccess(uid!, 'bank-reconciliation');
  if (!allowed) return res.status(403).json({ error: 'Reconciliation requires Pro plan or higher. Visit /pricing to upgrade.', code: 'UPGRADE_REQUIRED' });

  await dbConnect();

  try {
    const { content, accountCode, periodStart, periodEnd, startingBalance, statementBalance } = req.body;
    if (!content || !accountCode || !periodStart || !periodEnd) {
      return res.status(400).json({ error: 'content, accountCode, periodStart, and periodEnd are required' });
    }

    const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
    const rows = parsed.data as Record<string, string>[];
    if (rows.length === 0) return res.status(400).json({ error: 'CSV contains no data rows' });

    const headers = Object.keys(rows[0]);
    const cols = detectColumns(headers);

    const reconciliation = await Reconciliation.create({
      userId: uid,
      accountCode,
      periodStart,
      periodEnd,
      status: 'draft',
      startingBalance: startingBalance || 0,
      statementBalance: statementBalance || 0,
      totalStatementLines: rows.length,
    });

    const lines: any[] = [];
    for (const row of rows) {
      const date = row[cols.dateCol] || '';
      const description = row[cols.descCol] || '';
      let amount = 0;
      let type: 'debit' | 'credit' = 'debit';

      if (cols.debitCol && cols.creditCol) {
        const debit = parseAmount(row[cols.debitCol]);
        const credit = parseAmount(row[cols.creditCol]);
        if (debit > 0) { amount = debit; type = 'debit'; }
        else if (credit > 0) { amount = credit; type = 'credit'; }
      } else if (cols.amountCol) {
        amount = parseAmount(row[cols.amountCol]);
        type = amount >= 0 ? 'debit' : 'credit';
        amount = Math.abs(amount);
      }

      if (amount === 0) continue;

      lines.push({
        reconciliationId: reconciliation._id.toString(),
        date,
        description,
        amount,
        type,
        status: 'unmatched',
      });
    }

    if (lines.length > 0) {
      await ReconciliationLine.insertMany(lines);
      await Reconciliation.findByIdAndUpdate(reconciliation._id, { totalStatementLines: lines.length });
    }

    return res.status(200).json({
      success: true,
      data: {
        reconciliationId: reconciliation._id.toString(),
        totalLines: lines.length,
        accountCode,
        periodStart,
        periodEnd,
        cols,
        headers,
      },
    });
  } catch (e: any) {
    console.error('reconcile/upload error:', e?.message || e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
