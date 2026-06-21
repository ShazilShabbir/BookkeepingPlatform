import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return res.status(410).json({ code: 'MOVED', message: 'POST /api/signup' });
}
