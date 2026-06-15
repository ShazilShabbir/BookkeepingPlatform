import { useState, useEffect } from 'react';
import { useCustomerStore } from '@/lib/store';
import { Card, Button, Input, EmptyState } from '@/components/ui';
import CustomerFieldConfig from '@/components/CustomerFieldConfig';
import toast from 'react-hot-toast';

type Customer = {
  uid: string;
  name: string;
  email: string;
  createdAt: string;
};

async function api(path: string, options?: RequestInit) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  return res.json();
}

export default function ManageCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [configuringUid, setConfiguringUid] = useState<string | null>(null);
  const { setCustomer } = useCustomerStore();

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const json = await api('/api/customers');
      if (json.success) setCustomers(json.data);
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCustomers(); }, []);

  const addCustomer = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setSubmitting(true);
    try {
      const json = await api('/api/customers', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      if (json.success) {
        toast.success('Customer created');
        setName('');
        setEmail('');
        loadCustomers();
      } else {
        toast.error(json.error || 'Failed to create customer');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteCustomer = async (customer: Customer) => {
    try {
      const json = await api('/api/customers', {
        method: 'DELETE',
        body: JSON.stringify({ customerUid: customer.uid }),
      });
      if (json.success) {
        toast.success('Customer removed');
        loadCustomers();
      }
    } catch {
      toast.error('Failed to delete');
    }
  };

  const switchToCustomer = (customer: Customer) => {
    setCustomer(customer.uid, customer.name);
    toast.success(`Viewing ${customer.name}'s data`);
  };

  if (configuringUid) {
    const customer = customers.find((c) => c.uid === configuringUid);
    return (
      <CustomerFieldConfig
        customerUid={configuringUid}
        customerName={customer?.name || ''}
        onClose={() => setConfiguringUid(null)}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Card padding="lg">
        <h2 className="text-lg font-semibold text-surface-900 mb-2">Manage Customers</h2>
        <p className="text-sm text-surface-500 mb-6">
          Create customer accounts. Each customer gets their own MongoDB account with isolated data.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Input placeholder="Business name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input type="email" placeholder="customer@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button onClick={addCustomer} loading={submitting} className="shrink-0">Create Customer</Button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-surface-400">Loading customers...</div>
        ) : customers.length === 0 ? (
          <EmptyState
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
            title="No customers yet"
            description="Create your first customer above. Each customer gets isolated data storage."
          />
        ) : (
          <div className="space-y-3">
            {customers.map((customer) => (
              <div key={customer.uid} className="flex items-center justify-between bg-surface-50 rounded-lg px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-surface-900 truncate">{customer.name}</p>
                  <p className="text-xs text-surface-400 truncate">{customer.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <Button size="sm" variant="secondary" onClick={() => switchToCustomer(customer)}>
                    View Data
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setConfiguringUid(customer.uid)}>
                    Fields
                  </Button>
                  <button
                    onClick={() => deleteCustomer(customer)}
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
