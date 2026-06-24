import { useState, useCallback } from 'react';
import { Button } from '@/components/ui';
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

interface CustomReportBuilderProps {
  report: ReportData;
  userId: string;
  onSaved: () => void;
  onCancel: () => void;
}

const SECTION_TYPES = [
  { value: 'profit-loss', label: 'Profit & Loss' },
  { value: 'balance-sheet', label: 'Balance Sheet' },
  { value: 'cash-flow', label: 'Cash Flow' },
  { value: 'trial-balance', label: 'Trial Balance' },
  { value: 'budget-vs-actual', label: 'Budget vs Actual' },
  { value: 'category-breakdown', label: 'Category Breakdown' },
  { value: 'trend', label: 'Trend Chart' },
  { value: 'kpi-summary', label: 'KPI Summary' },
];

const CHART_TYPES = [
  { value: 'table', label: 'Table' },
  { value: 'bar', label: 'Bar Chart' },
  { value: 'line', label: 'Line Chart' },
  { value: 'pie', label: 'Pie Chart' },
  { value: 'area', label: 'Area Chart' },
];

let sectionIdCounter = Date.now();
const genId = () => `section_${sectionIdCounter++}`;

export default function CustomReportBuilder({ report, userId, onSaved, onCancel }: CustomReportBuilderProps) {
  const [name, setName] = useState(report.name || '');
  const [sections, setSections] = useState<ReportSection[]>(report.sections?.length ? report.sections : []);
  const [saving, setSaving] = useState(false);

  const isEditing = !!report._id;

  const addSection = () => {
    setSections(prev => [...prev, { id: genId(), type: 'kpi-summary', chartType: 'table', title: 'New Section' }]);
  };

  const updateSection = (id: string, field: string, value: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const removeSection = (id: string) => {
    setSections(prev => prev.filter(s => s.id !== id));
  };

  const moveSection = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= sections.length) return;
    const copy = [...sections];
    [copy[idx], copy[target]] = [copy[target], copy[idx]];
    setSections(copy);
  };

  const handleSave = useCallback(async () => {
    if (!name.trim()) { toast.error('Report name required'); return; }
    setSaving(true);
    try {
      const payload = { name: name.trim(), sections: sections.map(s => ({ ...s, title: s.title || s.type })) };
      const url = isEditing ? `/api/reports/custom/${report._id}` : '/api/reports/custom';
      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (json.success) {
        toast.success(isEditing ? 'Report updated' : 'Report created');
        onSaved();
      } else {
        toast.error(json.error || 'Save failed');
      }
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  }, [name, sections, isEditing, report._id, onSaved]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-surface-900">{isEditing ? 'Edit Report' : 'Create Report'}</h3>
        <div className="flex gap-2">
          <Button onClick={onCancel} variant="secondary">Cancel</Button>
          <Button onClick={handleSave} loading={saving}>{isEditing ? 'Update' : 'Save'}</Button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-surface-700 mb-1">Report Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Monthly Financial Summary"
          className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-surface-700">Sections</h4>
          <button onClick={addSection} className="px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 text-xs font-medium">
            + Add Section
          </button>
        </div>

        {sections.length === 0 && (
          <p className="text-sm text-surface-400 text-center py-4">No sections yet. Click "Add Section" to start building.</p>
        )}

        {sections.map((section, idx) => (
          <div key={section.id} className="border border-surface-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-surface-400 font-mono">Section {idx + 1}</span>
              <div className="flex gap-1">
                <button onClick={() => moveSection(idx, -1)} disabled={idx === 0} className="p-1 text-surface-400 hover:text-surface-600 disabled:opacity-30">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                </button>
                <button onClick={() => moveSection(idx, 1)} disabled={idx === sections.length - 1} className="p-1 text-surface-400 hover:text-surface-600 disabled:opacity-30">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                <button onClick={() => removeSection(section.id)} className="p-1 text-red-400 hover:text-red-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-surface-500 mb-1">Title</label>
                <input
                  type="text"
                  value={section.title}
                  onChange={e => updateSection(section.id, 'title', e.target.value)}
                  className="w-full px-2 py-1.5 border border-surface-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-surface-500 mb-1">Report Type</label>
                <select
                  value={section.type}
                  onChange={e => updateSection(section.id, 'type', e.target.value)}
                  className="w-full px-2 py-1.5 border border-surface-300 rounded text-sm"
                >
                  {SECTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-surface-500 mb-1">Chart Type</label>
                <select
                  value={section.chartType}
                  onChange={e => updateSection(section.id, 'chartType', e.target.value)}
                  className="w-full px-2 py-1.5 border border-surface-300 rounded text-sm"
                >
                  {CHART_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-surface-500 mb-1">Metric</label>
                <select
                  value={section.metric || ''}
                  onChange={e => updateSection(section.id, 'metric', e.target.value)}
                  className="w-full px-2 py-1.5 border border-surface-300 rounded text-sm"
                >
                  <option value="">Auto</option>
                  <option value="revenue">Revenue</option>
                  <option value="expenses">Expenses</option>
                  <option value="profit">Profit</option>
                  <option value="count">Entry Count</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-surface-500 mb-1">Group By</label>
                <select
                  value={section.groupBy || ''}
                  onChange={e => updateSection(section.id, 'groupBy', e.target.value)}
                  className="w-full px-2 py-1.5 border border-surface-300 rounded text-sm"
                >
                  <option value="">None</option>
                  <option value="month">Month</option>
                  <option value="category">Category</option>
                  <option value="account">Account</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
