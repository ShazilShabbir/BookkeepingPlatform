import { NextApiRequest, NextApiResponse } from 'next';
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(410).json({ error: 'Use /api/dashboard/summary instead' });
}
