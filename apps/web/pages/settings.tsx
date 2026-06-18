import { useEffect, useState, useCallback, FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { Card, Button, Input } from '@/components/ui';
import toast from 'react-hot-toast';
import Head from 'next/head';

export default function SettingsPage() {
  const { data: session } = useSession();
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

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || '');
      setEmail(session.user.email || '');
      setLoading(false);
      fetchTotpStatus();
    }
  }, [session, fetchTotpStatus]);

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
      <div className="min-h-screen bg-surface-50 py-10">
        <div className="max-w-4xl mx-auto px-4 space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-surface-900">Settings</h1>
            <p className="mt-1 text-surface-500">Manage your account settings and preferences.</p>
          </div>

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

          <Card padding="lg">
            <h2 className="text-lg font-semibold text-surface-900 mb-2">Danger Zone</h2>
            <p className="text-sm text-surface-500 mb-4">Permanently delete your account and all associated data. This action cannot be undone.</p>
            <Button variant="danger">Delete Account</Button>
          </Card>
        </div>
      </div>
    </>
  );
}

export function getServerSideProps() {
  return { props: {} };
}
