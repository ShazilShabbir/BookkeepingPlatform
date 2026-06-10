import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import Account from '@/lib/models/Account';
import { classifyTransactions } from '@/lib/ai';
import { classifyRow } from '@/lib/classify';

function buildAccountMap(accounts: any[]): Map<string, { code: string; name: string; type: string }> {
  const map = new Map<string, { code: string; name: string; type: string }>();
  for (const a of accounts) map.set(a.code, { code: a.code, name: a.name, type: a.type });
  return map;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = token.sub!;

  const { transactions, columnMapping } = req.body;
  if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
    return res.status(400).json({ error: 'transactions array required' });
  }

  try {
    await dbConnect();
    const accountDocs = await Account.find({ userId: uid, isActive: true }).lean();
    const accountsByCode = buildAccountMap(accountDocs);
    const accounts = Array.from(accountsByCode.values());

    const aiInput = transactions.map((t: any) => ({
      date: t.date || '',
      description: t.description || '',
      amount: Math.abs(t.amount),
      isDebit: t.amount < 0,
    }));

    const aiResults = await classifyTransactions(aiInput, accounts);
    const results = transactions.map((t: any, i: number) => {
      let accountCode: string;
      let accountName: string;
      let confidence: number;
      let reasoning: string;
      let source: 'ai' | 'keyword' | 'default';

      if (aiResults && aiResults[i] && aiResults[i].confidence >= 0.4) {
        const r = aiResults[i];
        accountCode = r.accountCode;
        accountName = r.accountName;
        confidence = r.confidence;
        reasoning = r.reasoning;
        source = 'ai';
      } else {
        const keywordAcct = classifyRow(
          '', t.description || '', Math.abs(t.amount), false,
          new Map(), accountsByCode, {},
        );
        accountCode = keywordAcct.code;
        accountName = keywordAcct.name;
        confidence = 0.5;
        reasoning = 'keyword match';
        source = aiResults ? 'ai' : 'keyword';
      }

      const acct = accountsByCode.get(accountCode);
      if (acct) { accountCode = acct.code; accountName = acct.name; }

      return {
        index: i,
        date: t.date,
        description: t.description,
        amount: t.amount,
        accountCode,
        accountName,
        confidence,
        reasoning,
        source,
      };
    });

    return res.status(200).json({ success: true, data: results, accounts });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
