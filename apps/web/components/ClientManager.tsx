import { useState, useEffect } from 'react';
import { Card, Button, Input, EmptyState } from '@/components/ui';
import toast from 'react-hot-toast';

interface Client {
  _id: string;
  userId: string;
  name: string;
  accessToken: string;
  createdAt: string;
}

async function api(path: string, options?: RequestInit) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  return res.json();
}

export default function ClientManager({ userId }: { userId: string }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [origin, setOrigin] = useState('');

  useEffect(() => { setOrigin(origin); }, []);

  const loadClients = async () => {
    setLoading(true);
    try {
      const json = await api('/api/clients?userId=' + encodeURIComponent(userId));
      if (json.success) setClients(json.data);
    } catch {
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadClients(); }, []);

  const addClient = async () => {
    if (!name.trim()) {
      toast.error('Client name is required');
      return;
    }
    setSubmitting(true);
    try {
      const json = await api('/api/clients', {
        method: 'POST',
        body: JSON.stringify({ userId, name: name.trim() }),
      });
      if (json.success) {
        toast.success('Client created');
        setName('');
        loadClients();
      } else {
        toast.error(json.error || 'Failed to create client');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteClient = async (client: Client) => {
    try {
      const json = await api(`/api/clients?id=${client._id}&userId=` + encodeURIComponent(userId), { method: 'DELETE' });
      if (json.success) {
        toast.success('Client removed');
        loadClients();
      } else {
        toast.error(json.error || 'Failed to delete');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const copyLink = (client: Client) => {
    const url = `${origin}/reports/${client.accessToken}`;
    navigator.clipboard.writeText(url);
    toast.success('Share link copied to clipboard');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card padding="lg">
        <h2 className="text-lg font-semibold text-surface-900 mb-2">Manage Clients</h2>
        <p className="text-sm text-surface-500 mb-6">
          Create shareable report links for your clients. Each client gets a unique link to view financial reports.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Input
            placeholder="Client name (e.g. ABC Corp)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="sm:w-80"
          />
          <Button onClick={addClient} loading={submitting} className="shrink-0">Create Client</Button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-surface-400">Loading clients...</div>
        ) : clients.length === 0 ? (
          <EmptyState
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            }
            title="No clients yet"
            description="Create your first client above to generate shareable report links."
          />
        ) : (
          <div className="space-y-3">
            {clients.map((client) => (
              <div key={client._id} className="flex items-center justify-between bg-surface-50 rounded-lg px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-surface-900">{client.name}</p>
                  <p className="text-xs text-surface-400 font-mono truncate mt-0.5">
                    {origin}/reports/{client.accessToken.slice(0, 16)}...
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <Button size="sm" variant="secondary" onClick={() => copyLink(client)}>
                    Copy Link
                  </Button>
                  <button
                    onClick={() => deleteClient(client)}
                    className="p-1.5 text-surface-400 hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
