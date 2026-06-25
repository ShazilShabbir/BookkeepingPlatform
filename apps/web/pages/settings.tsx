import { useEffect, useState, useCallback, FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { Card, Button, Input } from '@/components/ui';
import toast from 'react-hot-toast';
import Head from 'next/head';
import { COMMON_CURRENCIES, formatCurrency } from '@/lib/format';
import clsx from 'clsx';

const TABS = [
  { key: 'profile', label: 'Profile' },
  { key: 'security', label: 'Security' },
  { key: 'branding', label: 'Branding' },
  { key: 'currencies', label: 'Currencies' },
  { key: 'danger', label: 'Danger Zone' },
] as const;

type TabKey = typeof TABS[number]['key'];

export default function SettingsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<TabKey>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpLoading, setTotpLoading] = useState(false);
  const [showTotpSetup, setShowTotpSetup] = useState(false);
  const [totpSecret, setTotpSecret] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [totpVerifying, setTotpVerifying] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [disableTotpCode, setDisableTotpCode] = useState('');
  const [disablingTotp, setDisablingTotp] = useState(false);

  const [brandingLogo, setBrandingLogo] = useState('');
  const [brandingPrimaryColor, setBrandingPrimaryColor] = useState('#6366f1');
  const [brandingCompanyName, setBrandingCompanyName] = useState('');
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [brandingLoading, setBrandingLoading] = useState(true);

  const [exchangeRates, setExchangeRates] = useState<Record<string, { rate: number; date: string; source: string }>>({});
  const [exchangeRatesLoading, setExchangeRatesLoading] = useState(false);
  const [multiCurrencyAllowed, setMultiCurrencyAllowed] = useState(true);
  const [showAddRate, setShowAddRate] = useState(false);
  const [newTargetCurrency, setNewTargetCurrency] = useState('EUR');
  const [newRate, setNewRate] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [rateSaving, setRateSaving] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/subscription');
      const json = await res.json();
      if (json.success) {
        setName(session?.user?.name || '');
        setEmail(session?.user?.email || '');
        setCompanyName(json.data?.createdAt ? '' : '');
      }
    } catch { /* use session defaults */ } finally {
      setLoading(false);
    }
  }, [session]);

  const fetchTotpStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/2fa/status');
      const json = await res.json();
      setTotpEnabled(json.enabled);
    } catch { /* ignore */ }
  }, []);

  const fetchBranding = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/branding');
      const json = await res.json();
      if (json.success) {
        setBrandingLogo(json.data.logo || '');
        setBrandingPrimaryColor(json.data.primaryColor || '#6366f1');
        setBrandingCompanyName(json.data.companyName || '');
      }
    } catch { /* ignore */ }
    setBrandingLoading(false);
  }, []);

  const fetchExchangeRates = useCallback(async () => {
    setExchangeRatesLoading(true);
    try {
      const res = await fetch('/api/settings/exchange-rates');
      if (res.status === 403) { setMultiCurrencyAllowed(false); return; }
      const json = await res.json();
      if (json.success) setExchangeRates(json.data || {});
      setMultiCurrencyAllowed(true);
    } catch { /* ignore */ } finally {
      setExchangeRatesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || '');
      setEmail(session.user.email || '');
      setLoading(false);
      fetchTotpStatus();
      fetchBranding();
      fetchExchangeRates();
    }
  }, [session, fetchTotpStatus, fetchBranding, fetchExchangeRates]);

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, companyName }),
      });
      const json = await res.json();
      if (json.success) toast.success('Profile updated');
      else toast.error(json.error || 'Failed to update profile');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch('/api/user/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Password changed');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(json.error || 'Failed to change password');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleTotpSetup = async () => {
    setTotpLoading(true);
    try {
      const res = await fetch('/api/2fa/setup', { method: 'POST' });
      const json = await res.json();
      if (json.secret) {
        setTotpSecret(json.secret);
        setQrDataUrl(json.qrDataUrl || '');
        setOtpauthUrl(json.otpauth || '');
        setShowTotpSetup(true);
      } else {
        toast.error(json.error || 'Failed to start setup');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setTotpLoading(false);
    }
  };

  const handleTotpVerify = async () => {
    if (!/^\d{6}$/.test(totpCode)) {
      toast.error('Enter a valid 6-digit code');
      return;
    }
    setTotpVerifying(true);
    try {
      const res = await fetch('/api/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: totpCode }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Two-factor authentication enabled');
        setTotpEnabled(true);
        setShowTotpSetup(false);
        setTotpCode('');
        if (json.backupCodes) {
          setBackupCodes(json.backupCodes);
          setShowBackupCodes(true);
        }
      } else {
        toast.error(json.error || 'Verification failed');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setTotpVerifying(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 512 * 1024) { toast.error('Logo must be under 512KB'); return; }
    const reader = new FileReader();
    reader.onload = () => setBrandingLogo(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleBrandingSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBrandingSaving(true);
    try {
      const res = await fetch('/api/settings/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logo: brandingLogo,
          primaryColor: brandingPrimaryColor,
          companyName: brandingCompanyName,
        }),
      });
      const json = await res.json();
      if (json.success) toast.success('Branding saved');
      else toast.error(json.error || 'Failed to save branding');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setBrandingSaving(false);
    }
  };

  const handleAddRate = async () => {
    if (!newTargetCurrency || !newRate || isNaN(Number(newRate)) || Number(newRate) <= 0) {
      toast.error('Enter a valid currency and rate');
      return;
    }
    setRateSaving(true);
    try {
      const res = await fetch('/api/settings/exchange-rates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetCurrency: newTargetCurrency, rate: Number(newRate), date: newDate }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Rate for ${newTargetCurrency} saved`);
        setShowAddRate(false);
        setNewRate('');
        fetchExchangeRates();
      } else {
        toast.error(json.error || 'Failed to save rate');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setRateSaving(false);
    }
  };

  const handleDeleteRate = async (targetCurrency: string) => {
    try {
      const res = await fetch('/api/settings/exchange-rates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetCurrency }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Rate for ${targetCurrency} removed`);
        fetchExchangeRates();
      } else {
        toast.error(json.error || 'Failed to delete rate');
      }
    } catch {
      toast.error('Something went wrong');
    }
  };

  const handleTotpDisable = async () => {
    if (!/^\d{6}$/.test(disableTotpCode)) {
      toast.error('Enter a valid 6-digit code');
      return;
    }
    setDisablingTotp(true);
    try {
      const res = await fetch('/api/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: disableTotpCode }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Two-factor authentication disabled');
        setTotpEnabled(false);
        setDisableTotpCode('');
      } else {
        toast.error(json.error || 'Failed to disable');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setDisablingTotp(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Settings | BookKeep</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div className="bg-surface-50 py-10">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-surface-900">Settings</h1>
            <p className="mt-1 text-surface-500">Manage your account settings and preferences.</p>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 mb-8 border-b border-surface-200 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={clsx(
                  'px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px',
                  activeTab === tab.key
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300',
                  tab.key === 'danger' && activeTab === 'danger' && 'border-red-500 text-red-600',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <Card padding="lg">
                <h2 className="text-lg font-semibold text-surface-900 mb-6">Profile</h2>
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
                  <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  <Input label="Company Name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                  <div className="pt-2">
                    <Button type="submit" loading={saving}>Save Changes</Button>
                  </div>
                </form>
              </Card>

              <Card padding="lg">
                <h2 className="text-lg font-semibold text-surface-900 mb-6">Change Password</h2>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <Input label="Current Password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
                  <Input label="New Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                  <Input label="Confirm New Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                  <div className="pt-2">
                    <Button type="submit" loading={changingPassword}>Change Password</Button>
                  </div>
                </form>
              </Card>
            </div>
          )}

          {activeTab === 'security' && (
            <Card padding="lg">
              <h2 className="text-lg font-semibold text-surface-900 mb-6">Security</h2>

              {!totpEnabled && !showTotpSetup && (
                <div>
                  <p className="text-sm text-surface-500 mb-4">Add an extra layer of security to your account by enabling two-factor authentication.</p>
                  <Button onClick={handleTotpSetup} loading={totpLoading}>Enable Two-Factor Auth</Button>
                </div>
              )}

              {!totpEnabled && showTotpSetup && totpSecret && (
                <div className="space-y-4">
                  <p className="text-sm text-surface-700 font-medium">Scan this code with your authenticator app</p>
                  {qrDataUrl && (
                    <div className="bg-white border border-surface-200 rounded-lg p-4 inline-block">
                      <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />
                    </div>
                  )}
                  {otpauthUrl && (
                    <div className="flex flex-col gap-2">
                      <a href={otpauthUrl} className="text-sm text-blue-600 hover:underline">
                        Tap to add in authenticator app (mobile)
                      </a>
                      <button
                        onClick={() => { navigator.clipboard.writeText(otpauthUrl); toast.success('Copied!'); }}
                        className="text-xs text-surface-500 hover:text-surface-700 text-left underline"
                      >
                        Copy otpauth URL
                      </button>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-surface-500 mb-1">Or enter this key manually:</p>
                    <code className="text-sm bg-surface-100 px-3 py-2 rounded font-mono break-all">{totpSecret}</code>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input
                      label="Verification Code"
                      type="text"
                      inputMode="numeric"
                      placeholder="000000"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      className="flex-1"
                    />
                    <div className="pt-5">
                      <Button onClick={handleTotpVerify} loading={totpVerifying}>Verify</Button>
                    </div>
                  </div>
                  <button onClick={() => { setShowTotpSetup(false); setTotpSecret(''); setTotpCode(''); }} className="text-sm text-surface-500 hover:text-surface-700">
                    Cancel
                  </button>
                </div>
              )}

              {showBackupCodes && backupCodes.length > 0 && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm font-semibold text-amber-800 mb-2">Save these backup codes</p>
                  <p className="text-xs text-amber-700 mb-3">Each code can be used only once. Store them somewhere safe.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {backupCodes.map((code, i) => (
                      <code key={i} className="text-sm font-mono bg-white px-2 py-1 rounded border border-amber-200 text-center">{code}</code>
                    ))}
                  </div>
                  <button onClick={() => setShowBackupCodes(false)} className="mt-3 text-sm text-amber-700 hover:text-amber-800">
                    I&apos;ve saved them — close
                  </button>
                </div>
              )}

              {totpEnabled && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Two-factor auth is enabled
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input
                      label="Enter code to disable"
                      type="text"
                      inputMode="numeric"
                      placeholder="000000"
                      value={disableTotpCode}
                      onChange={(e) => setDisableTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      className="flex-1"
                    />
                    <div className="pt-5">
                      <Button onClick={handleTotpDisable} loading={disablingTotp} variant="danger">Disable</Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}

          {activeTab === 'branding' && (
            <Card padding="lg">
              <h2 className="text-lg font-semibold text-surface-900 mb-6">Branding</h2>
              {brandingLoading ? (
                <div className="animate-spin w-6 h-6 border-4 border-primary-600 border-t-transparent rounded-full" />
              ) : (
                <form onSubmit={handleBrandingSubmit} className="space-y-4">
                  <Input label="Branding Company Name" value={brandingCompanyName} onChange={(e) => setBrandingCompanyName(e.target.value)} placeholder="Your Company Name" />
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">Primary Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={brandingPrimaryColor}
                        onChange={(e) => setBrandingPrimaryColor(e.target.value)}
                        className="w-10 h-10 rounded border border-surface-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={brandingPrimaryColor}
                        onChange={(e) => setBrandingPrimaryColor(e.target.value)}
                        className="flex-1 rounded-lg border border-surface-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="#6366f1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">Logo</label>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml"
                      onChange={handleLogoUpload}
                      className="block w-full text-sm text-surface-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                    />
                    {brandingLogo && (
                      <div className="mt-3 flex items-center gap-3">
                        <img src={brandingLogo} alt="Logo preview" className="h-12 w-auto rounded border border-surface-200" />
                        <button type="button" onClick={() => setBrandingLogo('')} className="text-sm text-red-600 hover:text-red-700">Remove</button>
                      </div>
                    )}
                    <p className="mt-1 text-xs text-surface-400">PNG, JPEG, or SVG. Max 512KB.</p>
                  </div>
                  <div className="pt-2">
                    <Button type="submit" loading={brandingSaving}>Save Branding</Button>
                  </div>
                </form>
              )}
            </Card>
          )}

          {activeTab === 'currencies' && (
            <Card padding="lg">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-surface-900">Currencies</h2>
                {multiCurrencyAllowed && (
                  <Button onClick={() => setShowAddRate(true)} size="sm">Add Currency</Button>
                )}
              </div>
              {!multiCurrencyAllowed ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800 font-medium">Multi-currency requires Pro plan or higher.</p>
                  <a href="/pricing" className="text-sm text-blue-600 hover:underline mt-1 inline-block">Upgrade to Pro</a>
                </div>
              ) : exchangeRatesLoading ? (
                <div className="animate-spin w-6 h-6 border-4 border-primary-600 border-t-transparent rounded-full" />
              ) : (
                <div className="space-y-3">
                  {Object.keys(exchangeRates).length === 0 && !showAddRate && (
                    <p className="text-sm text-surface-500">No exchange rates configured. Add a currency to get started.</p>
                  )}
                  {Object.entries(exchangeRates).map(([target, data]) => {
                    const ccy = COMMON_CURRENCIES.find(c => c.code === target);
                    return (
                      <div key={target} className="flex items-center justify-between py-2 px-3 bg-surface-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-semibold text-surface-900 w-10 text-center">{ccy?.symbol || target}</span>
                          <div>
                            <p className="text-sm font-medium text-surface-900">{ccy ? `${ccy.name} (${target})` : target}</p>
                            <p className="text-xs text-surface-500">
                              1 USD = {formatCurrency(data.rate, target)}
                              {data.source === 'auto' && <span className="ml-2 text-emerald-600">Auto</span>}
                              <span className="ml-2">{data.date ? new Date(data.date).toLocaleDateString() : ''}</span>
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteRate(target)}
                          className="text-xs text-red-600 hover:text-red-700 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                  {showAddRate && (
                    <div className="border border-surface-200 rounded-lg p-4 space-y-3 mt-3">
                      <div className="grid sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-surface-700">Currency</label>
                          <select
                            value={newTargetCurrency}
                            onChange={(e) => setNewTargetCurrency(e.target.value)}
                            className="w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                          >
                            {COMMON_CURRENCIES.filter(c => c.code !== 'USD').map(c => (
                              <option key={c.code} value={c.code}>{c.code} ({c.symbol}) — {c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-surface-700">Rate (1 USD = ?)</label>
                          <Input type="number" step="0.0001" min="0" value={newRate} onChange={(e) => setNewRate(e.target.value)} placeholder="0.85" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-surface-700">Date</label>
                          <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Button onClick={handleAddRate} loading={rateSaving} size="sm">Save Rate</Button>
                        <button onClick={() => setShowAddRate(false)} className="text-sm text-surface-500 hover:text-surface-700">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}

          {activeTab === 'danger' && (
            <Card padding="lg">
              <h2 className="text-lg font-semibold text-red-600 mb-2">Danger Zone</h2>
              <p className="text-sm text-surface-500 mb-4">Permanently delete your account and all associated data. This action cannot be undone.</p>
              <Button variant="danger">Delete Account</Button>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

export function getServerSideProps() {
  return { props: {} };
}
