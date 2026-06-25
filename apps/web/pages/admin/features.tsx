import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/admin/AdminLayout';
import toast from 'react-hot-toast';

interface FeatureFlag {
  feature: string;
  label: string;
  override: 'enabled' | 'disabled' | 'default';
}

export default function AdminFeatures() {
  const router = useRouter();
  const [features, setFeatures] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchFeatures = async () => {
    try {
      const res = await fetch('/api/admin/features');
      if (res.status === 401) { router.push('/admin/login'); return; }
      const data = await res.json();
      setFeatures(data.features || []);
    } catch {
      toast.error('Failed to load feature flags');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFeatures(); }, []);

  const handleToggle = async (feature: string, newOverride: 'enabled' | 'disabled' | 'default') => {
    setSaving(feature);
    try {
      const res = await fetch('/api/admin/features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature, override: newOverride }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to update');
        return;
      }
      setFeatures((prev) =>
        prev.map((f) => f.feature === feature ? { ...f, override: newOverride } : f),
      );
      toast.success(`${feature === '__maintenance' ? 'Maintenance mode' : feature} updated`);
    } catch {
      toast.error('Failed to update feature flag');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-surface-400 text-sm">Loading feature flags...</div>
        </div>
      </AdminLayout>
    );
  }

  const regularFeatures = features.filter((f) => f.feature !== '__maintenance');
  const maintenanceFeature = features.find((f) => f.feature === '__maintenance');

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Feature Flags</h2>
          <p className="text-sm text-surface-400 mt-1">Override feature availability across all users. Changes take effect immediately.</p>
        </div>

        {/* Maintenance Mode */}
        {maintenanceFeature && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-red-400">Maintenance Mode</h3>
                <p className="text-xs text-surface-400 mt-1">When enabled, all non-admin routes return 503. Admin panel remains accessible.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-medium ${maintenanceFeature.override === 'enabled' ? 'text-red-400' : 'text-surface-500'}`}>
                  {maintenanceFeature.override === 'enabled' ? 'ON' : 'OFF'}
                </span>
                <button
                  onClick={() => handleToggle('__maintenance', maintenanceFeature.override === 'enabled' ? 'default' : 'enabled')}
                  disabled={saving === '__maintenance'}
                  className={`w-12 h-6 rounded-full relative transition-colors ${
                    maintenanceFeature.override === 'enabled' ? 'bg-red-500' : 'bg-surface-700'
                  } ${saving === '__maintenance' ? 'opacity-50' : 'cursor-pointer'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                    maintenanceFeature.override === 'enabled' ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feature List */}
        <div className="bg-surface-900 border border-surface-800 rounded-xl divide-y divide-surface-800">
          {regularFeatures.map((f) => (
            <div key={f.feature} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-white">{f.label}</p>
                <p className="text-xs text-surface-500 mt-0.5">{f.feature}</p>
              </div>
              <div className="flex items-center gap-2">
                {/* Three-state toggle: Default / Enabled / Disabled */}
                <div className="flex bg-surface-800 rounded-lg p-0.5">
                  {(['disabled', 'default', 'enabled'] as const).map((state) => (
                    <button
                      key={state}
                      onClick={() => handleToggle(f.feature, state)}
                      disabled={saving === f.feature}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        f.override === state
                          ? state === 'enabled' ? 'bg-emerald-500/20 text-emerald-400'
                            : state === 'disabled' ? 'bg-red-500/20 text-red-400'
                              : 'bg-surface-700 text-surface-300'
                          : 'text-surface-500 hover:text-surface-300'
                      } ${saving === f.feature ? 'opacity-50' : ''}`}
                    >
                      {state === 'enabled' ? 'On' : state === 'disabled' ? 'Off' : 'Default'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
