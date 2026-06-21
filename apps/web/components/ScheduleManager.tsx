import { useState, useEffect } from 'react';
import { Card, Button, Badge } from '@/components/ui';
import toast from 'react-hot-toast';

interface Schedule {
  _id: string;
  userId: string;
  clientId: string;
  frequency: 'weekly' | 'monthly';
  reportType: string;
  nextRunAt: string;
  createdAt: string;
}

interface Client {
  _id: string;
  name: string;
  accessToken: string;
}

async function api(path: string, options?: RequestInit) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  return res.json();
}

export default function ScheduleManager({ userId }: { userId: string }) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState('');
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('monthly');
  const [submitting, setSubmitting] = useState(false);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const [schedRes, clientRes] = await Promise.all([
        api('/api/schedules?userId=' + encodeURIComponent(userId)),
        api('/api/clients?userId=' + encodeURIComponent(userId)),
      ]);
      if (schedRes.success) setSchedules(schedRes.data);
      if (clientRes.success) setClients(clientRes.data);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSchedules(); }, []);

  const createSchedule = async () => {
    if (!clientId) {
      toast.error('Please select a client');
      return;
    }
    setSubmitting(true);
    try {
      const json = await api('/api/schedules', {
        method: 'POST',
        body: JSON.stringify({ userId, clientId, frequency, reportType: 'financial' }),
      });
      if (json.success) {
        toast.success('Schedule created');
        setClientId('');
        loadSchedules();
      } else {
        toast.error(json.error || 'Failed to create schedule');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteSchedule = async (id: string) => {
    try {
      const json = await api(`/api/schedules?id=${id}&userId=` + encodeURIComponent(userId), { method: 'DELETE' });
      if (json.success) {
        toast.success('Schedule removed');
        loadSchedules();
      } else {
        toast.error(json.error || 'Failed to delete');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const clientMap = new Map(clients.map((c) => [c._id, c.name]));

  const nextRunDate = (nextRunAt: string) => {
    const d = new Date(nextRunAt);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card padding="lg">
        <h2 className="text-lg font-semibold text-surface-900 mb-2">Create Schedule</h2>
        <p className="text-sm text-surface-500 mb-6">
          Schedule automated email reports for your clients.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="block w-full sm:w-64 rounded-lg border border-surface-300 bg-white px-3 py-2.5 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          >
            <option value="">Select client...</option>
            {clients.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as 'weekly' | 'monthly')}
            className="block w-full sm:w-40 rounded-lg border border-surface-300 bg-white px-3 py-2.5 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <Button onClick={createSchedule} loading={submitting}>Create Schedule</Button>
        </div>
        {clients.length === 0 && (
          <p className="text-xs text-amber-600 mt-3">
            No clients yet. Create a client in the Clients tab first.
          </p>
        )}
      </Card>

      <Card padding="lg">
        <h2 className="text-lg font-semibold text-surface-900 mb-4">Scheduled Reports</h2>
        {loading ? (
          <div className="text-center py-8 text-surface-400">Loading schedules...</div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-surface-400 text-sm">No schedules yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule) => (
              <div key={schedule._id} className="flex items-center justify-between bg-surface-50 rounded-lg px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-surface-900">
                      {clientMap.get(schedule.clientId) || 'Unknown Client'}
                    </span>
                    <Badge variant="primary" size="sm">
                      {schedule.frequency}
                    </Badge>
                  </div>
                  <p className="text-xs text-surface-400">
                    Next run: {nextRunDate(schedule.nextRunAt)}
                  </p>
                </div>
                <button
                  onClick={() => deleteSchedule(schedule._id)}
                  className="p-2.5 sm:p-1.5 text-surface-400 hover:text-red-500 transition-colors shrink-0 ml-4 min-w-10 min-h-10 sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                  title="Delete schedule"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
