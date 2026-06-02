import { NextApiRequest, NextApiResponse } from 'next';
import { db, auth } from '@/lib/firebase-server';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  try {
    const idToken = authHeader.slice(7);
    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;

    if (req.method === 'GET') {
      const snapshot = await db.collection('clients').where('userId', '==', uid).get();
      const clients: { id: string; clientName: string; email: string; accessToken: string; createdAt: string }[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as any;
        clients.push({ id: doc.id, ...data });
      });
      clients.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return res.status(200).json({ success: true, data: clients });
    }

    if (req.method === 'POST') {
      const { clientName, email } = req.body;
      if (!clientName || !email) {
        return res.status(400).json({ error: 'clientName and email are required' });
      }
      const accessToken = crypto.randomBytes(24).toString('hex');
      const docRef = await db.collection('clients').add({
        userId: uid,
        clientName,
        email,
        accessToken,
        createdAt: new Date().toISOString(),
      });
      return res.status(200).json({ success: true, data: { id: docRef.id, clientName, email, accessToken } });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'id is required' });
      const doc = await db.collection('clients').doc(id).get();
      if (!doc.exists || doc.data()?.userId !== uid) {
        return res.status(404).json({ error: 'Client not found' });
      }
      await db.collection('clients').doc(id).delete();
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
