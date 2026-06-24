import { useState, useEffect, useCallback } from 'react';
import { Card, Button, Input } from '@/components/ui';
import toast from 'react-hot-toast';
import type { CsvMapping, CustomField, CsvProfile } from '@/lib/types';

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

function defaultMapping(): CsvMapping {
  return { dateColumn: '', amountColumn: '', amountMode: 'single_with_sign' };
}

export default function CustomerFieldConfig({ customerUid, customerName, onClose }: CustomerFieldConfigProps) {
  const [csvMapping, setCsvMapping] = useState<CsvMapping>(defaultMapping());
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [profiles, setProfiles] = useState<CsvProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [renaming, setRenaming] = useState('');

  const loadProfile = useCallback((profileName: string, profilesList: CsvProfile[]) => {
    const profile = profilesList.find(prof => prof.name === profileName);
    if (profile) {
      setCsvMapping(profile.csvMapping || defaultMapping());
      setCustomFields(profile.customFields || []);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const json = await api(`/api/customers?uid=${customerUid}`);
        if (json.success) {
          const data = json.data;
          const loadedProfiles: CsvProfile[] = data.csvProfiles || [];
          if (loadedProfiles.length > 0) {
            setProfiles(loadedProfiles);
            setActiveProfile(loadedProfiles[0].name);
            loadProfile(loadedProfiles[0].name, loadedProfiles);
          } else {
            if (data.csvMapping) setCsvMapping(data.csvMapping);
            if (data.customFields) setCustomFields(data.customFields);
          }
        }
      } catch {
        toast.error('Failed to load config');
      } finally {
        setLoading(false);
      }
    })();
  }, [customerUid, loadProfile]);

  const switchProfile = (name: string) => {
    setActiveProfile(name);
    loadProfile(name, profiles);
  };

  const addProfile = () => {
    const baseName = 'Profile';
    let i = 1;
    while (profiles.some(p => p.name === `${baseName} ${i}`)) i++;
    const name = `${baseName} ${i}`;
    setProfiles([...profiles, { name, csvMapping: defaultMapping(), customFields: [] }]);
    setActiveProfile(name);
    setCsvMapping(defaultMapping());
    setCustomFields([]);
  };

  const deleteProfile = (name: string) => {
    const remaining = profiles.filter(p => p.name !== name);
    setProfiles(remaining);
    if (remaining.length > 0) {
      setActiveProfile(remaining[0].name);
      loadProfile(remaining[0].name, remaining);
    } else {
      setActiveProfile('');
      setCsvMapping(defaultMapping());
      setCustomFields([]);
    }
  };

  const renameProfile = (oldName: string, newName: string) => {
    if (!newName.trim() || profiles.some(p => p.name === newName.trim())) return;
    setProfiles(profiles.map(p => p.name === oldName ? { ...p, name: newName.trim() } : p));
    setActiveProfile(newName.trim());
    setRenaming('');
  };

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
      const cleanedFields = customFields.filter((f) => f.label.trim());
      let updatedProfiles = profiles;
      if (activeProfile) {
        updatedProfiles = profiles.map(p =>
          p.name === activeProfile ? { ...p, csvMapping, customFields: cleanedFields } : p
        );
      }
      const json = await api('/api/customers', {
        method: 'PUT',
        body: JSON.stringify({
          customerUid,
          csvMapping,
          customFields: cleanedFields,
          csvProfiles: updatedProfiles.length > 0 ? updatedProfiles : undefined,
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
          <button onClick={onClose} className="p-2.5 sm:p-1.5 text-surface-400 hover:text-surface-600 transition-colors min-w-10 min-h-10 sm:min-w-0 sm:min-h-0 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {profiles.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {profiles.map(p => (
                <div key={p.name} className="flex items-center gap-1">
                  {renaming === p.name ? (
                    <input
                      autoFocus
                      defaultValue={p.name}
                      onBlur={e => renameProfile(p.name, e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && renameProfile(p.name, (e.target as HTMLInputElement).value)}
                      className="text-xs border border-surface-200 rounded px-2 py-1 w-24"
                    />
                  ) : (
                    <button
                      onClick={() => switchProfile(p.name)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                        activeProfile === p.name
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-surface-600 border-surface-200 hover:border-primary-300'
                      }`}
                    >
                      {p.name}
                    </button>
                  )}
                  {activeProfile === p.name && !renaming && (
                    <div className="flex gap-0.5">
                      <button onClick={() => setRenaming(p.name)} className="p-0.5 text-surface-400 hover:text-primary-600" title="Rename">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => deleteProfile(p.name)} className="p-0.5 text-surface-400 hover:text-red-500" title="Delete">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <button onClick={addProfile} className="text-xs px-3 py-1.5 rounded-lg border border-dashed border-surface-300 text-surface-500 hover:border-primary-300 hover:text-primary-600 transition-colors">
                + Add Profile
              </button>
            </div>
          </div>
        )}

        <h3 className="text-sm font-semibold text-surface-700 mb-3">Column Mapping</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {[
            { key: 'dateColumn', label: 'Date Column', placeholder: 'e.g. Order Date, Date', suggestions: ['Date', 'Order Date', 'Transaction Date', 'Posted Date', 'Created'] },
            { key: 'amountColumn', label: 'Amount Column', placeholder: 'e.g. Total Revenue, Amount', suggestions: ['Amount', 'Total', 'Revenue', 'Income', 'Sales'] },
            { key: 'amountColumn2', label: 'Second Amount Column (optional)', placeholder: 'e.g. Total Cost', suggestions: ['Cost', 'Expense', 'Fee', 'Debit', 'Payment'] },
            { key: 'descriptionColumn', label: 'Description Column (optional)', placeholder: 'e.g. Item Type, Description', suggestions: ['Description', 'Memo', 'Notes', 'Item', 'Product'] },
            { key: 'categoryColumn', label: 'Category Column (optional)', placeholder: 'e.g. Category, Department', suggestions: ['Category', 'Type', 'Department', 'Group', 'Class'] },
          ].map(({ key, label, placeholder, suggestions }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-surface-500 mb-1">{label}</label>
              <Input
                placeholder={placeholder}
                value={(csvMapping as any)[key] || ''}
                onChange={(e) => updateMapping(key as keyof CsvMapping, e.target.value || undefined)}
              />
              <div className="flex flex-wrap gap-1 mt-1">
                {suggestions.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => updateMapping(key as keyof CsvMapping, s)}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-surface-100 text-surface-500 hover:bg-primary-100 hover:text-primary-600 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
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
                    className="p-2.5 sm:p-1.5 text-surface-400 hover:text-red-500 transition-colors ml-auto min-w-10 min-h-10 sm:min-w-0 sm:min-h-0 flex items-center justify-center"
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
