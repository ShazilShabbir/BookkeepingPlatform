import { useState, useEffect } from 'react';
import { Card, Button, Input } from '@/components/ui';
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

export default function ClientManager() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [origin, setOrigin] = useState('');

  useEffect(() => { setOrigin(origin); }, []);

  const loadClients = async () => {
    setLoading(true);
    try {
      const json = await api('/api/clients');
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
        body: JSON.stringify({ name: name.trim() }),
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
      const json = await api(`/api/clients?id=${client._id}`, { method: 'DELETE' });
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
          <div className="text-center py-12">
            <p className="text-surface-400 text-sm">No clients yet. Create your first client above.</p>
          </div>
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
