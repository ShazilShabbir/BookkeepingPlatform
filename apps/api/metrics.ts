import { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';

// Initialize Firebase (use environment variables)
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const entriesRef = collection(db, 'ledger_entries');
    const q = query(entriesRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    let totalIncome = 0;
    let totalExpenses = 0;

    snapshot.forEach((doc) => {
      const entry = doc.data();
      if (entry.type === 'income') {
        totalIncome += entry.amount;
      } else {
        totalExpenses += Math.abs(entry.amount);
      }
    });

    res.status(200).json({
      success: true,
      data: {
        totalRevenue: totalIncome,
        totalExpenses,
        netProfit: totalIncome - totalExpenses,
        entryCount: snapshot.size,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
