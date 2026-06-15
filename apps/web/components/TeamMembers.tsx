import { useState, useEffect } from 'react';
import { Card, Button, Input, EmptyState } from '@/components/ui';
import toast from 'react-hot-toast';

type TeamMemberData = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  invitedAt: string;
  joinedAt?: string;
};

async function api(path: string, options?: RequestInit) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  return res.json();
}

export default function TeamMembers() {
  const [members, setMembers] = useState<TeamMemberData[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'viewer' | 'editor'>('viewer');
  const [submitting, setSubmitting] = useState(false);
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const json = await api('/api/team');
      if (json.success) setMembers(json.data);
    } catch {
      toast.error('Failed to load team');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMembers(); }, []);

  const invite = async () => {
    if (!email.trim()) return;
    setSubmitting(true);
    setUpgradeRequired(false);
    try {
      const json = await api('/api/team', {
        method: 'POST',
        body: JSON.stringify({ action: 'invite', email: email.trim(), role }),
      });
      if (json.success) {
        toast.success('Invitation sent!');
        setEmail('');
        loadMembers();
      } else if (json.code === 'UPGRADE_REQUIRED') {
        setUpgradeRequired(true);
        toast.error(json.error);
      } else {
        toast.error(json.error || 'Failed to invite');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (memberId: string) => {
    if (!confirm('Remove this team member?')) return;
    try {
      const json = await api('/api/team', {
        method: 'DELETE',
        body: JSON.stringify({ memberId }),
      });
      if (json.success) {
        toast.success('Member removed');
        loadMembers();
      } else {
        toast.error(json.error || 'Failed to remove');
      }
    } catch {
      toast.error('Network error');
    }
  };

  return (
    <Card padding="lg">
      <h2 className="text-lg font-semibold text-surface-900 mb-1">Team Members</h2>
      <p className="text-sm text-surface-500 mb-6">Invite team members to collaborate on your account.</p>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 mb-6 p-4 bg-surface-50 rounded-lg">
        <div className="flex-1 min-w-0">
          <label className="block text-xs font-medium text-surface-500 mb-1">Email</label>
          <Input
            type="email"
            placeholder="colleague@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>
        <div className="shrink-0">
          <label className="block text-xs font-medium text-surface-500 mb-1">Role</label>
          <select
            value={role}
            onChange={e => setRole(e.target.value as 'viewer' | 'editor')}
            className="w-full sm:w-auto h-10 rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
          </select>
        </div>
        <Button onClick={invite} disabled={submitting || !email.trim()} className="shrink-0">
          {submitting ? 'Sending...' : 'Invite'}
        </Button>
      </div>

      {upgradeRequired && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          Multi-user access requires the <strong>Business plan</strong>.{' '}
          <a href="/pricing" className="underline font-medium">Upgrade here</a>.
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-surface-400">Loading...</div>
      ) : members.length === 0 ? (
        <EmptyState
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          }
          title="No team members yet"
          description="Invite someone above to collaborate on your account."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200">
                <th className="text-left py-2 pr-4 font-medium text-surface-600">Name</th>
                <th className="text-left py-2 pr-4 font-medium text-surface-600">Email</th>
                <th className="text-left py-2 pr-4 font-medium text-surface-600">Role</th>
                <th className="text-left py-2 pr-4 font-medium text-surface-600">Status</th>
                <th className="text-left py-2 pr-4 font-medium text-surface-600">Invited</th>
                <th className="text-left py-2 font-medium text-surface-600"></th>
              </tr>
            </thead>
            <tbody className="text-surface-700">
              {members.map(m => (
                <tr key={m.id} className="border-b border-surface-100">
                  <td className="py-2 pr-4">{m.name || '—'}</td>
                  <td className="py-2 pr-4">{m.email}</td>
                  <td className="py-2 pr-4">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${m.role === 'editor' ? 'bg-indigo-100 text-indigo-700' : 'bg-surface-100 text-surface-600'}`}>
                      {m.role}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${m.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-xs text-surface-400">{m.invitedAt ? new Date(m.invitedAt).toLocaleDateString() : '—'}</td>
                  <td className="py-2">
                    <button onClick={() => remove(m.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
