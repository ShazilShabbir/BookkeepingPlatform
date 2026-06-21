// Plaid removed — Pakistani developers cannot register for Plaid
export default function handler(req: any, res: any) { return res.status(503).json({ error: 'Bank Feeds are not available in your region.' }); }
