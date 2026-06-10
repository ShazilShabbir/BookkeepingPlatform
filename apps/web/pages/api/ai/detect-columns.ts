import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { detectColumns } from '@/lib/ai';
import Papa from 'papaparse';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'CSV content required' });

  try {
    const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
    const rows = parsed.data as Record<string, string>[];
    if (rows.length === 0) return res.status(400).json({ error: 'CSV contains no data rows' });

    const headers = Object.keys(rows[0]);
    const sampleRows = rows.slice(0, 3);

    const aiResult = await detectColumns(headers, sampleRows);

    if (aiResult) {
      return res.status(200).json({ success: true, data: { columns: aiResult, source: 'ai', headers } });
    }

    const dateCol = headers.find(h => /date|posted|transaction|time/i.test(h)) || headers[0];
    const descCol = headers.find(h => /descript|memo|note|payee|name|detail|narration|particulars/i.test(h)) || headers[1] || headers[0];
    let amountCol = headers.find(h => /amount|total|value|sum|debit|credit|deposit|withdrawal/i.test(h)) || '';
    let debitCol = headers.find(h => /debit|withdrawal|payment|charge|outflow|withdraw/i.test(h)) || '';
    let creditCol = headers.find(h => /credit|deposit|inflow/i.test(h)) || '';

    return res.status(200).json({
      success: true,
      data: {
        columns: {
          dateColumn: dateCol,
          descriptionColumn: descCol,
          debitColumn: debitCol || null,
          creditColumn: creditCol || null,
          amountColumn: amountCol || null,
          balanceColumn: headers.find(h => /balance/i.test(h)) || null,
        },
        source: 'heuristic',
        headers,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
