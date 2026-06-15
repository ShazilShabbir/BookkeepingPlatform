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

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || '');
      setEmail(session.user.email || '');
      setLoading(false);
    }
  }, [session]);

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
