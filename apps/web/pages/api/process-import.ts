import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import ImportJob from '@/lib/models/ImportJob';
import JournalEntry from '@/lib/models/JournalEntry';
import JournalLine from '@/lib/models/JournalLine';
import Account from '@/lib/models/Account';
import ClosedPeriod from '@/lib/models/ClosedPeriod';
import CategoryMapping from '@/lib/models/CategoryMapping';
import { KEYWORD_RULES, classifyRow, cleanDate } from '@/lib/classify';
import { checkEntryLimit } from '@/lib/subscription';
import Papa from 'papaparse';
import { resolveUserId } from '@/lib/customerContext';
import type { CsvMapping } from '@/lib/types';
import { withRateLimit } from '@/lib/apiRateLimit';

function levenshteinDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

const DEDUP_THRESHOLD = 0.85;

function detectMapping(headers: string[], sample: Record<string, string>): CsvMapping {
  const map: CsvMapping = { dateColumn: '', amountColumn: '' };
  const dateP = [/date/i, /created/i, /posted/i, /transaction/i, /time/i];
  const amtP = [/revenue/i, /income/i, /sales/i, /total/i, /amount/i, /price/i, /received/i, /credit/i, /gross/i];
  const costP = [/cost/i, /expense/i, /fee/i, /debit/i, /payment/i, /spent/i, /charge/i, /cogs/i];
  for (const col of headers) {
    const val = sample[col] || '';
    if (!map.dateColumn && dateP.some(p => p.test(col)) && !isNaN(Date.parse(val))) map.dateColumn = col;
    else if (!map.amountColumn && amtP.some(p => p.test(col)) && isFinite(parseFloat(val.replace(/[$,\s]/g, '')))) map.amountColumn = col;
    else if (!map.amountColumn2 && costP.some(p => p.test(col)) && isFinite(parseFloat(val.replace(/[$,\s]/g, '')))) map.amountColumn2 = col;
  }
  return map;
}

function cleanNumber(raw: string): number {
  return parseFloat(raw.replace(/[$€£,\s]/g, '')) || 0;
}

