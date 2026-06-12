import { VercelRequest, VercelResponse } from '@vercel/node';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) throw new Error('MONGODB_URI environment variable is required');

const JournalEntrySchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  date: { type: String, required: true },
  description: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

const JournalLineSchema = new mongoose.Schema({
  journalEntryId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  userId: { type: String, required: true, index: true },
  accountCode: { type: String, required: true },
  description: { type: String, default: '' },
  debit: { type: Number, default: 0 },
  credit: { type: Number, default: 0 },
});

const AccountSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  code: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, required: true, enum: ['revenue', 'expense', 'asset', 'liability', 'equity'] },
  normalBalance: { type: String, default: 'debit', enum: ['debit', 'credit'] },
  isActive: { type: Boolean, default: true },
});

const JournalEntry = mongoose.models.JournalEntry || mongoose.model('JournalEntry', JournalEntrySchema);
const JournalLine = mongoose.models.JournalLine || mongoose.model('JournalLine', JournalLineSchema);
const Account = mongoose.models.Account || mongoose.model('Account', AccountSchema);

let cachedConn: typeof mongoose | null = null;

async function dbConnect() {
  if (cachedConn) return cachedConn;
  cachedConn = await mongoose.connect(MONGODB_URI);
  return cachedConn;
}

export default async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.query;
  if (!userId || Array.isArray(userId)) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    await dbConnect();

    const entries = await JournalEntry.find({ userId }).select('_id').lean();
    const entryIds = entries.map((e: any) => e._id);

    const [lines, accounts] = await Promise.all([
      JournalLine.find({ journalEntryId: { $in: entryIds }, userId }).lean(),
      Account.find({ userId, isActive: true }).lean(),
    ]);

    const accountMap = new Map<string, string>();
    for (const a of accounts) {
      accountMap.set((a as any).code, (a as any).type);
    }

    let totalRevenue = 0;
    let totalExpenses = 0;

    for (const line of lines) {
      const acctType = accountMap.get((line as any).accountCode);
      if (!acctType) continue;

      const debit = (line as any).debit || 0;
      const credit = (line as any).credit || 0;

      if (acctType === 'revenue') {
        totalRevenue += credit - debit;
      } else if (acctType === 'expense') {
        totalExpenses += debit - credit;
      }
    }

    totalRevenue = Math.round(totalRevenue * 100) / 100;
    totalExpenses = Math.round(totalExpenses * 100) / 100;

    res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        entryCount: entries.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
