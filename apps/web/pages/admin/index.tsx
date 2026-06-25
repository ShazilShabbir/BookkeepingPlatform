import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/admin/AdminLayout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Stats {
  totalUsers: number;
  recentSignups: number;
  activeSubscriptions: number;
  mrr: number;
  churnRate: number;
  entriesThisMonth: number;
  openTickets: number;
  pastDue: number;
  canceled30d: number;
  signupsOverTime: { month: string; count: number }[];
  tierDistribution: { name: string; value: number; color: string }[];
  byTier: Record<string, number>;
  byStatus: Record<string, number>;
}

export default function AdminOverview() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((res) => {
        if (res.status === 401) { router.push('/admin/login'); return; }
        return res.json();
      })
      .then((data) => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-surface-400 text-sm">Loading dashboard...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!stats) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-red-400 text-sm">Failed to load stats</div>
        </div>
      </AdminLayout>
    );
  }

  const kpis = [
    { label: 'Total Users', value: stats.totalUsers.toLocaleString(), sub: `+${stats.recentSignups} this month`, color: 'text-white' },
    { label: 'Active Subscriptions', value: stats.activeSubscriptions.toLocaleString(), sub: `${stats.pastDue} past due`, color: 'text-emerald-400' },
    { label: 'MRR', value: `$${stats.mrr.toLocaleString()}`, sub: 'Monthly Recurring Revenue', color: 'text-primary-400' },
    { label: 'Churn Rate', value: `${stats.churnRate}%`, sub: `Last 30 days`, color: 'text-amber-400' },
    { label: 'Entries (This Month)', value: stats.entriesThisMonth.toLocaleString(), sub: 'Journal entries created', color: 'text-cyan-400' },
    { label: 'Open Tickets', value: stats.openTickets.toLocaleString(), sub: 'Support requests', color: 'text-rose-400' },
    { label: 'Canceled (30d)', value: stats.canceled30d.toLocaleString(), sub: 'Cancellations', color: 'text-red-400' },
    { label: 'Past Due', value: stats.pastDue.toLocaleString(), sub: 'Failed payments', color: 'text-orange-400' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="bg-surface-900 border border-surface-800 rounded-xl p-5">
              <p className="text-xs font-medium text-surface-500 uppercase tracking-wider">{kpi.label}</p>
              <p className={`text-3xl font-bold mt-2 ${kpi.color}`}>{kpi.value}</p>
              <p className="text-xs text-surface-600 mt-1">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Signups Chart */}
          <div className="bg-surface-900 border border-surface-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">User Signups (Last 12 Months)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.signupsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tier Distribution */}
          <div className="bg-surface-900 border border-surface-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Subscription Tier Distribution</h3>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.tierDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {stats.tierDistribution.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
