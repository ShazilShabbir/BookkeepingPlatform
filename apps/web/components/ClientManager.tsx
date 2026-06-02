import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { Card } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import toast from 'react-hot-toast';

type Client = {
  id: string;
  clientName: string;
  email: string;
  accessToken: string;
  createdAt: string;
};

async function api(path: string, options?: RequestInit) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken();
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options?.headers },
  });
  return res.json();
}

export default function ClientManager() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    if (!name.trim() || !email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setSubmitting(true);
    try {
      const json = await api('/api/clients', {
        method: 'POST',
        body: JSON.stringify({ clientName: name.trim(), email: email.trim() }),
      });
      if (json.success) {
        const shareLink = `${window.location.origin}/reports/${json.data.accessToken}`;
        setName('');
        setEmail('');
        loadClients();
        navigator.clipboard.writeText(shareLink).then(() => {
          toast.success('Client added — link copied to clipboard');
        }, () => {
          toast.success('Client added');
        });
      } else {
        toast.error(json.error || 'Failed to add client');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteClient = async (client: Client) => {
    try {
      const json = await api('/api/clients', {
        method: 'DELETE',
        body: JSON.stringify({ id: client.id }),
      });
      if (json.success) {
        toast.success('Client removed');
        loadClients();
      }
    } catch {
      toast.error('Failed to delete');
    }
  };

  const copyLink = (client: Client) => {
    const url = `${window.location.origin}/reports/${client.accessToken}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success('Link copied to clipboard'),
      () => toast.error('Failed to copy'),
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card padding="lg">
        <h2 className="text-lg font-semibold text-surface-900 mb-2">Clients</h2>
        <p className="text-sm text-surface-500 mb-6">
          Add clients and generate shareable report links.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Input placeholder="Client name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input type="email" placeholder="client@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button onClick={addClient} loading={submitting} className="shrink-0">Add Client</Button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-surface-400">Loading clients...</div>
        ) : clients.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-surface-400 text-sm">No clients yet. Add your first client above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {clients.map((client) => (
              <div key={client.id} className="flex items-center justify-between bg-surface-50 rounded-lg px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-surface-900 truncate">{client.clientName}</p>
                  <p className="text-xs text-surface-400 truncate">{client.email}</p>
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
