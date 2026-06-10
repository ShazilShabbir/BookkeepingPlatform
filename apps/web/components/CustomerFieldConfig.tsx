import { useState, useEffect } from 'react';
import { Card, Button, Input } from '@/components/ui';
import toast from 'react-hot-toast';

type CustomField = {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean';
  required: boolean;
  csvColumn: string | null;
};

type CsvMapping = {
  dateColumn: string;
  amountColumn: string;
  amountColumn2?: string;
  descriptionColumn?: string;
  categoryColumn?: string;
  amountMode: 'single_with_sign' | 'revenue_and_cost' | 'debit_credit';
};

interface CustomerFieldConfigProps {
  customerUid: string;
  customerName: string;
  onClose: () => void;
}

async function api(path: string, options?: RequestInit) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  return res.json();
}

let fieldIdCounter = 0;
function newFieldId() {
  fieldIdCounter++;
  return `field_${Date.now()}_${fieldIdCounter}`;
}

const FIELD_TYPES = ['text', 'number', 'date', 'boolean'] as const;

export default function CustomerFieldConfig({ customerUid, customerName, onClose }: CustomerFieldConfigProps) {
  const [csvMapping, setCsvMapping] = useState<CsvMapping>({
    dateColumn: '',
    amountColumn: '',
    amountMode: 'single_with_sign',
  });
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const json = await api(`/api/customers?uid=${customerUid}`);
        if (json.success) {
          if (json.data.csvMapping) setCsvMapping(json.data.csvMapping);
          if (json.data.customFields) setCustomFields(json.data.customFields);
        }
      } catch {
        toast.error('Failed to load config');
      } finally {
        setLoading(false);
      }
    })();
  }, [customerUid]);

  const addField = () => {
    setCustomFields([...customFields, { id: newFieldId(), label: '', type: 'text', required: false, csvColumn: null }]);
  };

  const updateField = (id: string, key: keyof CustomField, value: unknown) => {
    setCustomFields(customFields.map((f) => (f.id === id ? { ...f, [key]: value } : f)));
  };

  const removeField = (id: string) => {
    setCustomFields(customFields.filter((f) => f.id !== id));
  };

  const updateMapping = (key: keyof CsvMapping, value: unknown) => {
    setCsvMapping({ ...csvMapping, [key]: value });
  };

  const save = async () => {
    setSaving(true);
    try {
      const json = await api('/api/customers', {
        method: 'PUT',
        body: JSON.stringify({
          customerUid,
          csvMapping,
          customFields: customFields.filter((f) => f.label.trim()),
        }),
      });
      if (json.success) {
        toast.success('Configuration saved');
        onClose();
      } else {
        toast.error(json.error || 'Failed to save');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card padding="lg">
        <div className="text-center py-8 text-surface-400">Loading configuration...</div>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Card padding="lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-surface-900">Field Configuration</h2>
            <p className="text-sm text-surface-500">Configure CSV mapping for <strong>{customerName}</strong></p>
          </div>
          <button onClick={onClose} className="p-1.5 text-surface-400 hover:text-surface-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <h3 className="text-sm font-semibold text-surface-700 mb-3">Column Mapping</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Date Column</label>
            <Input placeholder="e.g. Order Date, Date" value={csvMapping.dateColumn} onChange={(e) => updateMapping('dateColumn', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Amount Column</label>
            <Input placeholder="e.g. Total Revenue, Amount" value={csvMapping.amountColumn} onChange={(e) => updateMapping('amountColumn', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Second Amount Column (optional)</label>
            <Input placeholder="e.g. Total Cost" value={csvMapping.amountColumn2 || ''} onChange={(e) => updateMapping('amountColumn2', e.target.value || undefined)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Description Column (optional)</label>
            <Input placeholder="e.g. Item Type, Description" value={csvMapping.descriptionColumn || ''} onChange={(e) => updateMapping('descriptionColumn', e.target.value || undefined)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Category Column (optional)</label>
            <Input placeholder="e.g. Category, Department" value={csvMapping.categoryColumn || ''} onChange={(e) => updateMapping('categoryColumn', e.target.value || undefined)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Amount Mode</label>
            <select
              value={csvMapping.amountMode}
              onChange={(e) => updateMapping('amountMode', e.target.value)}
              className="flex h-10 w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="single_with_sign">Single column (+/- sign determines type)</option>
              <option value="revenue_and_cost">Revenue + Cost columns</option>
              <option value="debit_credit">Debit + Credit columns</option>
            </select>
          </div>
        </div>

        <h3 className="text-sm font-semibold text-surface-700 mb-3">Custom Fields</h3>
        <p className="text-xs text-surface-400 mb-4">
          Extra fields stored as metadata on each entry. Map them to CSV columns during import.
        </p>

        {customFields.length === 0 && (
          <div className="text-center py-6 bg-surface-50 rounded-lg mb-4">
            <p className="text-sm text-surface-400">No custom fields defined yet.</p>
          </div>
        )}

        <div className="space-y-3 mb-4">
          {customFields.map((field) => (
            <div key={field.id} className="flex items-center gap-3 bg-surface-50 rounded-lg px-4 py-3">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                <Input
                  placeholder="Field label"
                  value={field.label}
                  onChange={(e) => updateField(field.id, 'label', e.target.value)}
                />
                <select
                  value={field.type}
                  onChange={(e) => updateField(field.id, 'type', e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <Input
                  placeholder="CSV column (optional)"
                  value={field.csvColumn || ''}
                  onChange={(e) => updateField(field.id, 'csvColumn', e.target.value || null)}
                />
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-sm text-surface-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => updateField(field.id, 'required', e.target.checked)}
                      className="rounded border-surface-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Required
                  </label>
                  <button
                    onClick={() => removeField(field.id)}
                    className="p-1.5 text-surface-400 hover:text-red-500 transition-colors ml-auto"
                    title="Remove"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={addField}>Add Custom Field</Button>
          <Button onClick={save} loading={saving}>Save Configuration</Button>
        </div>
      </Card>
    </div>
  );
}
