import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { Card } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import toast from 'react-hot-toast';

type ReportData = {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  entryCount: number;
  topCategories: { category: string; amount: number; count: number }[];
  dateRange: { start: string; end: string };
};

interface ReportPanelProps {
  userName: string;
}

async function getAuthToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken();
}

async function fetchReport(payload: Record<string, unknown>) {
  const token = await getAuthToken();
  const res = await fetch('/api/send-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export default function ReportPanel({ userName }: ReportPanelProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ReportData | null>(null);
  const [sent, setSent] = useState(false);

  const handlePreview = async () => {
    setLoading(true);
    setPreview(null);
    try {
      const json = await fetchReport({ ownerName: userName });
      if (json.success) {
        setPreview(json.data);
      } else {
        toast.error(json.error || 'Failed to generate report');
      }
    } catch {
      toast.error('Network error generating report');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    setLoading(true);
    setSent(false);
    try {
      const json = await fetchReport({ email: email.trim(), ownerName: userName });
      if (json.success) {
        setSent(true);
        setPreview(json.data);
        toast.success('Report sent!');
      } else {
        toast.error(json.error || 'Failed to send report');
      }
    } catch {
      toast.error('Network error sending report');
    } finally {
      setLoading(false);
    }
  };

  const currency = (v: number) => v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  return (
    <div className="space-y-6 animate-fade-in">
      <Card padding="lg">
        <h2 className="text-lg font-semibold text-surface-900 mb-2">Send Report</h2>
        <p className="text-sm text-surface-500 mb-6">
          Generate a summary of all your ledger data and email it to yourself or a client.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              type="email"
              placeholder="recipient@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handlePreview} loading={loading && !email}>
              Preview
            </Button>
            <Button onClick={handleSend} loading={loading && !!email}>
              Send Report
            </Button>
          </div>
        </div>
      </Card>

      {sent && (
        <Card padding="md" className="bg-emerald-50 border-emerald-200 text-emerald-800">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm font-medium">Report sent to {email}</p>
          </div>
        </Card>
      )}

      {preview && (
        <Card padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-surface-900">Report Preview</h3>
            <span className="text-xs text-surface-400">
              {preview.dateRange.start} – {preview.dateRange.end}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-surface-50 rounded-lg p-4 text-center">
              <p className="text-xs text-surface-500 uppercase tracking-wider">Revenue</p>
              <p className="text-xl font-bold text-emerald-600 mt-1">{currency(preview.totalRevenue)}</p>
            </div>
            <div className="bg-surface-50 rounded-lg p-4 text-center">
              <p className="text-xs text-surface-500 uppercase tracking-wider">Expenses</p>
              <p className="text-xl font-bold text-red-500 mt-1">{currency(preview.totalExpenses)}</p>
            </div>
            <div className="bg-surface-50 rounded-lg p-4 text-center">
              <p className="text-xs text-surface-500 uppercase tracking-wider">Net Profit</p>
              <p className={`text-xl font-bold mt-1 ${preview.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {currency(preview.netProfit)}
              </p>
            </div>
            <div className="bg-surface-50 rounded-lg p-4 text-center">
              <p className="text-xs text-surface-500 uppercase tracking-wider">Margin</p>
              <p className="text-xl font-bold text-primary-600 mt-1">{preview.profitMargin.toFixed(1)}%</p>
            </div>
          </div>
          <div className="mt-4 bg-surface-50 rounded-lg p-4 text-center">
            <p className="text-xs text-surface-500 uppercase tracking-wider">Total Entries</p>
            <p className="text-lg font-semibold text-surface-900 mt-1">{preview.entryCount}</p>
          </div>
          {preview.topCategories.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-surface-700 mb-3">Top Categories</h4>
              <div className="space-y-2">
                {preview.topCategories.map((cat) => (
                  <div key={cat.category} className="flex items-center justify-between bg-surface-50 rounded-lg px-4 py-2.5">
                    <span className="text-sm font-medium text-surface-700 capitalize">{cat.category}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-surface-400">{cat.count} entries</span>
                      <span className="text-sm font-semibold text-surface-900">{currency(cat.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