function parseAmounts(row: Record<string, string>, amountCol: string, costCol: string, amountMode: string): { revenueAmount: number; expenseAmount: number } {
  const amt = amountCol ? cleanNumber(row[amountCol] || '0') : 0;
  const cost = costCol ? cleanNumber(row[costCol] || '0') : 0;
  if (amountMode === 'single_with_sign') {
    if (amt > 0) return { revenueAmount: amt, expenseAmount: 0 };
    if (amt < 0) return { revenueAmount: 0, expenseAmount: Math.abs(amt) };
    return { revenueAmount: 0, expenseAmount: 0 };
  }
  if (amountMode === 'debit_credit') {
    return { revenueAmount: cost, expenseAmount: amt };
  }
  return { revenueAmount: amt, expenseAmount: cost };
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = await resolveUserId(token, req.body.userId);

  const { allowed, limit, used } = await checkEntryLimit(uid!);
  if (!allowed) return res.status(403).json({ error: `Monthly entry limit reached (${used}/${limit}). Upgrade to continue.`, code: 'LIMIT_REACHED', upgradeUrl: '/pricing' });

  const { jobId } = req.body;
  if (!jobId) return res.status(400).json({ error: 'jobId required' });

  await dbConnect();

  try {
    const job = await ImportJob.findOne({ _id: jobId, userId: uid }).lean();
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const content = (job as any).content;
    if (!content) {
      await ImportJob.findByIdAndUpdate(jobId, { $set: { status: 'failed', errors: [{ row: 0, reason: 'Content not found' }] } });
      return res.status(500).json({ error: 'Import content not found' });
    }

    const excludedRows: number[] = (job as any).excludedRows || [];
    const excludedSet = new Set(excludedRows);
    const dedupEnabled = (job as any).dedupEnabled !== false;
    const aiMappings: Record<string, string> = (job as any).aiMappings || {};
    const jobCustomFieldMapping: Record<string, string> = (job as any).customFieldMapping || {};

    let accountsByCode = new Map<string, { code: string; name: string; type: string }>();
    const accountDocs = await Account.find({ userId: uid, isActive: true }).lean();
    for (const a of accountDocs) accountsByCode.set(a.code, { code: a.code, name: a.name, type: a.type });

    if (accountsByCode.size === 0) {
      const DEFAULT_ACCOUNTS = [
        { code: '1000', name: 'Cash', type: 'asset', normalBalance: 'debit' },
        { code: '1100', name: 'Accounts Receivable', type: 'asset', normalBalance: 'debit' },
        { code: '1200', name: 'Inventory', type: 'asset', normalBalance: 'debit' },
        { code: '1300', name: 'Prepaid Expenses', type: 'asset', normalBalance: 'debit' },
        { code: '1400', name: 'Equipment', type: 'asset', normalBalance: 'debit' },
        { code: '1500', name: 'Furniture & Fixtures', type: 'asset', normalBalance: 'debit' },
        { code: '1600', name: 'Accumulated Depreciation', type: 'asset', normalBalance: 'credit' },
        { code: '2000', name: 'Accounts Payable', type: 'liability', normalBalance: 'credit' },
        { code: '2100', name: 'Accrued Liabilities', type: 'liability', normalBalance: 'credit' },
        { code: '2200', name: 'Unearned Revenue', type: 'liability', normalBalance: 'credit' },
        { code: '2300', name: 'Loans Payable', type: 'liability', normalBalance: 'credit' },
        { code: '3000', name: "Owner's Equity", type: 'equity', normalBalance: 'credit' },
        { code: '3100', name: 'Retained Earnings', type: 'equity', normalBalance: 'credit' },
        { code: '4000', name: 'Sales Revenue', type: 'revenue', normalBalance: 'credit' },
        { code: '4100', name: 'Service Revenue', type: 'revenue', normalBalance: 'credit' },
        { code: '4200', name: 'Interest Income', type: 'revenue', normalBalance: 'credit' },
        { code: '5000', name: 'Cost of Goods Sold', type: 'expense', normalBalance: 'debit' },
        { code: '5100', name: 'Salaries & Wages', type: 'expense', normalBalance: 'debit' },
        { code: '5200', name: 'Rent & Utilities', type: 'expense', normalBalance: 'debit' },
        { code: '5300', name: 'Office Supplies', type: 'expense', normalBalance: 'debit' },
        { code: '5400', name: 'Marketing & Advertising', type: 'expense', normalBalance: 'debit' },
        { code: '5500', name: 'Travel & Meals', type: 'expense', normalBalance: 'debit' },
        { code: '5600', name: 'Professional Fees', type: 'expense', normalBalance: 'debit' },
        { code: '5700', name: 'Taxes & Licenses', type: 'expense', normalBalance: 'debit' },
        { code: '5800', name: 'Other Expenses', type: 'expense', normalBalance: 'debit' },
        { code: '5900', name: 'Uncategorized Income', type: 'revenue', normalBalance: 'credit' },
        { code: '6000', name: 'Uncategorized Expense', type: 'expense', normalBalance: 'debit' },
      ];
      await Account.insertMany(DEFAULT_ACCOUNTS.map(a => ({ ...a, userId: uid, isActive: true, createdAt: new Date(), updatedAt: new Date() })));
      for (const acct of DEFAULT_ACCOUNTS) accountsByCode.set(acct.code, { code: acct.code, name: acct.name, type: acct.type });
    }

    const mappingDocs = await CategoryMapping.find({ userId: uid }).lean();
    const mappings = new Map<string, string>();
    for (const m of mappingDocs) mappings.set(m.keyword, m.accountCode);

    await ImportJob.findByIdAndUpdate(jobId, { $set: { status: 'processing', startedAt: new Date() } });

    const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
    const allRows = parsed.data as Record<string, string>[];

    let processedRows = 0, importedEntries = 0, skippedRows = 0, duplicatesSkipped = 0, uncategorizedEntries = 0;
    const duplicateRows: { row: number; description: string; date: string; matchedDescription: string }[] = [];
    const errors: { row: number; reason: string }[] = [];
    const jobCsvMapping: CsvMapping | null = (job as any).csvMapping || null;
    const amountMode = jobCsvMapping?.amountMode || 'revenue_and_cost';
    let mapping: CsvMapping = (job as any).mapping || {} as CsvMapping;
    let mappingDetected = Object.values(mapping).some(v => v);
    const BATCH_SIZE = 500;

    for (let start = 0; start < allRows.length; start += BATCH_SIZE) {
      const batch = allRows.slice(start, start + BATCH_SIZE);

      if (!mappingDetected && batch.length > 0) {
        mapping = detectMapping(Object.keys(batch[0]), batch[0]);
        mappingDetected = true;
        await ImportJob.findByIdAndUpdate(jobId, { $set: { mapping } });
      }

      const dateCol = mapping.dateColumn;
      const amountCol = mapping.amountColumn;
      const costCol = mapping.amountColumn2 || (mapping as any).costColumn;
      const descCol = mapping.descriptionColumn;

      if (dateCol) {
        const yearMonths = new Set<string>();
        for (const row of allRows) {
          const rawDate = row[dateCol];
          if (!rawDate) continue;
          const parsed = cleanDate(rawDate);
          if (parsed) yearMonths.add(parsed.slice(0, 7));
        }
        for (const ym of yearMonths) {
          const closed = await ClosedPeriod.findOne({ userId: uid, yearMonth: ym });
          if (closed) {
            await ImportJob.findByIdAndUpdate(jobId, { $set: { status: 'failed', errors: [{ row: 0, reason: `Cannot import into closed period: ${ym}` }] } });
            return res.status(400).json({ error: `Cannot import into closed period: ${ym}` });
          }
        }
      }

      const dedupCache = new Map<string, string[]>();
      const entriesToInsert: any[] = [];
      const linesToInsert: any[] = [];

      for (let i = 0; i < batch.length; i++) {
        const row = batch[i];
        const absRow = start + i + 1;
        processedRows++;

        if (excludedSet.has(absRow)) { skippedRows++; continue; }

        const today = new Date().toISOString().split('T')[0];
        const dateVal = dateCol ? (cleanDate(row[dateCol] || '') || today) : today;
        const descVal = descCol ? (row[descCol] || '').trim() : '';
        const catCol = mapping.categoryColumn;
        const catVal = (catCol ? (row[catCol] || '') : '').trim().toLowerCase() || 'uncategorized';

        const { revenueAmount, expenseAmount } = parseAmounts(row, amountCol, costCol, amountMode);
        if (!revenueAmount && !expenseAmount) { skippedRows++; continue; }

        if (dedupEnabled && descVal && dateVal) {
          let existing: string[] = [];
          if (dedupCache.has(dateVal)) {
            existing = dedupCache.get(dateVal)!;
          } else {
            const entryDocs: any[] = await JournalEntry.find({ userId: uid, date: dateVal }, { description: 1 }).lean() as any[];
            const entryIds = entryDocs.map(e => e._id.toString());
            const lineDocs: any[] = await JournalLine.find({ userId: uid, journalEntryId: { $in: entryIds } }, { description: 1 }).lean() as any[];
            const descs = [...entryDocs.map(e => e.description), ...lineDocs.map(l => l.description || '')];
            existing = descs.map(d => d.toLowerCase()).filter(Boolean);
            dedupCache.set(dateVal, existing);
          }
          const matchedDesc = existing.find((ex: string) => similarity(descVal.toLowerCase(), ex) >= DEDUP_THRESHOLD);
          if (matchedDesc) {
            duplicatesSkipped++; skippedRows++;
            if (duplicateRows.length < 100) duplicateRows.push({ row: absRow, description: descVal.slice(0, 100), date: dateVal, matchedDescription: matchedDesc.slice(0, 100) });
            continue;
          }
        }

        const rawData: Record<string, any> = {};
        for (const [k, v] of Object.entries(row)) { const t = v?.trim(); if (t) rawData[k] = t; }

        const desc = descVal || `Row ${absRow}`;
        if (!revenueAmount && !expenseAmount) { skippedRows++; continue; }

        const entryId = new (require('mongoose').Types.ObjectId)();
        const customFieldValues: Record<string, string> = {};
        for (const [fieldId, csvCol] of Object.entries(jobCustomFieldMapping)) {
          const val = row[csvCol]?.trim();
          if (val) customFieldValues[fieldId] = val;
        }
        entriesToInsert.push({
          _id: entryId,
          userId: uid,
          date: dateVal,
          description: desc,
          jobId,
          customFieldValues: Object.keys(customFieldValues).length > 0 ? customFieldValues : undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        if (revenueAmount > 0) {
          const acctCode = aiMappings[descVal] || aiMappings[descVal.toLowerCase()];
          const acct = acctCode && accountsByCode.get(acctCode)
            ? accountsByCode.get(acctCode)!
            : classifyRow(catVal, descVal, revenueAmount, false, mappings, accountsByCode, {});
          if (acct.code === '6000' || acct.code === '5900') uncategorizedEntries++;

          linesToInsert.push({
            journalEntryId: entryId.toString(),
            userId: uid,
            accountCode: '1000',
            description: desc,
            debit: revenueAmount,
            credit: 0,
            rawData,
          });
          linesToInsert.push({
            journalEntryId: entryId.toString(),
            userId: uid,
            accountCode: acct.code,
            description: desc,
            debit: 0,
            credit: revenueAmount,
            rawData,
          });
          importedEntries++;
        }

        if (expenseAmount > 0) {
          const acctCode = aiMappings[descVal] || aiMappings[descVal.toLowerCase()];
          const acct = acctCode && accountsByCode.get(acctCode)
            ? accountsByCode.get(acctCode)!
            : classifyRow(catVal, descVal, expenseAmount, true, mappings, accountsByCode, {});
          if (acct.code === '6000' || acct.code === '5900') uncategorizedEntries++;

          const costDesc = descVal ? `${descVal} (Cost)` : `Cost ${absRow}`;
          linesToInsert.push({
            journalEntryId: entryId.toString(),
            userId: uid,
            accountCode: acct.code,
            description: costDesc,
            debit: expenseAmount,
            credit: 0,
            rawData,
          });
          linesToInsert.push({
            journalEntryId: entryId.toString(),
            userId: uid,
            accountCode: '1000',
            description: costDesc,
            debit: 0,
            credit: expenseAmount,
            rawData,
          });
          importedEntries++;
        }
      }

      if (entriesToInsert.length > 0) {
        await JournalEntry.insertMany(entriesToInsert);
        await JournalLine.insertMany(linesToInsert);
      }

      await ImportJob.findByIdAndUpdate(jobId, {
        $set: { processedRows, importedEntries, skippedRows, duplicatesSkipped, totalRows: allRows.length, errors: errors.slice(-100) },
      });
    }

    await ImportJob.findByIdAndUpdate(jobId, {
      $set: {
        status: 'completed', processedRows, importedEntries, skippedRows, duplicatesSkipped, duplicateRows,
        errors: errors.slice(-100), completedAt: new Date(),
      },
    });

    return res.status(200).json({
      success: true, data: { jobId, status: 'completed', totalRows: allRows.length, importedEntries, skippedRows, duplicatesSkipped, uncategorizedEntries, errors: errors.length },
    });
  } catch (error: any) {
    const errMsg = error?.message || error?.toString() || 'Unknown error';
    await ImportJob.findByIdAndUpdate(jobId, { $set: { status: 'failed', errors: [{ row: 0, reason: errMsg }], completedAt: new Date() } }).catch(() => {});
    console.error('process-import error:', errMsg, error?.stack || '');
    return res.status(500).json({ success: false, error: errMsg });
  }
}

export default withRateLimit(handler);
