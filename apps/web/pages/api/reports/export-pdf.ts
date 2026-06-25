import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { checkFeatureAccess } from '@/lib/subscription';
import { resolveUserId } from '@/lib/customerContext';
import { rateLimit } from '@/lib/rateLimit';
import dbConnect from '@/lib/mongoose';

const exportPdfLimiter = rateLimit({ interval: 60 * 1000, max: 5 });
import Account from '@/lib/models/Account';
import JournalEntry from '@/lib/models/JournalEntry';
import JournalLine from '@/lib/models/JournalLine';
import User from '@/lib/models/User';
import { buildReportDocDefinition } from '@/lib/reportPdf';
import { generateCashFlowReport } from '@/lib/reports';

function defaultNormalBalance(type: string): string {
  return ['revenue', 'liability', 'equity'].includes(type) ? 'credit' : 'debit';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const uid = await resolveUserId(token, req.body.userId);
  const { allowed } = exportPdfLimiter(uid!);
  if (!allowed) return res.status(429).json({ error: 'Too many requests. Please wait before exporting again.' });

  try {

    if (process.env.NODE_ENV !== 'development') {
      const { allowed } = await checkFeatureAccess(uid!, 'custom-reports');
      if (!allowed) return res.status(403).json({ error: 'PDF export requires Pro plan or higher.', code: 'UPGRADE_REQUIRED' });
    }
    const { startDate, endDate } = req.body;
    await dbConnect();

    const [userDoc, accountDocs] = await Promise.all([
      User.findById(uid).select('name email').lean(),
      Account.find({ userId: uid, isActive: true }).lean(),
    ]);
    const ownerName = (userDoc as any)?.name || 'User';
    const accountMap = new Map(accountDocs.map(a => [a.code, a]));

    const bsTypes = new Set(['asset', 'liability', 'equity']);
    const plTypes = new Set(['revenue', 'expense']);

    const plQuery: Record<string, any> = { userId: uid };
    if (startDate) plQuery.date = { $gte: startDate };
    if (endDate) plQuery.date = { ...plQuery.date, $lte: endDate };
    const plEntries = await JournalEntry.find(plQuery).select('_id date').lean();
    const plEntryIds = plEntries.map(e => (e as any)._id.toString());
    const plLines = await JournalLine.find({ journalEntryId: { $in: plEntryIds }, userId: uid }).lean();

    const bsQuery: Record<string, any> = { userId: uid };
    if (endDate) bsQuery.date = { $lte: endDate };
    const bsEntries = await JournalEntry.find(bsQuery).select('_id date').lean();
    const bsEntryIds = bsEntries.map(e => (e as any)._id.toString());
    const bsLines = await JournalLine.find({ journalEntryId: { $in: bsEntryIds }, userId: uid }).lean();

    const plTotals = new Map<string, { debits: number; credits: number }>();
    for (const line of plLines) {
      const info = accountMap.get(line.accountCode);
      if (!info || !plTypes.has(info.type)) continue;
      const totals = plTotals.get(line.accountCode) || { debits: 0, credits: 0 };
      totals.debits += line.debit || 0;
      totals.credits += line.credit || 0;
      plTotals.set(line.accountCode, totals);
    }

    const bsTotals = new Map<string, { debits: number; credits: number }>();
    for (const line of bsLines) {
      const info = accountMap.get(line.accountCode);
      if (!info || !bsTypes.has(info.type)) continue;
      const totals = bsTotals.get(line.accountCode) || { debits: 0, credits: 0 };
      totals.debits += line.debit || 0;
      totals.credits += line.credit || 0;
      bsTotals.set(line.accountCode, totals);
    }

    const allTotals = new Map<string, { debits: number; credits: number }>();
    for (const [code, t] of plTotals) allTotals.set(code, t);
    for (const [code, t] of bsTotals) {
      const existing = allTotals.get(code);
      if (existing) {
        existing.debits += t.debits;
        existing.credits += t.credits;
      } else {
        allTotals.set(code, { ...t });
      }
    }

    const buildSections = (types: string[], totals: Map<string, { debits: number; credits: number }>) => {
      return types.map(type => {
        const accounts: any[] = [];
        for (const [code, t] of totals) {
          const info = accountMap.get(code);
          if (!info || info.type !== type) continue;
          const nb = info.normalBalance || defaultNormalBalance(type);
          const balance = nb === 'credit' ? t.credits - t.debits : t.debits - t.credits;
          if (Math.abs(balance) < 0.01) continue;
          accounts.push({ accountCode: code, accountName: info.name, balance: Math.round(balance * 100) / 100 });
        }
        accounts.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
        const total = Math.round(accounts.reduce((s, a) => s + a.balance, 0) * 100) / 100;
        return { title: type.charAt(0).toUpperCase() + type.slice(1), type, total, accounts };
      });
    };

    const plSections = buildSections(['revenue', 'expense'], plTotals);
    const bsSections = buildSections(['asset', 'liability', 'equity'], bsTotals);

    const revenueTotal = plSections.find(s => s.type === 'revenue')?.total || 0;
    const expenseTotal = plSections.find(s => s.type === 'expense')?.total || 0;
    const netIncome = Math.round((revenueTotal - expenseTotal) * 100) / 100;

    if (netIncome !== 0) {
      const eq = bsSections.find(s => s.type === 'equity');
      if (eq) {
        eq.total = Math.round((eq.total + netIncome) * 100) / 100;
        eq.accounts.push({ accountCode: 'net-income', accountName: 'Net Income (Current Period)', balance: netIncome });
      }
    }

    const totalAssets = bsSections.find(s => s.type === 'asset')?.total || 0;
    const totalLiabilities = bsSections.find(s => s.type === 'liability')?.total || 0;
    const totalEquity = bsSections.find(s => s.type === 'equity')?.total || 0;

    const cashBalance = (() => {
      const cashAccounts = accountDocs.filter(a => /^1(0|1)\d{2}$/.test(a.code));
      let bal = 0;
      for (const ca of cashAccounts) {
        const t = allTotals.get(ca.code);
        if (t) bal += t.debits - t.credits;
      }
      return Math.round(bal * 100) / 100;
    })();

    const kpis = {
      totalRevenue: revenueTotal,
      totalExpenses: expenseTotal,
      netProfit: netIncome,
      profitMargin: revenueTotal > 0 ? Math.round((netIncome / revenueTotal) * 1000) / 10 : 0,
      entryCount: plEntries.length,
      cashBalance,
    };

    const cashFlowRes = await generateCashFlowReport(uid!, startDate || null, endDate || null);

    const trialBalanceRes = (() => {
      const rows: any[] = [];
      let totalDebits = 0, totalCredits = 0;
      for (const [code, totals] of allTotals) {
        const info = accountMap.get(code);
        if (!info) continue;
        const nb = info.normalBalance || defaultNormalBalance(info.type);
        const netBalance = nb === 'credit'
          ? Math.round((totals.credits - totals.debits) * 100) / 100
          : Math.round((totals.debits - totals.credits) * 100) / 100;
        rows.push({
          accountCode: code,
          accountName: info.name,
          accountType: info.type,
          normalBalance: nb,
          totalDebits: Math.round(totals.debits * 100) / 100,
          totalCredits: Math.round(totals.credits * 100) / 100,
          netBalance,
        });
        totalDebits += totals.debits;
        totalCredits += totals.credits;
      }
      totalDebits = Math.round(totalDebits * 100) / 100;
      totalCredits = Math.round(totalCredits * 100) / 100;
      rows.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
      return { rows, totals: { totalDebits, totalCredits, difference: Math.round(Math.abs(totalDebits - totalCredits) * 100) / 100, balanced: Math.abs(totalDebits - totalCredits) < 0.01 } };
    })();

    const kpiData = { totalRevenue: kpis.totalRevenue, totalExpenses: kpis.totalExpenses, netProfit: kpis.netProfit, profitMargin: kpis.profitMargin, entryCount: kpis.entryCount, cashBalance: kpis.cashBalance };

    const docDef = buildReportDocDefinition({
      kpis: kpiData,
      profitLoss: { sections: plSections.map(s => ({ ...s, type: s.type })), netIncome, netIncomeRatio: kpis.profitMargin },
      balanceSheet: { sections: bsSections.map(s => ({ ...s, type: s.type })), totalAssets, totalLiabilities, totalEquity },
      cashFlow: cashFlowRes,
      trialBalance: trialBalanceRes,
      dateRange: { startDate: startDate || null, endDate: endDate || null },
    }, ownerName);

    let pdfmake: any;
    try {
      const pdfModule = await import('pdfmake/build/pdfmake');
      const vfsFontsModule = await import('pdfmake/build/vfs_fonts');
      pdfmake = { ...pdfModule, ...(pdfModule.default || {}) };
      const vfsMod = vfsFontsModule as any;
      const vfs = vfsMod.default?.vfs || vfsMod.vfs || vfsMod.default;
      if (vfs && typeof vfs === 'object') pdfmake.vfs = vfs;
    } catch (importErr: any) {
      return res.status(500).json({ error: 'Failed to load pdfmake', step: 'import', detail: importErr?.message || 'Import error' });
    }

    if (typeof pdfmake.createPdf !== 'function') {
      return res.status(500).json({ error: 'pdfmake has no createPdf method', keys: Object.keys(pdfmake) });
    }

    const pdfDoc = pdfmake.createPdf(docDef);
    if (!pdfDoc || typeof pdfDoc.getBase64 !== 'function') {
      return res.status(500).json({ error: 'pdfDoc has no getBase64 method', keys: pdfDoc ? Object.keys(pdfDoc) : [] });
    }

    const pdfBase64: string = await new Promise((resolve) => {
      pdfDoc.getBase64((base64: string) => resolve(base64));
    });

    if (!pdfBase64 || pdfBase64.length < 100) {
      return res.status(500).json({ error: 'Generated PDF is too small or empty', length: pdfBase64?.length || 0 });
    }

    return res.status(200).json({ success: true, pdf: pdfBase64 });
  } catch (e: any) {
    console.error('[export-pdf] error:', e?.stack || e?.message || e);
    return res.status(500).json({ error: 'Failed to generate PDF', detail: e?.message || 'Unknown error', stack: e?.stack || '' });
  }
}
