import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import Account from '@/lib/models/Account';
import { suggestAccounts } from '@/lib/ai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = token.sub!;

  const { descriptions } = req.body;
  if (!descriptions || !Array.isArray(descriptions) || descriptions.length === 0) {
    return res.status(400).json({ error: 'descriptions array required' });
  }

  try {
    await dbConnect();

    const accountDocs = await Account.find({ userId: uid }).lean();
    const existingAccounts: { code: string; name: string; type: string }[] = [];
    const existingCodes = new Set<string>();
    for (const a of accountDocs) {
      existingAccounts.push({ code: a.code, name: a.name, type: a.type });
      existingCodes.add(a.code);
    }

    const suggested = await suggestAccounts(descriptions, existingAccounts);
    if (!suggested || suggested.length === 0) {
      return res.status(200).json({ success: true, data: { accounts: [] } });
    }

    const createdAccounts: { code: string; name: string; type: string }[] = [];

    for (const account of suggested) {
      let finalCode = account.code;
      if (existingCodes.has(finalCode)) {
        const prefix = parseInt(account.code) > 3999 ? 5 : parseInt(account.code) > 2999 ? 4 : parseInt(account.code) > 1999 ? 3 : parseInt(account.code) > 999 ? 2 : 1;
        const rangeStart = prefix * 1000;
        for (let c = rangeStart + 10; c < rangeStart + 1000; c += 10) {
          const codeStr = String(c).padStart(4, '0');
          if (!existingCodes.has(codeStr)) {
            finalCode = codeStr;
            break;
          }
        }
        if (existingCodes.has(finalCode)) continue;
      }

      await Account.create({
        userId: uid,
        code: finalCode,
        name: account.name,
        type: account.type,
        isActive: true,
      });

      existingCodes.add(finalCode);
      createdAccounts.push({ code: finalCode, name: account.name, type: account.type });
    }

    res.status(200).json({ success: true, data: { accounts: createdAccounts } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
