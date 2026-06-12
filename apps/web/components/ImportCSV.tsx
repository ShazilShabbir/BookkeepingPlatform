import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, Button, Badge } from '@/components/ui';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import type { ImportJob } from '@/lib/types';

interface ColumnAnalysis {
  name: string;
  detectedType: string;
  sampleValues: string[];
  nullCount: number;
  nullRate: number;
  uniqueCount: number;
  min?: number;
  max?: number;
  mean?: number;
}

interface CleaningIssue {
  column: string;
  type: string;
  description: string;
  suggestedAction: string;
  affectedRows: number;
}

interface AnalysisResult {
  totalRows: number;
  totalColumns: number;
  columns: ColumnAnalysis[];
  mapping: Record<string, string>;
  issues: CleaningIssue[];
  sampleRows: Record<string, string>[];
}

type Step = 'idle' | 'analyzing' | 'generating' | 'review' | 'uploading' | 'processing' | 'completed' | 'failed';

const PREVIEW_PAGE_SIZE = 50;

interface AccountOption { code: string; name: string; type?: string; isAiGenerated?: boolean; }

const FALLBACK_ACCOUNTS: AccountOption[] = [
  { code: '4000', name: 'Revenue - Products' },
  { code: '4100', name: 'Revenue - Services' },
  { code: '4200', name: 'Revenue - Other' },
  { code: '5000', name: 'Cost of Goods Sold' },
  { code: '5100', name: 'Salaries & Wages' },
  { code: '5200', name: 'Rent & Utilities' },
  { code: '5300', name: 'Office Supplies' },
  { code: '5400', name: 'Marketing & Advertising' },
  { code: '5500', name: 'Travel & Meals' },
  { code: '5600', name: 'Professional Fees' },
  { code: '5700', name: 'Taxes & Licenses' },
  { code: '5800', name: 'Uncategorized Income' },
  { code: '5900', name: 'Uncategorized Expense' },
];

