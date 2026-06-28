import ExcelJS from 'exceljs';
import dbConnect from '@/lib/mongoose';
import JournalEntry from '@/lib/models/JournalEntry';
import JournalLine from '@/lib/models/JournalLine';
import Account from '@/lib/models/Account';
import User from '@/lib/models/User';
import { generateCashFlowReport } from '@/lib/reports';
import { convertJournalLines } from '@/lib/currency';

export interface BrandingOptions {
  logo?: string;
  primaryColor?: string;
  companyName?: string;
}

interface AccountInfo { name: string; type: string; normalBalance: string; }

const fmtCurrency = '#,##0.00';
const fmtDate = 'YYYY-MM-DD';

const palette = {
  brandDark: 'FF1E3A5F', brand: 'FF4338CA', brandLight: 'FFE0E7FF',
  revenue: 'FF059669', revenueBg: 'FFD1FAE5',
  expense: 'FFDC2626', expenseBg: 'FFFEE2E2',
  asset: 'FF2563EB', assetBg: 'FFDBEAFE',
  liability: 'FFD97706', liabilityBg: 'FFFEF3C7',
  equity: 'FF7C3AED', equityBg: 'FFEDE9FE',
  white: 'FFFFFFFF', dark: 'FF1E293B', muted: 'FF64748B', lightBg: 'FFF8FAFC',
  border: 'FFE2E8F0', accentGreen: 'FF10B981', accentRed: 'FFEF4444',
};

function hexToArgb(hex: string): string {
  return 'FF' + hex.replace('#', '').toUpperCase();
}

function applyBranding(b: BrandingOptions | undefined) {
  if (!b?.primaryColor) return;
  const c = b.primaryColor.replace('#', '');
  palette.brand = 'FF' + c.toUpperCase();
  palette.brandDark = palette.brand;
  palette.brandLight = 'FF' + c.toUpperCase() + '66';
}

const headerStyle: Partial<ExcelJS.Style> = {
  font: { bold: true, color: { argb: palette.white }, size: 11, name: 'Calibri' },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.brandDark } },
  alignment: { horizontal: 'left', vertical: 'middle' },
  border: { top: { style: 'thin', color: { argb: palette.border } }, bottom: { style: 'thin', color: { argb: palette.border } }, left: { style: 'thin', color: { argb: palette.border } }, right: { style: 'thin', color: { argb: palette.border } } },
};

const totalStyle: Partial<ExcelJS.Style> = {
  font: { bold: true, color: { argb: palette.dark }, size: 11, name: 'Calibri' },
  border: { top: { style: 'medium', color: { argb: palette.brand } }, bottom: { style: 'double', color: { argb: palette.brand } } },
};

function sectionStyle(color: string): Partial<ExcelJS.Style> {
  return {
    font: { bold: true, color: { argb: palette.dark }, size: 11, name: 'Calibri' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: color } },
    border: { top: { style: 'thin', color: { argb: palette.border } }, bottom: { style: 'thin', color: { argb: palette.border } } },
  };
}

function applyZebra(row: ExcelJS.Row, even: boolean, color: string) {
  if (even) {
    row.eachCell({ includeEmpty: true }, (cell) => {
      const fill = cell.style.fill;
      if (fill?.type === 'pattern' && (!fill.fgColor?.argb || fill.fgColor.argb === '00000000')) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
      }
    });
  }
}

function setupSheet(sheet: ExcelJS.Worksheet, columns: Partial<ExcelJS.Column>[], tabColor?: string) {
  sheet.columns = columns;
  sheet.getRow(1).eachCell((cell) => { cell.style = headerStyle; });
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  if (tabColor) sheet.properties.tabColor = { argb: tabColor };
}

function addPrintSetup(sheet: ExcelJS.Worksheet) {
  sheet.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
    margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
  };
}

