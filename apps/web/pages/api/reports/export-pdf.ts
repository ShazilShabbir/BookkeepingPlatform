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

    // Step 1: Fetch data
    const [userDoc, entries, accountDocs] = await Promise.all([
      User.findById(uid).select('name email').lean(),
      JournalEntry.find({ userId: uid, ...(startDate ? { date: { $gte: startDate } } : {}), ...(endDate ? { date: { $lte: endDate } } : {}) }).select('_id date').lean(),
      Account.find({ userId: uid, isActive: true }).lean(),
    ]);
    const ownerName = (userDoc as any)?.name || 'User';
    const entryIds = entries.map(e => (e as any)._id.toString());

    const lines = await JournalLine.find({ journalEntryId: { $in: entryIds }, userId: uid }).lean();

    // Step 2: Compute totals
    const accountTotals = new Map<string, { debits: number; credits: number }>();
    for (const line of lines) {
      const totals = accountTotals.get(line.accountCode) || { debits: 0, credits: 0 };
      totals.debits += line.debit || 0;
      totals.credits += line.credit || 0;
      accountTotals.set(line.accountCode, totals);
    }
    const accountMap = new Map(accountDocs.map(a => [a.code, a]));

    // Step 3: Build P&L and BS sections
    const buildSections = (types: string[]) => {
      return types.map(type => {
        const accounts: any[] = [];
        for (const [code, totals] of accountTotals) {
          const info = accountMap.get(code);
          if (!info || info.type !== type) continue;
          const balance = (info.normalBalance === 'credit' ? totals.credits - totals.debits : totals.debits - totals.credits);
          if (Math.abs(balance) < 0.01) continue;
          accounts.push({ accountCode: code, accountName: info.name, balance: Math.round(balance * 100) / 100 });
        }
        accounts.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
        const total = Math.round(accounts.reduce((s, a) => s + a.balance, 0) * 100) / 100;
        return { title: type.charAt(0).toUpperCase() + type.slice(1), type, total, accounts };
      });
    };

    const plSections = buildSections(['revenue', 'expense']);
    const bsSections = buildSections(['asset', 'liability', 'equity']);

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

    // Step 4: Compute KPIs
    const cashBalance = (() => {
      const cashAccounts = accountDocs.filter(a => /^1(0|1)\d{2}$/.test(a.code));
      let bal = 0;
      for (const ca of cashAccounts) {
        const t = accountTotals.get(ca.code);
        if (t) bal += t.debits - t.credits;
      }
      return Math.round(bal * 100) / 100;
    })();

    const kpis = {
      totalRevenue: revenueTotal,
      totalExpenses: expenseTotal,
      netProfit: netIncome,
      profitMargin: revenueTotal > 0 ? Math.round((netIncome / revenueTotal) * 1000) / 10 : 0,
      entryCount: entries.length,
      cashBalance,
    };

    // Step 5: Cash Flow
    const cashFlowRes = (() => {
      const allCodes = accountDocs.map(a => a.code);
      const opCodes = allCodes.filter(c => /^[45]\d{3}$/.test(c));
      const invCodes = allCodes.filter(c => /^1[2-9]\d{2}$/.test(c));
      const finCodes = allCodes.filter(c => /^2\d{3}$/.test(c) || /^3\d{3}$/.test(c));
      const buildCF = (codes: string[], label: string) => {
        const items: any[] = [];
        let total = 0;
        for (const code of codes) {
          const info = accountMap.get(code);
          if (!info) continue;
          const t = accountTotals.get(code);
          if (!t) continue;
          const amt = info.normalBalance === 'credit' ? t.credits - t.debits : t.debits - t.credits;
          if (Math.abs(amt) < 0.01) continue;
          items.push({ accountCode: code, accountName: info.name, amount: Math.round(amt * 100) / 100 });
          total += amt;
        }
        total = Math.round(total * 100) / 100;
        return { title: label, items, total };
      };
      const ops = buildCF(opCodes, 'Operating Activities');
      const inv = buildCF(invCodes, 'Investing Activities');
      const fin = buildCF(finCodes, 'Financing Activities');
      const totalChange = Math.round((ops.total + inv.total + fin.total) * 100) / 100;
      return { sections: [ops, inv, fin].filter(s => s.items.length > 0), totalChange };
    })();

    // Step 6: Trial Balance
    const trialBalanceRes = (() => {
      const rows: any[] = [];
      let totalDebits = 0, totalCredits = 0;
      for (const [code, totals] of accountTotals) {
        const info = accountMap.get(code);
        if (!info) continue;
        rows.push({ accountCode: code, accountName: info.name, accountType: info.type, normalBalance: info.normalBalance || 'debit', totalDebits: Math.round(totals.debits * 100) / 100, totalCredits: Math.round(totals.credits * 100) / 100, netBalance: Math.round((totals.debits - totals.credits) * 100) / 100 });
        totalDebits += totals.debits;
        totalCredits += totals.credits;
      }
      totalDebits = Math.round(totalDebits * 100) / 100;
      totalCredits = Math.round(totalCredits * 100) / 100;
      rows.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
      return { rows, totals: { totalDebits, totalCredits, difference: Math.round(Math.abs(totalDebits - totalCredits) * 100) / 100, balanced: Math.abs(totalDebits - totalCredits) < 0.01 } };
    })();

    // Step 7: Build doc definition
    const kpiData = { totalRevenue: kpis.totalRevenue, totalExpenses: kpis.totalExpenses, netProfit: kpis.netProfit, profitMargin: kpis.profitMargin, entryCount: kpis.entryCount, cashBalance: kpis.cashBalance };

    const docDef = buildReportDocDefinition({
      kpis: kpiData,
      profitLoss: { sections: plSections.map(s => ({ ...s, type: s.type })), netIncome, netIncomeRatio: kpis.profitMargin },
      balanceSheet: { sections: bsSections.map(s => ({ ...s, type: s.type })), totalAssets, totalLiabilities, totalEquity },
      cashFlow: cashFlowRes,
      trialBalance: trialBalanceRes,
      dateRange: { startDate: startDate || null, endDate: endDate || null },
    }, ownerName);

    // Step 8: Generate PDF
    let pdfmake: any;
    try {
      const pdfModule = await import('pdfmake/build/pdfmake');
      const vfsFontsModule = await import('pdfmake/build/vfs_fonts');
      // Module namespace is frozen in Turbopack ESM, so copy to mutable object
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
