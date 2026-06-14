import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongoose';
import Account from '@/lib/models/Account';
import { requireAuth, requireRole, checkCsrf } from '@/lib/auth';

const defaultAccounts = [
  { code: '1000', name: 'Cash', type: 'asset', normalBalance: 'debit' },
  { code: '1100', name: 'Accounts Receivable', type: 'asset', normalBalance: 'debit' },
  { code: '1200', name: 'Inventory', type: 'asset', normalBalance: 'debit' },
  { code: '1300', name: 'Prepaid Expenses', type: 'asset', normalBalance: 'debit' },
  { code: '1400', name: 'Equipment', type: 'asset', normalBalance: 'debit' },
  { code: '1500', name: 'Furniture & Fixtures', type: 'asset', normalBalance: 'debit' },
  { code: '1600', name: 'Accumulated Depreciation', type: 'asset', normalBalance: 'credit' },
  { code: '2000', name: 'Accounts Payable', type: 'liability', normalBalance: 'credit' },
  { code: '2100', name: 'Accrued Liabilities', type: 'liability', normalBalance: 'credit' },
  { code: '2200', name: 'Unearned Revenue', type: 'liability', normalBalance: 'credit' },
  { code: '2300', name: 'Loans Payable', type: 'liability', normalBalance: 'credit' },
  { code: '3000', name: 'Owner\'s Equity', type: 'equity', normalBalance: 'credit' },
  { code: '3100', name: 'Retained Earnings', type: 'equity', normalBalance: 'credit' },
  { code: '4000', name: 'Sales Revenue', type: 'revenue', normalBalance: 'credit' },
  { code: '4100', name: 'Service Revenue', type: 'revenue', normalBalance: 'credit' },
  { code: '4200', name: 'Interest Income', type: 'revenue', normalBalance: 'credit' },
  { code: '5000', name: 'Cost of Goods Sold', type: 'expense', normalBalance: 'debit' },
  { code: '5100', name: 'Salaries & Wages', type: 'expense', normalBalance: 'debit' },
  { code: '5200', name: 'Rent & Utilities', type: 'expense', normalBalance: 'debit' },
  { code: '5300', name: 'Office Supplies', type: 'expense', normalBalance: 'debit' },
  { code: '5400', name: 'Marketing & Advertising', type: 'expense', normalBalance: 'debit' },
  { code: '5500', name: 'Travel & Meals', type: 'expense', normalBalance: 'debit' },
  { code: '5600', name: 'Professional Fees', type: 'expense', normalBalance: 'debit' },
  { code: '5700', name: 'Taxes & Licenses', type: 'expense', normalBalance: 'debit' },
  { code: '5800', name: 'Other Expenses', type: 'expense', normalBalance: 'debit' },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!checkCsrf(req, res)) return;

    const token = await requireAuth(req, res);
    if (!token) return;
    if (!requireRole(token, 'admin')) {
      return res.status(403).json({ error: 'Only admins can seed accounts' });
    }
    const uid = token.sub!;

    await dbConnect();

    const existing = await Account.countDocuments({ userId: uid });
    if (existing > 0) return res.status(409).json({ error: 'Accounts already seeded' });

    const accounts = defaultAccounts.map(a => ({
      ...a,
      userId: uid,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await Account.insertMany(accounts);
    return res.status(201).json({ success: true, data: { count: accounts.length } });
  } catch (e: any) {
    console.error('[accounts/seed] error:', {
      name: e?.name,
      message: e?.message,
      code: e?.code,
    });
    const isDev = process.env.NODE_ENV === 'development';
    return res.status(500).json({ error: isDev ? (e?.message || 'Seed failed') : 'Seed failed' });
  }
}