export default function ImportCSV({ userId }: ImportCSVProps) {
  const [step, setStep] = useState<Step>('idle');
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [acceptedIssues, setAcceptedIssues] = useState<Set<string>>(new Set());
  const [job, setJob] = useState<ImportJob | null>(null);
  const [processingJobId, setProcessingJobId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<ImportJob[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingActive = useRef(false);
  const abortRef = useRef(false);

  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [excludedRows, setExcludedRows] = useState<Set<number>>(new Set());
  const [dedupEnabled, setDedupEnabled] = useState(true);
  const [previewPage, setPreviewPage] = useState(0);

  const [accountsList, setAccountsList] = useState<AccountOption[]>([]);
  const [generatedAccounts, setGeneratedAccounts] = useState<AccountOption[]>([]);
  const [aiMappings, setAiMappings] = useState<Record<string, string>>({});
  const [classifiedCount, setClassifiedCount] = useState(0);

  useEffect(() => {
    if (!processingJobId) return;

    pollingActive.current = true;

    const poll = async () => {
      if (!pollingActive.current) return;
      try {
        const res = await fetch(`/api/import-jobs/${processingJobId}`);
        const json = await res.json();
        if (json.success) {
          const data = (json.data?.job || json.data) as ImportJob;
          setJob(data);
          if (data.status === 'completed') setStep('completed');
          else if (data.status === 'failed') setStep('failed');
        }
      } catch {}
    };

    poll();
    const interval = setInterval(poll, 2000);

    return () => { pollingActive.current = false; clearInterval(interval); };
  }, [processingJobId]);

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const res = await fetch('/api/accounts');
        const json = await res.json();
        if (json.success) setAccountsList(json.data || []);
      } catch {}
    };
    loadAccounts();
  }, []);

  const reset = useCallback(() => {
    setStep('idle');
    setProgress(0);
    setFile(null);
    setFileContent('');
    setAnalysis(null);
    setMapping({});
    setAcceptedIssues(new Set());
    setJob(null);
    setProcessingJobId(null);
    setParsedRows([]);
    setExcludedRows(new Set());
    setDedupEnabled(true);
    setPreviewPage(0);
    setGeneratedAccounts([]);
    setAiMappings({});
    setClassifiedCount(0);
    pollingActive.current = false;
    abortRef.current = true;
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/import-jobs');
      const json = await res.json();
      if (json.success) setHistory(json.data);
    } catch {}
    finally { setHistoryLoading(false); }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleDeleteJob = useCallback(async (jobId: string) => {
    if (!window.confirm('Delete this import and all its entries? This cannot be undone.')) return;
    setDeletingId(jobId);
    try {
      const res = await fetch(`/api/import-jobs/${jobId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setHistory(prev => prev.filter(j => j._id !== jobId));
        if (job?._id === jobId) reset();
      } else {
        alert('Delete failed: ' + (json.error || 'unknown error'));
      }
    } catch (e: any) {
      alert('Delete failed: ' + e.message);
    } finally {
      setDeletingId(null);
    }
  }, [job, reset]);

  function detectColumnType(values: string[]): string {
    const nonEmpty = values.filter(v => v?.trim());
    if (nonEmpty.length === 0) return 'empty';
    const sample = nonEmpty.slice(0, 20);
    const dateCount = sample.filter(v => !isNaN(Date.parse(v)) || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v)).length;
    const currencyCount = sample.filter(v => /^[$€£¥]/.test(v.trim())).length;
    const numCount = sample.filter(v => isFinite(parseFloat(v.replace(/[$€£¥,\s]/g, '')))).length;
    if (dateCount / sample.length > 0.8) return 'date';
    if (currencyCount / sample.length > 0.8) return 'currency';
    if (numCount / sample.length > 0.8) return 'number';
    return 'text';
  }

  function analyzeCSV(rows: Record<string, string>[]): AnalysisResult {
    const SAMPLE_SIZE = 1000;
    const totalRows = rows.length;
    const sampleRows = rows.slice(0, 5);
    const analysisSample = rows.slice(0, SAMPLE_SIZE);

    if (analysisSample.length === 0) return { totalRows: 0, totalColumns: 0, columns: [], mapping: {}, issues: [], sampleRows: [] };

    const headers = Object.keys(analysisSample[0]);
    const columns: ColumnAnalysis[] = [];
    const issues: CleaningIssue[] = [];

    for (const h of headers) {
      const values = analysisSample.map(r => r[h] || '');
      const nonEmpty = values.filter(v => v?.trim());
      const nullCount = values.length - nonEmpty.length;
      const type = detectColumnType(values);
      columns.push({
        name: h, detectedType: type,
        sampleValues: nonEmpty.slice(0, 5),
        nullCount, nullRate: nullCount / values.length,
        uniqueCount: new Set(nonEmpty.map(v => v.trim())).size,
      });
      if (nullCount / values.length > 0.5) {
        issues.push({
          column: h, type: 'null',
          description: `${nullCount}/${SAMPLE_SIZE} rows in sample empty (${(nullCount/SAMPLE_SIZE*100).toFixed(0)}%)`,
          suggestedAction: 'Will be skipped', affectedRows: nullCount,
        });
      }
    }

    const mapping: Record<string, string> = {};
    const dateP = [/date/i, /created/i, /posted/i, /transaction/i];
    const amtP = [/revenue/i, /income/i, /sales/i, /total/i, /amount/i, /price/i, /received/i, /credit/i];
    const costP = [/cost/i, /expense/i, /fee/i, /debit/i, /payment/i, /charge/i, /cogs/i];
    const descP = [/descript/i, /memo/i, /note/i, /item/i, /product/i, /reference/i];
    const catP = [/category/i, /type/i, /group/i, /class/i, /segment/i];
    const idP = [/order.?id/i, /transaction.?id/i, /invoice/i, /ref(erence)?/i, /^id$/i];
    for (const col of columns) {
      if (!mapping.dateColumn && col.detectedType === 'date' && dateP.some(p => p.test(col.name))) mapping.dateColumn = col.name;
      else if (!mapping.amountColumn && (col.detectedType === 'number' || col.detectedType === 'currency') && amtP.some(p => p.test(col.name))) mapping.amountColumn = col.name;
      else if (!mapping.costColumn && (col.detectedType === 'number' || col.detectedType === 'currency') && costP.some(p => p.test(col.name))) mapping.costColumn = col.name;
      else if (!mapping.descriptionColumn && col.detectedType === 'text' && descP.some(p => p.test(col.name))) mapping.descriptionColumn = col.name;
      else if (!mapping.categoryColumn && catP.some(p => p.test(col.name))) mapping.categoryColumn = col.name;
      else if (!mapping.idColumn && idP.some(p => p.test(col.name))) mapping.idColumn = col.name;
    }
    if (!mapping.amountColumn && !mapping.costColumn) {
      for (const col of columns) {
        if (col.detectedType === 'number' || col.detectedType === 'currency') {
          if (!mapping.amountColumn) mapping.amountColumn = col.name;
          else if (!mapping.costColumn) mapping.costColumn = col.name;
        }
      }
    }
    if (!mapping.dateColumn) for (const col of columns) { if (col.detectedType === 'date') { mapping.dateColumn = col.name; break; } }
    return { totalRows, totalColumns: headers.length, columns, mapping, issues, sampleRows };
  }

  const startAnalysis = useCallback(async (f: File) => {
    if (!f.name.endsWith('.csv')) { toast.error('Please select a CSV file'); return; }
    reset();
    abortRef.current = false;
    setFile(f);
    setStep('analyzing');

    let content: string;
    try {
      content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(f);
      });
    } catch {
      toast.error('Could not read file');
      setStep('idle');
      return;
    }
    if (abortRef.current) return;
    setFileContent(content);

    let rows: Record<string, string>[];
    try {
      toast.remove();
      const toastId = toast.loading(`Parsing ${(f.size / 1024 / 1024).toFixed(1)}MB file...`);
      await new Promise<void>(resolve => setTimeout(resolve, 30));
      const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
      if (parsed.errors?.length > 0) console.warn('CSV parse warnings:', parsed.errors);
      rows = parsed.data as Record<string, string>[];
      toast.dismiss(toastId);
    } catch (e: any) {
      toast.error('Failed to parse CSV: ' + (e.message || 'unknown error'));
      setStep('idle');
      return;
    }
    if (abortRef.current) return;

    if (rows.length === 0) {
      toast.error('CSV file contains no data rows');
      setStep('idle');
      return;
    }

    setParsedRows(rows);
    const result = analyzeCSV(rows);
    if (abortRef.current) return;
    setAnalysis(result);
    setMapping(result.mapping || {});

    const descCol = result.mapping.descriptionColumn || Object.keys(rows[0]).find(k => /descript|memo|note|item/i.test(k)) || '';
    let classified = 0;
    for (let i = 0; i < Math.min(rows.length, 2000); i++) {
      const desc = (rows[i][descCol] || '').trim();
      if (desc) { classified++; }
    }
    setClassifiedCount(classified);

    const allDescs: string[] = [];
    for (let i = 0; i < Math.min(rows.length, 1000); i++) {
      const desc = (rows[i][descCol] || '').trim();
      if (desc) allDescs.push(desc);
    }

    setStep('generating');

    try {
      if (allDescs.length > 0) {
        const sugRes = await fetch('/api/ai/suggest-accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ descriptions: allDescs }),
        });
        const sugJson = await sugRes.json();
        if (sugJson.success && sugJson.data?.accounts?.length > 0) {
          const newAccounts = sugJson.data.accounts.map((a: any) => ({ ...a, isAiGenerated: true }));
          setGeneratedAccounts(newAccounts);
          toast.success(`AI created ${newAccounts.length} new account${newAccounts.length > 1 ? 's' : ''}`);
        }
      }

      const uniqueDescs = [...new Set(allDescs.filter(Boolean))];
      if (uniqueDescs.length > 0) {
        const classifyRes = await fetch('/api/ai/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transactions: uniqueDescs.map(d => ({
              date: '',
              description: d,
              amount: 1,
            })),
          }),
        });
        const classifyJson = await classifyRes.json();
        if (classifyJson.code === 'UPGRADE_REQUIRED') {
          setClassifiedCount(0);
        } else if (classifyJson.success && classifyJson.data) {
          const mappings: Record<string, string> = {};
          for (const item of classifyJson.data) {
            if (item.description && item.accountCode) {
              mappings[item.description] = item.accountCode;
            }
          }
          setAiMappings(mappings);
          setClassifiedCount(Object.keys(mappings).length);
        }
      }
    } catch (e) {
      console.error('AI classification failed:', e);
    }

    setStep('review');
  }, [reset]);

  const confirmImport = async () => {
    if (!file || !fileContent) return;
    setStep('uploading');
    setProgress(30);

    try {
      setProgress(60);
      const uploadRes = await fetch('/api/upload-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          content: fileContent,
          mapping,
          excludedRows: Array.from(excludedRows),
          dedupEnabled,
          aiMappings,
        }),
      });
      const uploadData = await uploadRes.json();
      if (!uploadData.success) throw new Error(uploadData.error || 'Upload failed');

      const { jobId } = uploadData.data;
      setProgress(90);
      setStep('processing');
      setProcessingJobId(jobId);

      const processRes = await fetch('/api/process-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      const processData = await processRes.json();
      if (!processData.success) toast.error(processData.error || 'Processing failed');
    } catch (err: any) {
      toast.error(err.message || 'Import failed');
      setStep('idle');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) startAnalysis(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) startAnalysis(f);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); };

  const toggleIssue = (key: string) => {
    setAcceptedIssues(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const acceptAllIssues = () => {
    if (!analysis) return;
    setAcceptedIssues(new Set(analysis.issues.map((_, i) => `issue-${i}`)));
  };

  const toggleExcludeRow = (rowIdx: number) => {
    setExcludedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowIdx)) next.delete(rowIdx); else next.add(rowIdx);
      return next;
    });
  };

  const typeBadge = (type: string) => {
    const colors: Record<string, string> = {
      date: 'bg-blue-100 text-blue-700',
      currency: 'bg-emerald-100 text-emerald-700',
      number: 'bg-indigo-100 text-indigo-700',
      text: 'bg-surface-100 text-surface-600',
      boolean: 'bg-purple-100 text-purple-700',
      percentage: 'bg-amber-100 text-amber-700',
      empty: 'bg-red-100 text-red-600',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[type] || colors.text}`}>
        {type}
      </span>
    );
  };

  const renderDropZone = () => (
    <div onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
      className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${dragOver ? 'border-primary-500 bg-primary-50/50' : 'border-surface-300 hover:border-surface-400 bg-surface-50/50'}`}>
      <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
      <div className="mb-4">
        <svg className="w-12 h-12 text-surface-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
      </div>
      <p className="text-base font-semibold text-surface-900 mb-1">Drop your CSV here, or click to browse</p>
      <p className="text-sm text-surface-500 mb-6">Supports any CSV format — columns are auto-detected</p>
      <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>Choose File</Button>
    </div>
  );

  const renderAnalyzing = () => (
    <div className="flex flex-col items-center py-12 space-y-4">
      <div className="animate-spin w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full" />
      <p className="text-sm font-medium text-surface-700">Analyzing your CSV...</p>
      <p className="text-xs text-surface-400">Scanning columns, detecting data types, checking for issues</p>
    </div>
  );

  const renderGenerating = () => (
    <div className="flex flex-col items-center py-12 space-y-4">
      <div className="animate-spin w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full" />
      <p className="text-sm font-medium text-surface-700">AI is analyzing your transactions...</p>
      <p className="text-xs text-surface-400">Generating accounts and classifying all rows</p>
    </div>
  );

  const renderPreviewTable = () => {
    if (!analysis || parsedRows.length === 0) return null;
    const headers = Object.keys(parsedRows[0]);
    const totalPreviewPages = Math.ceil(Math.min(parsedRows.length, 200) / PREVIEW_PAGE_SIZE);
    const page = Math.min(previewPage, totalPreviewPages - 1);
    const start = page * PREVIEW_PAGE_SIZE;
    const end = Math.min(start + PREVIEW_PAGE_SIZE, parsedRows.length, 200);
    const pageRows = parsedRows.slice(start, end);

    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-surface-700">
            Preview — {excludedRows.size} row{excludedRows.size !== 1 ? 's' : ''} excluded
          </h4>
          <span className="text-xs text-surface-400">Showing {start + 1}–{Math.min(end, parsedRows.length)} of {analysis.totalRows.toLocaleString()}</span>
        </div>
        <div className="overflow-x-auto border border-surface-200 rounded-lg">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface-100">
                <th className="sticky left-0 bg-surface-100 py-1.5 px-2 text-left font-medium text-surface-500 w-8">
                  <input
                    type="checkbox"
                    checked={pageRows.length > 0 && pageRows.every((_, i) => excludedRows.has(start + i + 1))}
                    onChange={() => setExcludedRows(prev => {
                      const next = new Set(prev);
                      const allExcluded = pageRows.every((_, i) => prev.has(start + i + 1));
                      for (let i = 0; i < pageRows.length; i++) {
                        if (allExcluded) next.delete(start + i + 1);
                        else next.add(start + i + 1);
                      }
                      return next;
                    })}
                  />
                </th>
                <th className="py-1.5 px-2 text-left font-medium text-surface-500 w-10">#</th>
                {headers.map(h => <th key={h} className="py-1.5 px-2 text-left font-medium text-surface-500 whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, i) => {
                const rowNum = start + i + 1;
                const excluded = excludedRows.has(rowNum);
                return (
                  <tr key={rowNum} className={`border-t border-surface-100 ${excluded ? 'bg-red-50 line-through text-surface-400' : 'hover:bg-surface-50'}`}>
                    <td className="sticky left-0 py-1.5 px-2 bg-inherit">
                      <input type="checkbox" checked={excluded} onChange={() => toggleExcludeRow(rowNum)} />
                    </td>
                    <td className="py-1.5 px-2 text-surface-400">{rowNum}</td>
                    {headers.map(h => <td key={h} className="py-1.5 px-2 max-w-[200px] truncate" title={row[h]}>{row[h]}</td>)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPreviewPages > 1 && (
          <div className="flex items-center justify-between mt-2">
            <div className="flex gap-1">
              {Array.from({ length: totalPreviewPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPreviewPage(i)}
                  className={`px-2 py-0.5 text-xs rounded ${page === i ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              onClick={() => { setExcludedRows(new Set()); setPreviewPage(0); }}
              className="text-xs text-primary-600 hover:underline"
            >
              Reset
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderReview = () => {
    if (!analysis) return null;
    const { columns, issues, mapping: autoMapping, sampleRows, totalRows, totalColumns } = analysis;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-surface-900">Data Preview & Cleaning</h3>
            <p className="text-sm text-surface-500">{totalRows.toLocaleString()} rows × {totalColumns} columns from <strong>{file?.name}</strong></p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={reset}>Cancel</Button>
            <Button type="button" size="sm" onClick={confirmImport}>
              Proceed with Import
            </Button>
          </div>
        </div>

        {issues.length > 0 && (
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-amber-800">
                {issues.length} issue{issues.length > 1 ? 's' : ''} found
              </h4>
              <button onClick={acceptAllIssues} className="text-xs text-amber-700 underline hover:no-underline">
                Accept All
              </button>
            </div>
            <div className="space-y-2">
              {issues.map((issue, i) => {
                const key = `issue-${i}`;
                const accepted = acceptedIssues.has(key);
                return (
                  <label key={key} className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer ${accepted ? 'bg-amber-100/50' : ''}`}>
                    <input type="checkbox" checked={accepted} onChange={() => toggleIssue(key)} className="mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={issue.type === 'null' ? 'danger' : issue.type === 'outlier' ? 'warning' : 'info'} size="sm">{issue.type}</Badge>
                        <span className="text-sm font-medium text-surface-700">{issue.column}</span>
                      </div>
                      <p className="text-xs text-surface-500 mt-1">{issue.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div className={`p-4 rounded-xl border ${classifiedCount > 0 ? 'bg-primary-50 border-primary-200' : 'bg-amber-50 border-amber-200'}`}>
          {classifiedCount > 0 ? (
            <>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-lg font-bold text-primary-700">{classifiedCount.toLocaleString()}</span>
                <span className="text-sm text-primary-600">rows auto-classified by AI</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-primary-500">
                <span className="inline-block px-2 py-0.5 bg-primary-100 rounded-full font-medium">Contra: Cash (1000)</span>
                <span>— offset account for all journal entries</span>
              </div>
              {generatedAccounts.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-xs text-primary-500 font-medium mr-1">✨ AI generated:</span>
                  {generatedAccounts.map(a => (
                    <span key={a.code} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                      {a.code} {a.name}
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-amber-800">AI classification requires Pro plan</p>
                <p className="text-xs text-amber-600 mt-0.5">Upgrade to auto-classify transactions. You can still import and manually categorize them.</p>
              </div>
              <a
                href="/pricing"
                className="shrink-0 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg hover:from-primary-400 hover:to-primary-500 transition-all duration-300"
              >
                Upgrade
              </a>
            </div>
          )}
        </div>

        {Object.keys(aiMappings).length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-surface-700 mb-3">AI-Assigned Accounts</h4>
            <div className="space-y-1 max-h-64 overflow-y-auto text-sm">
              {Object.entries(aiMappings).map(([desc, code]) => {
                const account = [...accountsList, ...generatedAccounts, ...FALLBACK_ACCOUNTS].find(a => a.code === code);
                return (
                  <div key={desc} className="flex items-center gap-3 px-3 py-1.5 bg-surface-50 rounded-lg border border-surface-200">
                    <span className="flex-1 text-surface-700 truncate">{desc}</span>
                    <span className="text-xs font-medium text-primary-600 whitespace-nowrap">{code} — {account?.name || code}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <details className="border border-surface-200 rounded-xl">
          <summary className="px-4 py-3 cursor-pointer text-sm font-semibold text-surface-700 hover:bg-surface-50 rounded-xl">
            Preview Rows ({totalRows.toLocaleString()} total)
          </summary>
          <div className="px-4 pb-4 pt-2">{renderPreviewTable()}</div>
        </details>

        {columns.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-surface-700 mb-3">
              Detected Columns ({columns.length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {columns.map((col) => (
                <div key={col.name} className="p-3 bg-surface-50 rounded-lg border border-surface-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-surface-900 truncate max-w-[200px]" title={col.name}>
                      {col.name}
                    </span>
                    {typeBadge(col.detectedType)}
                  </div>
                  <div className="text-xs text-surface-500 space-y-1">
                    {col.nullRate > 0 && <p>Empty: {col.nullCount}/{analysis.totalRows} ({(col.nullRate * 100).toFixed(0)}%)</p>}
                    <p>Unique: {col.uniqueCount.toLocaleString()}</p>
                    {col.sampleValues.length > 0 && (
                      <p>Sample: {col.sampleValues.slice(0, 3).map(v => `"${v}"`).join(', ')}</p>
                    )}
                    {col.min !== undefined && col.max !== undefined && (
                      <p>Range: {col.min.toLocaleString()} – {col.max.toLocaleString()}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl border border-surface-200">
          <input
            type="checkbox"
            id="dedupToggle"
            checked={dedupEnabled}
            onChange={e => setDedupEnabled(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="dedupToggle" className="text-sm text-surface-700 cursor-pointer">
            <span className="font-medium">Skip duplicates</span>
            <span className="text-surface-400 ml-1">— fuzzy match on description + date (85% similarity)</span>
          </label>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-surface-700 mb-3">Auto-detected Column Mapping</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200">
                  <th className="text-left py-2 pr-4 font-medium text-surface-600">Bookkeeping Field</th>
                  <th className="text-left py-2 pr-4 font-medium text-surface-600">CSV Column</th>
                  <th className="text-left py-2 font-medium text-surface-600"></th>
                </tr>
              </thead>
              <tbody className="text-surface-700">
                {[
                  ['Date', 'dateColumn'],
                  ['Revenue/Income', 'amountColumn'],
                  ['Expense/Cost', 'costColumn'],
                  ['Description', 'descriptionColumn'],
                  ['Category', 'categoryColumn'],
                  ['Order/Transaction ID', 'idColumn'],
                  ['Quantity', 'quantityColumn'],
                ].map(([label, key]) => (
                  <tr key={key} className="border-b border-surface-100">
                    <td className="py-2 pr-4 font-medium">{label}</td>
                    <td className="py-2 pr-4">
                      {mapping[key] ? (
                        <span className="text-primary-600 font-medium">{mapping[key]}</span>
                      ) : (
                        <span className="text-surface-400 italic">Not detected</span>
                      )}
                    </td>
                    <td className="py-2">
                      <select
                        value={mapping[key] || ''}
                        onChange={(e) => setMapping({ ...mapping, [key]: e.target.value })}
                        className="text-xs border border-surface-200 rounded px-2 py-1 bg-white"
                      >
                        <option value="">—</option>
                        {columns.map(c => (
                          <option key={c.name} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const percent = job && (job.totalRows || 0) > 0 ? Math.round(((job.processedRows || 0) / (job.totalRows || 1)) * 100) : 0;

  const renderProcessing = () => (
    <div className="space-y-4 p-6 bg-surface-50 rounded-xl border border-surface-200">
      <div className="flex items-center gap-3">
        <div className="animate-spin w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full" />
        <div>
          <p className="text-sm font-medium text-surface-700">Processing {job?.fileName || file?.name}</p>
          <p className="text-xs text-surface-400">
            {(job?.processedRows || 0).toLocaleString()} rows processed
            {(job?.totalRows || 0) > 0 && ` of ${(job?.totalRows || 0).toLocaleString()}`}
          </p>
        </div>
        <Badge variant="primary" size="sm" className="ml-auto">{percent}%</Badge>
      </div>
      <div className="bg-surface-200 rounded-full h-2 overflow-hidden">
        <div className="h-full bg-primary-600 rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
      </div>
      {job && (
        <div className="grid grid-cols-4 gap-4 text-center text-sm">
          <div><p className="font-semibold text-surface-900">{(job.importedEntries || 0).toLocaleString()}</p><p className="text-surface-500">Imported</p></div>
          <div><p className="font-semibold text-surface-900">{(job.skippedRows || 0).toLocaleString()}</p><p className="text-surface-500">Skipped</p></div>
          <div><p className="font-semibold text-surface-900">{(job.duplicatesSkipped || 0).toLocaleString()}</p><p className="text-surface-500">Duplicates</p></div>
          <div><p className="font-semibold text-amber-600">{job.errors?.length || 0}</p><p className="text-surface-500">Errors</p></div>
        </div>
      )}
    </div>
  );

  const renderCompleted = () => (
    <div className="space-y-4 p-6 bg-emerald-50 rounded-xl border border-emerald-200">
      <div className="flex items-center gap-2">
        <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-semibold text-emerald-900">Import Complete</h3>
      </div>
      {job && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center text-sm">
            <div><p className="text-2xl font-bold text-emerald-700">{(job.importedEntries || 0).toLocaleString()}</p><p className="text-emerald-600">Entries</p></div>
            <div><p className="text-2xl font-bold text-surface-700">{((job.totalRows) || ((job.processedRows || 0) + (job.skippedRows || 0))).toLocaleString()}</p><p className="text-surface-500">Rows</p></div>
            <div><p className="text-2xl font-bold text-surface-700">{(job.skippedRows || 0).toLocaleString()}</p><p className="text-surface-500">Skipped</p></div>
            <div><p className="text-2xl font-bold text-amber-600">{(job.duplicatesSkipped || 0).toLocaleString()}</p><p className="text-amber-600">Duplicates</p></div>
            <div><p className="text-2xl font-bold text-amber-600">{job.errors?.length || 0}</p><p className="text-surface-500">Errors</p></div>
          </div>
          {(job.duplicateRows?.length || 0) > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-amber-700 font-medium">
                View {job.duplicateRows!.length} duplicate row{job.duplicateRows!.length !== 1 ? 's' : ''}
              </summary>
              <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                {job.duplicateRows!.map((d, i) => (
                  <p key={i} className="text-surface-600">Row {d.row}: "{d.description}" ≈ "{d.matchedDescription}" ({d.date})</p>
                ))}
              </div>
            </details>
          )}
          {(job.errors?.length || 0) > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-amber-700 font-medium">
                View {(job.errors?.length || 0) > 10 ? 'last 10' : job.errors?.length || 0} error{(job.errors?.length || 0) !== 1 ? 's' : ''}
              </summary>
              <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                {(job.errors || []).slice(-10).map((err, i) => (
                  <p key={i} className="text-surface-600">Row {err.row}: {err.reason}</p>
                ))}
              </div>
            </details>
          )}
        </>
      )}
      <Button type="button" variant="secondary" onClick={reset}>Import Another File</Button>
      <Button type="button" variant="danger" onClick={() => job?._id && handleDeleteJob(job._id)} disabled={deletingId === job?._id}>
        {deletingId === job?._id ? 'Deleting...' : 'Delete This Import'}
      </Button>
    </div>
  );

  const renderFailed = () => (
    <div className="space-y-4 p-6 bg-red-50 rounded-xl border border-red-200">
      <div className="flex items-center gap-2">
        <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-semibold text-red-900">Import Failed</h3>
      </div>
      <p className="text-sm text-red-600">{job?.errors?.[0]?.reason || 'An unknown error occurred'}</p>
      <Button type="button" variant="secondary" onClick={reset}>Try Again</Button>
    </div>
  );

  return (
    <Card padding="lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-lg bg-primary-50 text-primary-600">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-surface-900">Import Transactions</h2>
          <p className="text-sm text-surface-500">
            {step === 'review' ? 'Review AI-classified accounts before importing' : step === 'generating' ? 'AI is analyzing and classifying your transactions...' : 'Upload a bank statement or sales CSV — AI auto-classifies everything'}
          </p>
        </div>
      </div>

      {step === 'idle' && renderDropZone()}
      {step === 'analyzing' && renderAnalyzing()}
      {step === 'generating' && renderGenerating()}
      {step === 'review' && renderReview()}
      {(step === 'uploading' || step === 'processing') && renderProcessing()}
      {step === 'completed' && renderCompleted()}
      {step === 'failed' && renderFailed()}

      {step === 'idle' && (
        <div className="mt-6 p-5 bg-surface-50 rounded-xl border border-surface-200">
          <h3 className="text-sm font-semibold text-surface-700 mb-3">How it works</h3>
          <div className="space-y-2 text-sm text-surface-500">
            <p>1. Drop any CSV (bank statement, sales report, or export) — AI detects columns automatically</p>
            <p>2. AI analyzes descriptions and generates new accounts for unrecognized patterns</p>
            <p>3. Review transactions, assign accounts, override if needed</p>
            <p>4. Confirm — server creates journal entries with proper double-entry</p>
            <p>5. Open Reports to view P&L, Balance Sheet, Cash Flow, or download Excel</p>
          </div>
        </div>
      )}

      <div className="mt-6">
        <button
          onClick={() => { setHistoryOpen(o => !o); if (!historyOpen) fetchHistory(); }}
          className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
        >
          {historyOpen ? 'Hide' : 'Show'} Import History ({history.length})
        </button>
        {historyOpen && historyLoading && (
          <div className="mt-3 flex items-center justify-center py-4">
            <div className="animate-spin w-5 h-5 border-4 border-primary-600 border-t-transparent rounded-full" />
          </div>
        )}
        {historyOpen && !historyLoading && history.length > 0 && (
          <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
            {history.map(h => (
              <div key={h._id} className="flex items-center justify-between p-3 bg-surface-50 rounded-lg border border-surface-200 text-sm">
                <div>
                  <p className="font-medium text-surface-800">{h.fileName}</p>
                  <p className="text-surface-500">{new Date(h.createdAt).toLocaleDateString()} &middot; {(h.importedEntries || h.processedRows || 0).toLocaleString()} entries</p>
                </div>
                <Button variant="danger" size="sm" onClick={() => handleDeleteJob(h._id)} disabled={deletingId === h._id}>
                  {deletingId === h._id ? '...' : 'Delete'}
                </Button>
              </div>
            ))}
          </div>
        )}
        {historyOpen && !historyLoading && history.length === 0 && (
          <p className="mt-3 text-sm text-surface-500">No imports yet.</p>
        )}
      </div>
    </Card>
  );
}

interface ImportCSVProps {
  userId: string;
}