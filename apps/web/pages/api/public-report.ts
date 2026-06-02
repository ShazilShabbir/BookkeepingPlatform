import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/firebase-server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'token is required' });
    }

    const snapshot = await db.collection('clients').where('accessToken', '==', token).get();
    if (snapshot.empty) {
      return res.status(404).json({ error: 'Invalid or expired link' });
    }

    const clientDoc = snapshot.docs[0];
    const client = clientDoc.data() as { userId: string; clientName: string; email: string };
    const ownerId = client.userId;

    const entriesSnapshot = await db.collection('ledger_entries').where('userId', '==', ownerId).get();

    let totalRevenue = 0;
    let totalExpenses = 0;
    const categoryMap = new Map<string, { amount: number; count: number }>();

    entriesSnapshot.forEach((doc) => {
      const entry = doc.data() as { date: string; amount: number; type: 'income' | 'expense'; category: string };
      if (entry.type === 'income') {
        totalRevenue += entry.amount;
      } else {
        totalExpenses += Math.abs(entry.amount);
      }
      const cat = entry.category || 'uncategorized';
      const existing = categoryMap.get(cat) || { amount: 0, count: 0 };
      existing.amount += entry.type === 'income' ? entry.amount : -Math.abs(entry.amount);
      existing.count++;
      categoryMap.set(cat, existing);
    });

    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    const topCategories = Array.from(categoryMap.entries())
      .map(([category, stats]) => ({ category, amount: stats.amount, count: stats.count }))
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
      .slice(0, 5);

    return res.status(200).json({
      success: true,
      data: {
        clientName: client.clientName,
        totalRevenue,
        totalExpenses,
        netProfit,
        profitMargin,
        entryCount: entriesSnapshot.size,
        topCategories,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
