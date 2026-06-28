import { useState, useEffect, useCallback } from 'react';
import { Card, Button } from '@/components/ui';
import { formatCurrency, formatCurrencyCompact } from '@/lib/format';
import toast from 'react-hot-toast';
import { useSession } from 'next-auth/react';

interface ReportSection {
  id: string;
  type: string;
  chartType: string;
  title: string;
  metric?: string;
  groupBy?: string;
}

interface ReportData {
  _id: string;
  name: string;
  sections: ReportSection[];
}

interface SectionRow {
  category?: string;
  accountCode?: string;
  accountName?: string;
  amount: number;
  percentage?: number;
  count?: number;
  balance?: number;
  budget?: number;
  variance?: number;
}

interface CustomReportViewerProps {
  report: ReportData;
  userId: string;
  onBack: () => void;
}

export default function CustomReportViewer({ report, userId, onBack }: CustomReportViewerProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [baseCurrency, setBaseCurrency] = useState('USD');

  const genData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/custom/${report._id}/generate`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        if (json.data?.baseCurrency) setBaseCurrency(json.data.baseCurrency);
      }
      else setError(json.error || 'Generation failed');
    } catch {
      setError('Generation failed');
    } finally {
      setLoading(false);
    }
  }, [report._id]);

  useEffect(() => { genData(); }, [genData]);

  const handleExportPdf = async () => {
    setPdfLoading(true);
    try {
      const res = await fetch('/api/reports/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error || 'Failed to generate PDF');
      }
      const binary = atob(body.pdf);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.name.replace(/\s+/g, '_')}_report.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF exported');
    } catch (err: any) {
      toast.error(err.message || 'Failed to export PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!data) return;
    const rows: string[] = ['Section,Field,Value'];
    if (data.kpis) {
      rows.push(`KPIs,Total Revenue,${data.kpis.totalRevenue}`);
      rows.push(`KPIs,Total Expenses,${data.kpis.totalExpenses}`);
      rows.push(`KPIs,Net Profit,${data.kpis.netProfit}`);
      rows.push(`KPIs,Profit Margin,${data.kpis.profitMargin}%`);
    }
    if (data.revenueByCategory) {
      data.revenueByCategory.forEach((r: any) => rows.push(`Revenue,${r.category},${r.amount}`));
    }
    if (data.expensesByCategory) {
      data.expensesByCategory.forEach((r: any) => rows.push(`Expenses,${r.category},${r.amount}`));
    }
    if (data.monthlyTrend) {
      data.monthlyTrend.forEach((r: any) => rows.push(`Trend,${r.month},${r.revenue}|${r.expenses}|${r.profit}`));
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.name.replace(/\s+/g, '_')}_report.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto" />
        <p className="mt-3 text-surface-500 text-sm">Generating report...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={genData}>Retry</Button>
            <Button onClick={onBack} variant="secondary">Back</Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <button onClick={onBack} className="text-sm text-primary-600 hover:text-primary-700 mb-1 inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back
          </button>
          <h3 className="text-xl font-semibold text-surface-900">{data?.reportName || report.name}</h3>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportPdf} loading={pdfLoading} variant="secondary">Download PDF</Button>
          <Button onClick={handleExportCSV}>Export CSV</Button>
        </div>
      </div>

      {data?.kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card><div className="p-3"><p className="text-xs text-surface-500">Revenue</p><p className="text-lg font-semibold text-green-600">{formatCurrencyCompact(data.kpis.totalRevenue, baseCurrency)}</p></div></Card>
          <Card><div className="p-3"><p className="text-xs text-surface-500">Expenses</p><p className="text-lg font-semibold text-red-600">{formatCurrencyCompact(data.kpis.totalExpenses, baseCurrency)}</p></div></Card>
          <Card><div className="p-3"><p className="text-xs text-surface-500">Net Profit</p><p className={`text-lg font-semibold ${data.kpis.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrencyCompact(data.kpis.netProfit, baseCurrency)}</p></div></Card>
          <Card><div className="p-3"><p className="text-xs text-surface-500">Margin</p><p className="text-lg font-semibold text-surface-900">{data.kpis.profitMargin}%</p></div></Card>
        </div>
      )}

      {data?.revenueByCategory && data.revenueByCategory.length > 0 && (
        <Card>
          <div className="p-4">
            <h4 className="font-medium text-surface-900 mb-3">Revenue by Category</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-surface-500 border-b border-surface-200">
                    <th scope="col" className="pb-2 font-medium">Category</th>
                    <th scope="col" className="pb-2 font-medium text-right">Amount</th>
                    <th scope="col" className="pb-2 font-medium text-right">Count</th>
                    <th scope="col" className="pb-2 font-medium text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {data.revenueByCategory.map((r: any) => (
                    <tr key={r.category} className="border-b border-surface-100">
                      <td className="py-2 text-surface-900">{r.category}</td>
                      <td className="py-2 text-right text-green-600">{formatCurrencyCompact(r.amount, baseCurrency)}</td>
                      <td className="py-2 text-right text-surface-600">{r.count}</td>
                      <td className="py-2 text-right text-surface-600">{r.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {data?.expensesByCategory && data.expensesByCategory.length > 0 && (
        <Card>
          <div className="p-4">
            <h4 className="font-medium text-surface-900 mb-3">Expenses by Category</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-surface-500 border-b border-surface-200">
                    <th scope="col" className="pb-2 font-medium">Category</th>
                    <th scope="col" className="pb-2 font-medium text-right">Amount</th>
                    <th scope="col" className="pb-2 font-medium text-right">Count</th>
                    <th scope="col" className="pb-2 font-medium text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {data.expensesByCategory.map((r: any) => (
                    <tr key={r.category} className="border-b border-surface-100">
                      <td className="py-2 text-surface-900">{r.category}</td>
                      <td className="py-2 text-right text-red-600">{formatCurrencyCompact(r.amount, baseCurrency)}</td>
                      <td className="py-2 text-right text-surface-600">{r.count}</td>
                      <td className="py-2 text-right text-surface-600">{r.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {data?.monthlyTrend && data.monthlyTrend.length > 0 && (
        <Card>
          <div className="p-4">
            <h4 className="font-medium text-surface-900 mb-3">Monthly Trend</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-surface-500 border-b border-surface-200">
                    <th scope="col" className="pb-2 font-medium">Month</th>
                    <th scope="col" className="pb-2 font-medium text-right">Revenue</th>
                    <th scope="col" className="pb-2 font-medium text-right">Expenses</th>
                    <th scope="col" className="pb-2 font-medium text-right">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {data.monthlyTrend.map((r: any) => (
                    <tr key={r.month} className="border-b border-surface-100">
                      <td className="py-2 text-surface-900">{r.month}</td>
                      <td className="py-2 text-right text-green-600">{formatCurrencyCompact(r.revenue, baseCurrency)}</td>
                      <td className="py-2 text-right text-red-600">{formatCurrencyCompact(r.expenses, baseCurrency)}</td>
                      <td className={`py-2 text-right ${r.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrencyCompact(r.profit, baseCurrency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {(!data?.kpis && !data?.revenueByCategory && !data?.expensesByCategory && !data?.monthlyTrend) && (
        <Card>
          <div className="p-6 text-center text-surface-500">
            <p>No data available for this report configuration.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
