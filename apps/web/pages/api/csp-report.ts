import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const report = req.body;
  console.warn('CSP Violation:', JSON.stringify(report, null, 2));

  res.status(204).end();
}
