import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { default: dbConnect } = await import('@/lib/mongoose');
    const mongoose = await dbConnect();
    const state = mongoose.connection.readyState;
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    return res.status(200).json({
      status: states[state] || 'unknown',
      host: mongoose.connection.host || 'none',
      name: mongoose.connection.name || 'none',
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Connection failed' });
  }
}
