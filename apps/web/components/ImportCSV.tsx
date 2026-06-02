import { useState, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Card, Button } from '@/components/ui';
import toast from 'react-hot-toast';
import Papa from 'papaparse';

interface ImportCSVProps {
  userId: string;
}

export default function ImportCSV({ userId }: ImportCSVProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetLoading = () => {
    setLoading(false);
    setProgress(0);
  };

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setLoading(true);
    setProgress(0);

    const toastId = toast.loading('Parsing CSV...');

    try {
      const parsed = await new Promise<Papa.ParseResult<Record<string, string>>>((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results as Papa.ParseResult<Record<string, string>>),
          error: (error) => reject(error),
        });
      });

      const rows = parsed.data;
      let imported = 0;
      let skipped = 0;
      const total = rows.length;

      if (total === 0) {
        toast.dismiss(toastId);
        toast.error('CSV file is empty');
        resetLoading();
        return;
      }

      for (let i = 0; i < total; i++) {
        const row = rows[i];
        if (!row['Order Date'] || (!row['Total Revenue'] && !row['Total Cost'])) {
          skipped++;
          continue;
        }

        try {
          const orderDate = row['Order Date'];
          const revenue = parseFloat(row['Total Revenue'] || '0');
          const cost = parseFloat(row['Total Cost'] || '0');
          const itemType = row['Item Type'] || 'Other';
          const orderId = row['Order ID'] || '';

          if (revenue > 0) {
            await addDoc(collection(db, 'ledger_entries'), {
              userId,
              date: orderDate,
              description: `${itemType} - ${orderId}`,
              category: itemType.toLowerCase(),
              amount: revenue,
              type: 'income',
              note: `Channel: ${row['Sales Channel'] || ''}, Region: ${row['Region'] || ''}`,
              source: file.name,
              importedAt: new Date().toISOString(),
            });
            imported++;
          }

          if (cost > 0) {
            await addDoc(collection(db, 'ledger_entries'), {
              userId,
              date: orderDate,
              description: `${itemType} (Cost) - ${orderId}`,
              category: 'cost of goods',
              amount: -cost,
              type: 'expense',
              note: `Channel: ${row['Sales Channel'] || ''}, Region: ${row['Region'] || ''}`,
              source: file.name,
              importedAt: new Date().toISOString(),
            });
            imported++;
          }
        } catch {
          skipped++;
        }

        setProgress(Math.round(((i + 1) / total) * 100));
      }

      toast.dismiss(toastId);
      toast.success(`Imported ${imported} entries, skipped ${skipped}`);
      resetLoading();

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      toast.dismiss(toastId);
      toast.error(error?.message || 'Import failed');
      resetLoading();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  return (
    <Card padding="lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-lg bg-primary-50 text-primary-600">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-surface-900">Import Sales Data</h2>
          <p className="text-sm text-surface-500">Upload a CSV file to add ledger entries</p>
        </div>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${
          dragOver
            ? 'border-primary-500 bg-primary-50/50'
            : 'border-surface-300 hover:border-surface-400 bg-surface-50/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          disabled={loading}
          className="hidden"
        />

        {loading ? (
          <div className="space-y-4">
            <div className="animate-spin w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full mx-auto" />
            <div>
              <p className="text-sm font-medium text-surface-700">Processing file...</p>
              <p className="text-xs text-surface-400 mt-1">Importing {progress}%</p>
            </div>
            <div className="max-w-xs mx-auto bg-surface-200 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-primary-600 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <svg className="w-12 h-12 text-surface-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            </div>
            <p className="text-base font-semibold text-surface-900 mb-1">
              Drop your CSV here, or click to browse
            </p>
            <p className="text-sm text-surface-500 mb-6">
              Supports .csv files with sales data
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              Choose File
            </Button>
          </>
        )}
      </div>

      <div className="mt-6 p-5 bg-surface-50 rounded-xl border border-surface-200">
        <h3 className="text-sm font-semibold text-surface-700 mb-3">Required CSV format</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200">
                <th className="text-left py-2 pr-4 font-medium text-surface-600">Column</th>
                <th className="text-left py-2 pr-4 font-medium text-surface-600">Required</th>
                <th className="text-left py-2 font-medium text-surface-600">Example</th>
              </tr>
            </thead>
            <tbody className="text-surface-500">
              <tr className="border-b border-surface-100">
                <td className="py-2 pr-4 font-medium text-surface-700">Order Date</td>
                <td className="py-2 pr-4">Yes</td>
                <td className="py-2 font-mono text-xs">2024-06-01</td>
              </tr>
              <tr className="border-b border-surface-100">
                <td className="py-2 pr-4 font-medium text-surface-700">Total Revenue</td>
                <td className="py-2 pr-4">Yes</td>
                <td className="py-2 font-mono text-xs">150.00</td>
              </tr>
              <tr className="border-b border-surface-100">
                <td className="py-2 pr-4 font-medium text-surface-700">Total Cost</td>
                <td className="py-2 pr-4">Yes</td>
                <td className="py-2 font-mono text-xs">75.00</td>
              </tr>
              <tr className="border-b border-surface-100">
                <td className="py-2 pr-4 font-medium text-surface-700">Item Type</td>
                <td className="py-2 pr-4">No</td>
                <td className="py-2 font-mono text-xs">Beverages</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium text-surface-700">Order ID</td>
                <td className="py-2 pr-4">No</td>
                <td className="py-2 font-mono text-xs">ORD001</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
