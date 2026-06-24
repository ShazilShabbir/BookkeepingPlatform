import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui';
import { useFeatureGate } from '@/lib/useFeatureGate';
import toast from 'react-hot-toast';

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
  createdAt: string;
  updatedAt: string;
}

interface CustomReportListProps {
  userId: string;
  onEdit: (report: ReportData) => void;
  onView: (report: ReportData) => void;
}

export default function CustomReportList({ userId, onEdit, onView }: CustomReportListProps) {
  const { allowed } = useFeatureGate(userId, 'custom-reports');
  const [reports, setReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports/custom');
      const json = await res.json();
      if (json.success) setReports(json.data);
    } catch {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (allowed) fetchReports(); else { setLoading(false); } }, [allowed, fetchReports]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this report?')) return;
    try {
      const res = await fetch(`/api/reports/custom/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        toast.success('Report deleted');
        fetchReports();
      } else toast.error(json.error || 'Failed to delete');
    } catch {
      toast.error('Failed to delete');
    }
  };

  if (!allowed) {
    return (
      <Card>
        <div className="p-6 text-center text-surface-500">
          <p>Custom reports require a Pro plan or higher.</p>
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <div className="p-6 text-center">
          <div className="animate-spin w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full mx-auto" />
        </div>
      </Card>
    );
  }

  if (reports.length === 0) {
    return (
      <Card>
        <div className="p-6 text-center text-surface-500">
          <p className="mb-4">No custom reports yet.</p>
          <button onClick={() => onEdit({ _id: '', name: '', sections: [], createdAt: '', updatedAt: '' })} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">
            Create Your First Report
          </button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-surface-900">Custom Reports</h3>
        <button onClick={() => onEdit({ _id: '', name: '', sections: [], createdAt: '', updatedAt: '' })} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">
          + New Report
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <Card key={report._id}>
            <div className="p-4">
              <h4 className="font-medium text-surface-900 truncate">{report.name}</h4>
              <p className="text-xs text-surface-400 mt-1">{report.sections?.length || 0} section(s)</p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => onView(report)} className="px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 text-xs font-medium">
                  View
                </button>
                <button onClick={() => onEdit(report)} className="px-3 py-1.5 bg-surface-50 text-surface-600 rounded-lg hover:bg-surface-100 text-xs font-medium">
                  Edit
                </button>
                <button onClick={() => handleDelete(report._id)} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-xs font-medium">
                  Delete
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