function formatDateRange(startDate?: string | null, endDate?: string | null): string {
  if (!startDate && !endDate) return 'Full Period';
  const fmt = (d: string) => {
    const [y, m, d2] = d.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(m) - 1]} ${parseInt(d2)}, ${y}`;
  };
  if (startDate && endDate) return `Period: ${fmt(startDate)} – ${fmt(endDate)}`;
  if (startDate) return `Period: ${fmt(startDate)} – Present`;
  return `Period: Through ${fmt(endDate!)}`;
}

function addPeriodSubtitle(sheet: ExcelJS.Worksheet, startDate?: string | null, endDate?: string | null) {
  const text = formatDateRange(startDate, endDate);
  const lastCol = sheet.columnCount;
  const r = sheet.getRow(2);
  r.getCell(1).value = text;
  r.getCell(1).font = { italic: true, color: { argb: palette.muted }, size: 10, name: 'Calibri' };
  r.height = 18;
  if (lastCol > 1) sheet.mergeCells(2, 1, 2, lastCol);
  sheet.views = [{ state: 'frozen', ySplit: 2 }];
}

export async function generateWorkbook(uid: string, startDate?: string | null, endDate?: string | null, branding?: BrandingOptions, baseCurrency: string = 'USD'): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = branding?.companyName || 'BookKeep';
  wb.created = new Date();
  applyBranding(branding);

  // ── Fetch Data ──
  await dbConnect();

  const query: Record<string, any> = { userId: uid };
  if (startDate) query.date = { $gte: startDate };
  if (endDate) query.date = { ...query.date, $lte: endDate };

  const entriesData = await JournalEntry.find(query).sort({ date: -1 }).lean();
  const entryIds = entriesData.map(e => (e._id as string).toString());

  const accountDocs = await Account.find({ userId: uid, isActive: true }).lean();
  const accountMap = new Map<string, AccountInfo>();
  const accountNameMap = new Map<string, string>();
  const currencyMap = new Map<string, { currency?: string }>();
  for (const a of accountDocs) {
    accountMap.set(a.code, { name: a.name, type: a.type, normalBalance: a.normalBalance || 'debit' });
    accountNameMap.set(a.code, a.name);
    currencyMap.set(a.code, { currency: (a as any).currency || 'USD' });
  }

  const rawAllLines = await JournalLine.find({ userId: uid, journalEntryId: { $in: entryIds } }).lean();
  const allLines = await convertJournalLines(uid, rawAllLines, currencyMap, baseCurrency);
  const accountTotals = new Map<string, { debits: number; credits: number }>();
  for (const data of allLines) {
    const code = data.accountCode;
    if (!code) continue;
    const totals = accountTotals.get(code) || { debits: 0, credits: 0 };
    totals.debits += data.debit || 0;
    totals.credits += data.credit || 0;
    accountTotals.set(code, totals);
  }

  // Load custom field definitions for export
  const userDoc = await User.findOne({ email: uid }).lean();
  const customFieldDefs: { id: string; label: string }[] = (userDoc as any)?.customFields || (userDoc as any)?.csvProfiles?.[0]?.customFields || [];

  // Compute per-entry monthly data for trends
  const monthlyTotals = new Map<string, { revenue: number; expenses: number }>();
  const linesByEntry = new Map<string, any[]>();
  for (const line of allLines) {
    const existing = linesByEntry.get(line.journalEntryId) || [];
    existing.push(line);
    linesByEntry.set(line.journalEntryId, existing);
  }
  for (const entry of entriesData) {
    const month = (entry.date || '').slice(0, 7);
    if (!month) continue;
    const mTotals = monthlyTotals.get(month) || { revenue: 0, expenses: 0 };
    const lines = linesByEntry.get((entry as any)._id.toString()) || [];
    for (const line of lines) {
      const info = accountMap.get(line.accountCode);
      if (!info) continue;
      const normal = info.normalBalance === 'credit' ? 'credit' : 'debit';
      const balance = normal === 'credit' ? (line.credit || 0) - (line.debit || 0) : (line.debit || 0) - (line.credit || 0);
      if (info.type === 'revenue') mTotals.revenue += balance;
      else if (info.type === 'expense') mTotals.expenses += balance;
    }
    monthlyTotals.set(month, mTotals);
  }

  // ── Build account-type sections ──
  const typeLabels: Record<string, string> = { revenue: 'Revenue', expense: 'Expenses', asset: 'Assets', liability: 'Liabilities', equity: 'Equity' };
  const typeColors: Record<string, string> = { revenue: palette.revenueBg, expense: palette.expenseBg, asset: palette.assetBg, liability: palette.liabilityBg, equity: palette.equityBg };

  const buildSections = (types: string[]) => {
    const sections: { title: string; type: string; total: number; accounts: { code: string; name: string; balance: number }[] }[] = [];
    for (const t of types) {
      const accounts: { code: string; name: string; balance: number }[] = [];
      for (const [code, totals] of accountTotals) {
        const info = accountMap.get(code);
        if (!info || info.type !== t) continue;
        const normal = info.normalBalance === 'credit' ? 'credit' : 'debit';
        const balance = normal === 'credit' ? totals.credits - totals.debits : totals.debits - totals.credits;
        if (Math.abs(balance) < 0.01) continue;
        accounts.push({ code, name: info.name, balance: Math.round(balance * 100) / 100 });
      }
      accounts.sort((a, b) => a.code.localeCompare(b.code));
      const total = Math.round(accounts.reduce((s, a) => s + a.balance, 0) * 100) / 100;
      sections.push({ title: typeLabels[t] || t, type: t, total, accounts });
    }
    return sections;
  };

  const plSections = buildSections(['revenue', 'expense']);
  const bsSections = buildSections(['asset', 'liability', 'equity']);

  const revenueTotal = plSections.find(s => s.type === 'revenue')?.total || 0;
  const expenseTotal = plSections.find(s => s.type === 'expense')?.total || 0;
  const netIncome = Math.round((revenueTotal - expenseTotal) * 100) / 100;

  // Inject net income into equity
  if (netIncome !== 0) {
    const eq = bsSections.find(s => s.type === 'equity');
    if (eq) {
      eq.total = Math.round((eq.total + netIncome) * 100) / 100;
      eq.accounts.push({ code: 'net-income', name: 'Net Income (Current Period)', balance: netIncome });
    }
  }

  const totalAssets = bsSections.find(s => s.type === 'asset')?.total || 0;
  const totalLiabilities = bsSections.find(s => s.type === 'liability')?.total || 0;
  const totalEquity = bsSections.find(s => s.type === 'equity')?.total || 0;
  const balOk = Math.abs(totalAssets - totalLiabilities - totalEquity) < 0.01;

  // ── Compute quarterly data (EX-4) ──
  const quarterlyData = new Map<string, { revenue: number; expenses: number }>();
  for (const [month, data] of monthlyTotals) {
    const qNum = Math.ceil(parseInt(month.slice(5, 7)) / 3);
    const year = month.slice(0, 4);
    const qKey = `${year} Q${qNum}`;
    const q = quarterlyData.get(qKey) || { revenue: 0, expenses: 0 };
    q.revenue += data.revenue;
    q.expenses += data.expenses;
    quarterlyData.set(qKey, q);
  }

  // ── Pre-group lines by entry for sheets that need them ──
  const linesByEntryId = new Map<string, any[]>();
  for (const line of allLines) {
    const existing = linesByEntryId.get(line.journalEntryId) || [];
    existing.push(line);
    linesByEntryId.set(line.journalEntryId, existing);
  }

  // Write section helper
  const writeSection = (sheet: ExcelJS.Worksheet, section: typeof plSections[0], startRow: number) => {
    let r = startRow;
    const sr = sheet.getRow(r);
    sr.getCell(1).value = section.title;
    sr.getCell(1).style = sectionStyle(typeColors[section.type] || palette.lightBg);
    sr.getCell(2).style = sectionStyle(typeColors[section.type] || palette.lightBg);
    r++;

    section.accounts.forEach((acc, idx) => {
      const row = sheet.getRow(r);
      row.getCell(1).value = `  ${acc.code}  ${acc.name}`;
      row.getCell(2).value = acc.balance;
      row.getCell(2).numFmt = fmtCurrency;
      row.getCell(2).alignment = { horizontal: 'right' };
      applyZebra(row, idx % 2 === 1, typeColors[section.type] || palette.lightBg);
      r++;
    });

    const tr = sheet.getRow(r);
    tr.getCell(1).value = `Total ${section.title}`;
    tr.getCell(1).style = totalStyle;
    tr.getCell(2).value = section.total;
    tr.getCell(2).numFmt = fmtCurrency;
    tr.getCell(2).alignment = { horizontal: 'right' };
    tr.getCell(2).style = totalStyle;
    r += 2;
    return r;
  };

  // ================================================================
  // Sheet 1: Final Summary (moved to front, EX-1)
  // ================================================================
  const sm = wb.addWorksheet('Final Summary');
  sm.columns = [{ header: 'Metric', key: 'm', width: 28 }, { header: 'Value', key: 'v', width: 24 }];
  sm.views = [{ state: 'frozen', ySplit: 2 }];
  sm.properties.tabColor = { argb: palette.brand };
  addPrintSetup(sm);

  // Logo embedding (EX-2)
  let smDataRow = 2;
  if (branding?.logo) {
    try {
      const logoData = branding.logo;
      const isDataUrl = logoData.startsWith('data:');
      const ext = (isDataUrl ? (logoData.match(/data:image\/(\w+)/)?.[1] || 'png') : (logoData.split('.').pop() || 'png')) as 'png' | 'jpeg' | 'gif';
      const base64 = isDataUrl ? logoData.split(',')[1] : logoData;
      const imageId = wb.addImage({ base64, extension: ext });
      sm.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 150, height: 50 } });
      sm.getRow(1).height = 40;
    } catch { /* skip broken logo */ }
  }

  // Title
  const titleCol = branding?.logo ? 3 : 1;
  sm.getRow(1).getCell(titleCol).value = 'Final Summary';
  sm.getRow(1).getCell(titleCol).font = { bold: true, color: { argb: palette.white }, size: 14, name: 'Calibri' };
  sm.getRow(1).getCell(titleCol).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.brandDark } };
  const titleEndCol = branding?.logo ? 2 : 2;
  sm.getRow(1).getCell(titleEndCol).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.brandDark } };
  sm.getRow(1).getCell(2).style = sm.getRow(1).getCell(1).style;

  // Date range subtitle (EX-9)
  const periodText = formatDateRange(startDate, endDate);
  sm.getRow(2).getCell(1).value = periodText;
  sm.getRow(2).getCell(1).font = { italic: true, color: { argb: palette.muted }, size: 10, name: 'Calibri' };
  sm.getRow(2).getCell(2).font = sm.getRow(2).getCell(1).font;
  sm.getRow(2).height = 18;
  sm.mergeCells('A2:B2');

  sm.getRow(3).getCell(1).value = `Base Currency: ${baseCurrency}`;
  sm.getRow(3).getCell(1).font = { italic: true, color: { argb: palette.muted }, size: 10, name: 'Calibri' };
  sm.getRow(3).height = 18;
  sm.mergeCells('A3:B3');

  smDataRow = 5; // KPI data starts at row 5
  const kpiData = [
    { label: 'Total Revenue', value: revenueTotal, color: palette.accentGreen, bg: palette.revenueBg },
    { label: 'Total Expenses', value: expenseTotal, color: palette.accentRed, bg: palette.expenseBg },
    { label: 'Net Income', value: netIncome, color: netIncome >= 0 ? palette.accentGreen : palette.accentRed, bg: netIncome >= 0 ? palette.revenueBg : palette.expenseBg },
    { label: 'Profit Margin', value: revenueTotal > 0 ? `${((netIncome / revenueTotal) * 100).toFixed(1)}%` : '0.0%', color: palette.brand, bg: palette.brandLight },
    { label: '', value: '', color: '', bg: '' },
    { label: 'Total Assets', value: totalAssets, color: palette.asset, bg: palette.assetBg },
    { label: 'Total Liabilities', value: totalLiabilities, color: palette.liability, bg: palette.liabilityBg },
    { label: 'Total Equity', value: totalEquity, color: palette.equity, bg: palette.equityBg },
    { label: 'Balance Check', value: balOk ? '✓ Balanced' : '⚠ Out of balance', color: balOk ? palette.accentGreen : palette.accentRed, bg: balOk ? palette.revenueBg : palette.expenseBg },
  ];

  for (const k of kpiData) {
    if (!k.label) { smDataRow++; continue; }
    const rr = sm.getRow(smDataRow);
    rr.getCell(1).value = k.label;
    rr.getCell(1).font = { bold: true, size: 12, color: { argb: palette.dark }, name: 'Calibri' };
    rr.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: k.bg } };
    rr.getCell(2).value = typeof k.value === 'number' ? k.value : k.value;
    if (typeof k.value === 'number') rr.getCell(2).numFmt = fmtCurrency;
    rr.getCell(2).font = { bold: true, size: 14, color: { argb: k.color }, name: 'Calibri' };
    rr.getCell(2).alignment = { horizontal: 'right' };
    rr.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: k.bg } };
    rr.height = 28;
    smDataRow++;
  }

  // ================================================================
  // Sheet 2: Quarterly Summary (EX-4, NEW)
  // ================================================================
  const sortedQuarters = Array.from(quarterlyData.keys()).sort();
  if (sortedQuarters.length > 0) {
    const qs = wb.addWorksheet('Quarterly Summary');
    setupSheet(qs, [
      { header: 'Quarter', key: 'q', width: 14 },
      { header: 'Revenue', key: 'r', width: 20 },
      { header: 'Expenses', key: 'e', width: 20 },
      { header: 'Net Income', key: 'n', width: 20 },
      { header: '% Change', key: 'pct', width: 14 },
    ], palette.accentGreen);
    addPeriodSubtitle(qs, startDate, endDate);
    addPrintSetup(qs);

    let qRow = 3;
    let prevNet = 0;
    sortedQuarters.forEach((qKey, idx) => {
      const q = quarterlyData.get(qKey)!;
      const net = Math.round((q.revenue - q.expenses) * 100) / 100;
      const rr = qs.getRow(qRow);
      rr.getCell(1).value = qKey; rr.getCell(1).font = { bold: true, name: 'Calibri' };
      rr.getCell(2).value = Math.round(q.revenue * 100) / 100; rr.getCell(2).numFmt = fmtCurrency; rr.getCell(2).alignment = { horizontal: 'right' };
      rr.getCell(3).value = Math.round(q.expenses * 100) / 100; rr.getCell(3).numFmt = fmtCurrency; rr.getCell(3).alignment = { horizontal: 'right' };
      rr.getCell(4).value = net; rr.getCell(4).numFmt = fmtCurrency; rr.getCell(4).alignment = { horizontal: 'right' };
      if (net < 0) rr.getCell(4).font = { color: { argb: palette.accentRed }, name: 'Calibri' };
      if (idx > 0 && Math.abs(prevNet) > 0.01) {
        const pctChange = (net - prevNet) / Math.abs(prevNet);
        rr.getCell(5).value = pctChange; rr.getCell(5).numFmt = '0.0%'; rr.getCell(5).alignment = { horizontal: 'right' };
        rr.getCell(5).font = { color: { argb: pctChange >= 0 ? palette.accentGreen : palette.accentRed }, name: 'Calibri' };
      } else if (idx > 0) {
        rr.getCell(5).value = 'N/A'; rr.getCell(5).alignment = { horizontal: 'right' };
      }
      applyZebra(rr, idx % 2 === 1, palette.lightBg);
      prevNet = net;
      qRow++;
    });

    // Quarterly totals row
    const qTotalRevenue = sortedQuarters.reduce((s, q) => s + (quarterlyData.get(q)?.revenue || 0), 0);
    const qTotalExpenses = sortedQuarters.reduce((s, q) => s + (quarterlyData.get(q)?.expenses || 0), 0);
    const qTotalNet = Math.round((qTotalRevenue - qTotalExpenses) * 100) / 100;
    const qtr = qs.getRow(qRow);
    qtr.getCell(1).value = 'YEAR TOTAL'; qtr.getCell(1).font = { bold: true, name: 'Calibri' };
    qtr.getCell(2).value = Math.round(qTotalRevenue * 100) / 100; qtr.getCell(2).numFmt = fmtCurrency; qtr.getCell(2).alignment = { horizontal: 'right' }; qtr.getCell(2).font = { bold: true };
    qtr.getCell(3).value = Math.round(qTotalExpenses * 100) / 100; qtr.getCell(3).numFmt = fmtCurrency; qtr.getCell(3).alignment = { horizontal: 'right' }; qtr.getCell(3).font = { bold: true };
    qtr.getCell(4).value = qTotalNet; qtr.getCell(4).numFmt = fmtCurrency; qtr.getCell(4).alignment = { horizontal: 'right' }; qtr.getCell(4).font = { bold: true, color: { argb: qTotalNet >= 0 ? palette.accentGreen : palette.accentRed } };
    for (let c = 1; c <= 5; c++) qtr.getCell(c).border = { top: { style: 'medium', color: { argb: palette.brand } }, bottom: { style: 'double', color: { argb: palette.brand } } };
  }

  // ================================================================
  // Sheet 3: Profit & Loss
  // ================================================================
  const pl = wb.addWorksheet('Profit & Loss');
  setupSheet(pl, [{ header: 'Account', key: 'a', width: 48 }, { header: 'Amount', key: 'b', width: 22 }], palette.revenue);
  addPeriodSubtitle(pl, startDate, endDate);
  addPrintSetup(pl);
  let row = 3;
  for (const section of plSections) row = writeSection(pl, section, row);
  const nr = pl.getRow(row);
  nr.getCell(1).value = 'Net Income';
  nr.getCell(1).font = { bold: true, size: 12, color: { argb: netIncome >= 0 ? palette.accentGreen : palette.accentRed }, name: 'Calibri' };
  nr.getCell(2).value = netIncome;
  nr.getCell(2).numFmt = fmtCurrency;
  nr.getCell(2).font = { bold: true, size: 12, color: { argb: netIncome >= 0 ? palette.accentGreen : palette.accentRed }, name: 'Calibri' };
  nr.getCell(2).alignment = { horizontal: 'right' };
  nr.getCell(1).border = { top: { style: 'medium', color: { argb: palette.brand } } };
  nr.getCell(2).border = { top: { style: 'medium', color: { argb: palette.brand } } };

  // ================================================================
  // Sheet 4: Balance Sheet (with color scale, EX-6)
  // ================================================================
  const bs = wb.addWorksheet('Balance Sheet');
  setupSheet(bs, [{ header: 'Account', key: 'a', width: 48 }, { header: 'Amount', key: 'b', width: 22 }], palette.asset);
  addPeriodSubtitle(bs, startDate, endDate);
  addPrintSetup(bs);
  row = 3;
  let bsFirstDataRow = row;
  for (const section of bsSections) row = writeSection(bs, section, row);
  const bsLastDataRow = row - 2;
  // Color scale on Amount column
  if (bsLastDataRow >= bsFirstDataRow) {
    bs.addConditionalFormatting({
      ref: `B${bsFirstDataRow}:B${bsLastDataRow}`,
      rules: [{
        type: 'colorScale', priority: 1,
        cfvo: [{ type: 'min' }, { type: 'percentile', value: 50 }, { type: 'max' }],
        color: [{ argb: palette.accentRed }, { argb: 'FFFFFFFF' }, { argb: palette.accentGreen }],
      } as any],
    });
  }
  const bc = bs.getRow(row);
  bc.getCell(1).value = 'Assets = Liabilities + Equity';
  bc.getCell(1).font = { italic: true, color: { argb: palette.muted }, size: 10 };
  bc.getCell(2).value = balOk ? '✓ Balanced' : '⚠ Out of balance';
  bc.getCell(2).font = { bold: true, color: { argb: balOk ? palette.accentGreen : palette.accentRed } };

  // ================================================================
  // Sheet 5: Trial Balance (with color scale, EX-6)
  // ================================================================
  const tb = wb.addWorksheet('Trial Balance');
  setupSheet(tb, [
    { header: 'Code', key: 'c', width: 14 }, { header: 'Account Name', key: 'n', width: 36 },
    { header: 'Type', key: 't', width: 14 }, { header: 'Debits', key: 'd', width: 20 },
    { header: 'Credits', key: 'cr', width: 20 }, { header: 'Balance', key: 'b', width: 20 },
  ], palette.brand);
  addPeriodSubtitle(tb, startDate, endDate);
  addPrintSetup(tb);
  row = 3;
  let totDb = 0, totCr = 0;
  const tbRows: any[] = [];
  for (const [code, totals] of accountTotals) {
    const info = accountMap.get(code);
    const normal = info?.normalBalance === 'credit' ? 'credit' : 'debit';
    const bal = normal === 'credit' ? totals.credits - totals.debits : totals.debits - totals.credits;
    if (Math.abs(bal) < 0.01 && totals.debits < 0.01 && totals.credits < 0.01) continue;
    tbRows.push({ code, name: info?.name || code, type: info?.type || '', debits: Math.round(totals.debits * 100) / 100, credits: Math.round(totals.credits * 100) / 100, balance: Math.round(bal * 100) / 100 });
    totDb += totals.debits;
    totCr += totals.credits;
  }
  tbRows.sort((a, b) => a.code.localeCompare(b.code));
  const tbFirstDataRow = row;
  tbRows.forEach((r, idx) => {
    const rr = tb.getRow(row);
    rr.getCell(1).value = r.code; rr.getCell(1).font = { name: 'Consolas', size: 10 };
    rr.getCell(2).value = r.name;
    rr.getCell(3).value = r.type;
    rr.getCell(4).value = r.debits; rr.getCell(4).numFmt = fmtCurrency; rr.getCell(4).alignment = { horizontal: 'right' };
    rr.getCell(5).value = r.credits; rr.getCell(5).numFmt = fmtCurrency; rr.getCell(5).alignment = { horizontal: 'right' };
    rr.getCell(6).value = r.balance; rr.getCell(6).numFmt = fmtCurrency; rr.getCell(6).alignment = { horizontal: 'right' };
    if (r.balance < 0) rr.getCell(6).font = { color: { argb: palette.accentRed }, name: 'Consolas', size: 10 };
    applyZebra(rr, idx % 2 === 1, palette.lightBg);
    row++;
  });
  const tbLastDataRow = row - 1;
  // Color scale on Balance column
  if (tbLastDataRow >= tbFirstDataRow) {
    tb.addConditionalFormatting({
      ref: `F${tbFirstDataRow}:F${tbLastDataRow}`,
      rules: [{
        type: 'colorScale', priority: 2,
        cfvo: [{ type: 'min' }, { type: 'percentile', value: 50 }, { type: 'max' }],
        color: [{ argb: palette.accentRed }, { argb: 'FFFFFFFF' }, { argb: palette.accentGreen }],
      } as any],
    });
  }
  const ttr = tb.getRow(row);
  ttr.getCell(1).value = 'TOTAL'; ttr.getCell(1).font = { bold: true };
  ttr.getCell(4).value = Math.round(totDb * 100) / 100; ttr.getCell(4).numFmt = fmtCurrency; ttr.getCell(4).alignment = { horizontal: 'right' }; ttr.getCell(4).font = { bold: true };
  ttr.getCell(5).value = Math.round(totCr * 100) / 100; ttr.getCell(5).numFmt = fmtCurrency; ttr.getCell(5).alignment = { horizontal: 'right' }; ttr.getCell(5).font = { bold: true };
  for (let c = 1; c <= 6; c++) ttr.getCell(c).border = { top: { style: 'medium', color: { argb: palette.brand } }, bottom: { style: 'double', color: { argb: palette.brand } } };

  // ================================================================
  // Sheet 6: Transaction Detail (auto-filter EX-7)
  // ================================================================
  const tdColHeaders = ['Date', 'Entry ID', 'Description', 'Account Code', 'Account Name', 'Debit', 'Credit'];
  for (const cf of customFieldDefs) tdColHeaders.push(cf.label);
  const td = wb.addWorksheet('Transaction Detail');
  setupSheet(td, [
    { header: 'Date', key: 'dt', width: 14 }, { header: 'Entry ID', key: 'eid', width: 30 },
    { header: 'Description', key: 'desc', width: 42 }, { header: 'Account Code', key: 'ac', width: 14 },
    { header: 'Account Name', key: 'an', width: 32 }, { header: 'Debit', key: 'db', width: 18 },
    { header: 'Credit', key: 'cr', width: 18 },
    ...customFieldDefs.map(cf => ({ header: cf.label, key: `cf_${cf.id}`, width: 20 })),
  ], palette.muted);
  addPeriodSubtitle(td, startDate, endDate);
  addPrintSetup(td);
  row = 3;
  for (const entry of entriesData) {
    const eid = (entry as any)._id.toString();
    const lines = linesByEntryId.get(eid) || [];
    const cfVals = (entry as any).customFieldValues || {};
    lines.forEach((line: any, idx: number) => {
      const rr = td.getRow(row);
      rr.getCell(1).value = entry.date || ''; rr.getCell(1).numFmt = fmtDate;
      rr.getCell(2).value = eid; rr.getCell(2).font = { color: { argb: 'FF94A3B8' }, size: 9 };
      rr.getCell(3).value = line.description || entry.description || '';
      rr.getCell(4).value = line.accountCode || ''; rr.getCell(4).alignment = { horizontal: 'center' };
      rr.getCell(5).value = accountNameMap.get(line.accountCode) || line.accountCode || '';
      rr.getCell(6).value = line.debit || 0; rr.getCell(6).numFmt = fmtCurrency; rr.getCell(6).alignment = { horizontal: 'right' };
      rr.getCell(7).value = line.credit || 0; rr.getCell(7).numFmt = fmtCurrency; rr.getCell(7).alignment = { horizontal: 'right' };
      if (idx === 0) {
        for (const cf of customFieldDefs) {
          const val = cfVals[cf.id];
          if (val !== undefined && val !== null && val !== '') rr.getCell(`cf_${cf.id}`).value = String(val);
        }
      }
      applyZebra(rr, idx % 2 === 1, palette.lightBg);
      row++;
    });
  }
  const tdLastDataRow = row - 1;
  if (tdLastDataRow >= 3) td.autoFilter = { from: { row: 2, column: 1 }, to: { row: tdLastDataRow, column: tdColHeaders.length } };

  // ================================================================
  // Sheet 7: Cash Flow
  // ================================================================
  const cfReport = await generateCashFlowReport(uid, startDate || null, endDate || null, baseCurrency);
  const cf = wb.addWorksheet('Cash Flow');
  setupSheet(cf, [{ header: 'Section / Account', key: 'a', width: 48 }, { header: 'Amount', key: 'b', width: 22 }], palette.accentGreen);
  addPeriodSubtitle(cf, startDate, endDate);
  addPrintSetup(cf);

  const renderCF = (title: string, items: { accountCode: string; accountName: string; amount: number }[], total: number) => {
    const sr = cf.getRow(row); sr.getCell(1).value = title; sr.getCell(1).style = sectionStyle(palette.lightBg); sr.getCell(2).style = sectionStyle(palette.lightBg); row++;
    items.sort((a, b) => a.accountCode.localeCompare(b.accountCode)).forEach((item, idx) => {
      const rr = cf.getRow(row);
      rr.getCell(1).value = `  ${item.accountCode}  ${item.accountName}`;
      rr.getCell(2).value = item.amount; rr.getCell(2).numFmt = fmtCurrency; rr.getCell(2).alignment = { horizontal: 'right' };
      applyZebra(rr, idx % 2 === 1, palette.lightBg);
      row++;
    });
    const tr = cf.getRow(row); tr.getCell(1).value = `Net ${title}`; tr.getCell(1).style = totalStyle;
    tr.getCell(2).value = total; tr.getCell(2).numFmt = fmtCurrency; tr.getCell(2).alignment = { horizontal: 'right' }; tr.getCell(2).style = totalStyle;
    row += 2;
  };

  row = 3;
  for (const section of cfReport.sections) {
    renderCF(section.title, section.items, section.total);
  }

  const cfnr = cf.getRow(row);
  cfnr.getCell(1).value = 'Net Change in Cash';
  cfnr.getCell(1).font = { bold: true, size: 12, color: { argb: cfReport.totalChange >= 0 ? palette.accentGreen : palette.accentRed } };
  cfnr.getCell(2).value = cfReport.totalChange; cfnr.getCell(2).numFmt = fmtCurrency;
  cfnr.getCell(2).font = { bold: true, size: 12, color: { argb: cfReport.totalChange >= 0 ? palette.accentGreen : palette.accentRed } };
  cfnr.getCell(2).alignment = { horizontal: 'right' };

  // ================================================================
  // Sheet 8: General Journal (auto-filter EX-7)
  // ================================================================
  const gj = wb.addWorksheet('General Journal');
  setupSheet(gj, [
    { header: 'Date', key: 'dt', width: 14 }, { header: 'Description', key: 'desc', width: 48 },
    { header: 'Ref', key: 'ref', width: 12 }, { header: 'Debit', key: 'db', width: 20 },
    { header: 'Credit', key: 'cr', width: 20 },
  ], palette.brandLight);
  addPeriodSubtitle(gj, startDate, endDate);
  addPrintSetup(gj);
  row = 3;
  const gjFirstDataRow = row;
  for (const entry of entriesData) {
    const eid = (entry as any)._id.toString();
    const lines = linesByEntryId.get(eid) || [];
    lines.forEach((line: any) => {
      const rr = gj.getRow(row);
      rr.getCell(1).value = entry.date || ''; rr.getCell(1).numFmt = fmtDate;
      const desc = line.accountCode ? `${line.accountCode}  ${accountNameMap.get(line.accountCode) || line.accountCode}` : '';
      rr.getCell(2).value = desc;
      rr.getCell(3).value = '';
      rr.getCell(4).value = line.debit || 0; rr.getCell(4).numFmt = fmtCurrency; rr.getCell(4).alignment = { horizontal: 'right' };
      rr.getCell(5).value = line.credit || 0; rr.getCell(5).numFmt = fmtCurrency; rr.getCell(5).alignment = { horizontal: 'right' };
      row++;
    });
    const dr = gj.getRow(row);
    dr.getCell(2).value = `  ${entry.description || ''}`;
    dr.getCell(2).font = { italic: true, color: { argb: palette.muted }, size: 10 };
    row++;
    row++;
  }
  const gjLastDataRow = row - 1;
  if (gjLastDataRow >= gjFirstDataRow) gj.autoFilter = { from: { row: 2, column: 1 }, to: { row: gjLastDataRow, column: 5 } };

  // ================================================================
  // Sheet 9: Import Data (existing, no subtitle to avoid conflict)
  // ================================================================
  const im = wb.addWorksheet('Import Data');
  const imCols = [
    { header: 'Date', key: 'dt', width: 16 }, { header: 'Description', key: 'desc', width: 46 },
    { header: 'Amount', key: 'amt', width: 16 }, { header: 'Type', key: 'type', width: 14 },
    { header: 'Account Code', key: 'ac', width: 14 }, { header: 'Account Name', key: 'an', width: 32 },
    { header: 'Balance', key: 'bal', width: 18 },
  ];
  im.columns = imCols;
  im.getRow(1).eachCell((cell) => { cell.style = headerStyle; });
  im.views = [{ state: 'frozen', ySplit: 1 }];
  im.properties.tabColor = { argb: palette.accentGreen };
  addPrintSetup(im);

  im.getRow(2).values = ['Paste your CSV data starting from row 4: Date, Description, Amount. The rest auto-classifies.', '', '', '', '', '', ''];
  im.getRow(2).font = { italic: true, color: { argb: palette.muted }, size: 10 };
  im.mergeCells('A2:G2');

  const kwRules = [
    { keywords: 'revenue, income, sales, received, sold', code: '4000', name: 'Sales Revenue', type: 'Income' },
    { keywords: 'service, consulting, fee, retainer', code: '4100', name: 'Service Revenue', type: 'Income' },
    { keywords: 'cogs, purchase, inventory, merchandise', code: '5000', name: 'Cost of Goods Sold', type: 'Expense' },
    { keywords: 'salary, wage, payroll, labor, bonus', code: '5100', name: 'Salaries & Wages', type: 'Expense' },
    { keywords: 'rent, lease, utility, electric, water', code: '5200', name: 'Rent & Utilities', type: 'Expense' },
    { keywords: 'supplies, office, software, stationery', code: '5300', name: 'Office Supplies', type: 'Expense' },
    { keywords: 'marketing, ad, advertising, promotion', code: '5400', name: 'Marketing', type: 'Expense' },
    { keywords: 'travel, fuel, hotel, lodging', code: '5500', name: 'Travel', type: 'Expense' },
    { keywords: 'legal, accounting, professional, audit', code: '5600', name: 'Professional Fees', type: 'Expense' },
    { keywords: 'tax, license, permit, registration', code: '5700', name: 'Taxes & Licenses', type: 'Expense' },
  ];

  row = 3;
  im.getRow(row).values = ['Keyword Rules:', '', '', '', '', '', ''];
  im.getRow(row).font = { bold: true, color: { argb: palette.dark }, size: 10 };
  row++;
  const kwHdr = im.getRow(row);
  kwHdr.values = ['Keywords', 'Account Code', 'Account Name', 'Type', '', '', ''];
  for (let c = 1; c <= 4; c++) { kwHdr.getCell(c).font = { bold: true, color: { argb: palette.white } }; kwHdr.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } }; }
  row++;
  const kwStart = row;
  for (const rule of kwRules) { im.getRow(row).values = [rule.keywords, rule.code, rule.name, rule.type]; row++; }
  const kwEnd = row - 1;

  row += 2;
  im.getRow(row).values = ['Paste data below (Date, Description, Amount):', '', '', '', '', '', ''];
  im.getRow(row).font = { bold: true, color: { argb: palette.dark }, size: 10 };
  im.mergeCells(`A${row}:G${row}`);
  row++;

  const dataHeaderRow = row;
  const dataStart = row + 1;

  for (let r = 0; r < 50; r++) {
    const rn = dataStart + r;
    const dr = im.getRow(rn);
    dr.getCell(4).value = { formula: `IF(ISBLANK(B${rn}),"",IF(SUMPRODUCT(--ISNUMBER(SEARCH(A$${kwStart}:A$${kwEnd},B${rn})))>0,VLOOKUP(INDEX(A$${kwStart}:A$${kwEnd},MATCH(TRUE,ISNUMBER(SEARCH(A$${kwStart}:A$${kwEnd},B${rn})),0)),A$${kwStart}:D$${kwEnd},4,0),"Uncategorized"))` };
    dr.getCell(5).value = { formula: `IF(ISBLANK(B${rn}),"",IF(SUMPRODUCT(--ISNUMBER(SEARCH(A$${kwStart}:A$${kwEnd},B${rn})))>0,VLOOKUP(INDEX(A$${kwStart}:A$${kwEnd},MATCH(TRUE,ISNUMBER(SEARCH(A$${kwStart}:A$${kwEnd},B${rn})),0)),A$${kwStart}:D$${kwEnd},2,0),IF(C${rn}>0,"4000","5800")))` };
    dr.getCell(6).value = { formula: `IF(ISBLANK(B${rn}),"",IF(SUMPRODUCT(--ISNUMBER(SEARCH(A$${kwStart}:A$${kwEnd},B${rn})))>0,VLOOKUP(INDEX(A$${kwStart}:A$${kwEnd},MATCH(TRUE,ISNUMBER(SEARCH(A$${kwStart}:A$${kwEnd},B${rn})),0)),A$${kwStart}:D$${kwEnd},3,0),IF(C${rn}>0,"Sales Revenue","Uncategorized Expense")))` };
    dr.getCell(7).value = { formula: `IF(ISBLANK(C${rn}),"",C${rn})` }; dr.getCell(7).numFmt = fmtCurrency;
  }

  im.getRow(dataHeaderRow).values = ['Date', 'Description', 'Amount', 'Type', 'Account Code', 'Account Name', 'Balance'];
  for (let c = 1; c <= 7; c++) {
    const cell = im.getRow(dataHeaderRow).getCell(c);
    cell.font = { bold: true, color: { argb: palette.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.revenue } };
    cell.border = { top: { style: 'thin', color: { argb: palette.border } }, bottom: { style: 'thin', color: { argb: palette.border } } };
  }

  im.autoFilter = { from: { row: dataHeaderRow, column: 1 }, to: { row: dataStart + 49, column: 7 } };

  // ================================================================
  // Sheet 10: Visual Analysis (with MoM% change, EX-5)
  // ================================================================
  const va = wb.addWorksheet('Visual Analysis');
  va.columns = [
    { header: 'Month', key: 'm', width: 14 }, { header: 'Revenue', key: 'r', width: 20 },
    { header: 'Expenses', key: 'e', width: 20 }, { header: 'Net Income', key: 'n', width: 20 },
    { header: '% Change', key: 'pct', width: 14 },
    { header: '', key: 'sp', width: 3 },
    { header: 'Top Expenses', key: 'ec', width: 24 }, { header: 'Amount', key: 'ea', width: 20 },
    { header: '% of Total', key: 'pct2', width: 16 },
  ];
  va.getRow(1).eachCell((cell) => { cell.style = headerStyle; });
  va.views = [{ state: 'frozen', ySplit: 2 }];
  va.properties.tabColor = { argb: palette.brand };
  addPeriodSubtitle(va, startDate, endDate);
  addPrintSetup(va);

  // Monthly trend with MoM% change
  const sortedMonths = Array.from(monthlyTotals.keys()).sort();
  let vaRow = 3;
  let prevMonthNet = 0;
  if (sortedMonths.length >= 2) {
    for (const month of sortedMonths) {
      const mt = monthlyTotals.get(month)!;
      const net = Math.round((mt.revenue - mt.expenses) * 100) / 100;
      const rr = va.getRow(vaRow);
      rr.getCell(1).value = month;
      rr.getCell(2).value = Math.round(mt.revenue * 100) / 100;
      rr.getCell(2).numFmt = fmtCurrency;
      rr.getCell(3).value = Math.round(mt.expenses * 100) / 100;
      rr.getCell(3).numFmt = fmtCurrency;
      rr.getCell(4).value = net;
      rr.getCell(4).numFmt = fmtCurrency;
      // MoM% change (EX-5)
      const moIdx = sortedMonths.indexOf(month);
      if (moIdx > 0 && Math.abs(prevMonthNet) > 0.01) {
        const pctChange = (net - prevMonthNet) / Math.abs(prevMonthNet);
        rr.getCell(5).value = pctChange; rr.getCell(5).numFmt = '0.0%'; rr.getCell(5).alignment = { horizontal: 'right' };
        rr.getCell(5).font = { color: { argb: pctChange >= 0 ? palette.accentGreen : palette.accentRed }, name: 'Calibri' };
      } else if (moIdx > 0) {
        rr.getCell(5).value = 'N/A'; rr.getCell(5).alignment = { horizontal: 'right' };
      }
      if (vaRow % 2 === 0) applyZebra(rr, true, palette.lightBg);
      prevMonthNet = net;
      vaRow++;
    }
  } else {
    const rr = va.getRow(vaRow);
    rr.getCell(1).value = startDate || endDate || 'Total';
    rr.getCell(2).value = revenueTotal;
    rr.getCell(3).value = expenseTotal;
    rr.getCell(4).value = netIncome;
    if (vaRow % 2 === 0) applyZebra(rr, true, palette.lightBg);
    vaRow++;
  }

  // Data bars on Revenue and Expenses columns
  if (vaRow > 3) {
    const revEnd = vaRow - 1;
    const dataBarRule = (color: string) => ({ type: 'dataBar', priority: 1, cfvo: [{ type: 'min' }, { type: 'max' }], color: { argb: color }, showValue: true } as any);
    va.addConditionalFormatting({ ref: `B3:B${revEnd}`, rules: [dataBarRule(palette.revenue)] });
    va.addConditionalFormatting({ ref: `C3:C${revEnd}`, rules: [dataBarRule(palette.expense)] });
    va.addConditionalFormatting({ ref: `D3:D${revEnd}`, rules: [dataBarRule(palette.accentGreen)] });
  }

  // Top expenses breakdown
  vaRow += 2;
  va.getRow(vaRow).values = ['', '', '', '', '', '', 'Top Expenses', 'Amount', '% of Total'];
  for (let c = 7; c <= 9; c++) {
    va.getRow(vaRow).getCell(c).font = { bold: true, color: { argb: palette.white } };
    va.getRow(vaRow).getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.expense } };
  }
  vaRow++;

  const expenseAccounts = plSections.find(s => s.type === 'expense')?.accounts || [];
  const topExpenses = [...expenseAccounts].sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance)).slice(0, 10);

  topExpenses.forEach((acc, idx) => {
    const rr = va.getRow(vaRow);
    rr.getCell(7).value = acc.name;
    rr.getCell(8).value = Math.abs(acc.balance);
    rr.getCell(8).numFmt = fmtCurrency;
    const pct = expenseTotal > 0 ? (Math.abs(acc.balance) / expenseTotal) : 0;
    rr.getCell(9).value = pct;
    rr.getCell(9).numFmt = '0.0%';
    if (idx % 2 === 1) { for (let c = 7; c <= 9; c++) rr.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.expenseBg } }; }
    vaRow++;
  });

  // Data bar on expense amounts
  const expEnd = vaRow - 1;
  const expStart = vaRow - topExpenses.length;
  if (topExpenses.length > 0) {
    va.addConditionalFormatting({
      ref: `H${expStart}:H${expEnd}`,
      rules: [{ type: 'dataBar', priority: 2, cfvo: [{ type: 'min' }, { type: 'max' }], color: { argb: palette.accentRed }, showValue: true } as any],
    });
  }

  // ================================================================
  // Sheet 11: Revenue Analysis
  // ================================================================
  const ra = wb.addWorksheet('Revenue Analysis');
  setupSheet(ra, [
    { header: 'Account Code', key: 'ac', width: 14 }, { header: 'Account Name', key: 'an', width: 36 },
    { header: 'Amount', key: 'amt', width: 20 }, { header: '% of Total Revenue', key: 'pct', width: 20 },
  ], palette.revenue);
  addPeriodSubtitle(ra, startDate, endDate);
  addPrintSetup(ra);

  const revAccounts = plSections.find(s => s.type === 'revenue')?.accounts || [];
  row = 3;
  revAccounts.forEach((acc, idx) => {
    const rr = ra.getRow(row);
    rr.getCell(1).value = acc.code; rr.getCell(1).font = { name: 'Consolas', size: 10 };
    rr.getCell(2).value = acc.name;
    rr.getCell(3).value = acc.balance; rr.getCell(3).numFmt = fmtCurrency; rr.getCell(3).alignment = { horizontal: 'right' };
    const pct = revenueTotal > 0 ? (acc.balance / revenueTotal) * 100 : 0;
    rr.getCell(4).value = pct / 100;
    rr.getCell(4).numFmt = '0.0%';
    rr.getCell(4).alignment = { horizontal: 'right' };
    applyZebra(rr, idx % 2 === 1, palette.revenueBg);
    row++;
  });
  const rtr = ra.getRow(row);
  rtr.getCell(1).value = 'TOTAL'; rtr.getCell(1).font = { bold: true };
  rtr.getCell(3).value = revenueTotal; rtr.getCell(3).numFmt = fmtCurrency; rtr.getCell(3).alignment = { horizontal: 'right' }; rtr.getCell(3).font = { bold: true };
  rtr.getCell(4).value = 1; rtr.getCell(4).numFmt = '0.0%'; rtr.getCell(4).alignment = { horizontal: 'right' }; rtr.getCell(4).font = { bold: true };
  for (let c = 1; c <= 4; c++) rtr.getCell(c).border = { top: { style: 'medium', color: { argb: palette.revenue } }, bottom: { style: 'double', color: { argb: palette.revenue } } };

  // ================================================================
  // ================================================================
  // Sheet 12: Expense Analysis
  // ================================================================
  const ea = wb.addWorksheet('Expense Analysis');
  setupSheet(ea, [
    { header: 'Account Code', key: 'ac', width: 14 }, { header: 'Account Name', key: 'an', width: 36 },
    { header: 'Amount', key: 'amt', width: 20 }, { header: '% of Total Expenses', key: 'pct', width: 22 },
  ], palette.expense);
  addPeriodSubtitle(ea, startDate, endDate);
  addPrintSetup(ea);

  const expAccounts = plSections.find(s => s.type === 'expense')?.accounts || [];
  row = 3;
  expAccounts.forEach((acc, idx) => {
    const rr = ea.getRow(row);
    rr.getCell(1).value = acc.code; rr.getCell(1).font = { name: 'Consolas', size: 10 };
    rr.getCell(2).value = acc.name;
    rr.getCell(3).value = Math.abs(acc.balance); rr.getCell(3).numFmt = fmtCurrency; rr.getCell(3).alignment = { horizontal: 'right' };
    const pct = expenseTotal > 0 ? (Math.abs(acc.balance) / expenseTotal) * 100 : 0;
    rr.getCell(4).value = pct / 100;
    rr.getCell(4).numFmt = '0.0%';
    rr.getCell(4).alignment = { horizontal: 'right' };
    applyZebra(rr, idx % 2 === 1, palette.expenseBg);
    row++;
  });
  const etr = ea.getRow(row);
  etr.getCell(1).value = 'TOTAL'; etr.getCell(1).font = { bold: true };
  etr.getCell(3).value = expenseTotal; etr.getCell(3).numFmt = fmtCurrency; etr.getCell(3).alignment = { horizontal: 'right' }; etr.getCell(3).font = { bold: true };
  etr.getCell(4).value = 1; etr.getCell(4).numFmt = '0.0%'; etr.getCell(4).alignment = { horizontal: 'right' }; etr.getCell(4).font = { bold: true };
  for (let c = 1; c <= 4; c++) etr.getCell(c).border = { top: { style: 'medium', color: { argb: palette.expense } }, bottom: { style: 'double', color: { argb: palette.expense } } };

  return wb;
}
