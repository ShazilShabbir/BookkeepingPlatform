import { useEffect, useState } from 'react';

interface ActivityItem {
  _id: string;
  action: string;
  resource: string;
  resourceId: string;
  details?: Record<string, any>;
  createdAt: string;
}

const actionLabels: Record<string, string> = {
  create: 'Created', update: 'Updated', delete: 'Deleted',
  reclassify: 'Reclassified', close: 'Closed', reopen: 'Reopened',
  send: 'Sent', pay: 'Paid',
};

const resourceLabels: Record<string, string> = {
  entry: 'journal entry', account: 'account', period: 'period',
  customer: 'customer', client: 'client', schedule: 'schedule',
  trash: 'item', invoice: 'invoice',
};

const resourceIcons: Record<string, string> = {
  entry: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
  account: 'M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L12 12m0 0l2.25-2.25M12 12l-2.25 2.25m5.25 3.75H3',
  period: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z',
  customer: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  invoice: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  client: 'M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244',
  schedule: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
};

function timeAgo(d: string) {
  const seconds = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(d).toLocaleDateString();
}

export default function RecentActivity({ userId }: { userId: string }) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const res = await fetch('/api/dashboard/activity?userId=' + encodeURIComponent(userId));
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) setItems(json.data.slice(0, 8));
      } catch {} finally { setLoading(false); }
    };
    fetchActivity();
  }, [userId]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-5 w-24 bg-surface-200 rounded animate-pulse" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-surface-100 animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-3/4 bg-surface-100 rounded animate-pulse" />
              <div className="h-3 w-1/4 bg-surface-100 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-surface-900 mb-3">Recent Activity</h3>
      <div className="space-y-1">
        {items.map((item) => (
          <div key={item._id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-surface-50 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={resourceIcons[item.resource] || resourceIcons.entry} />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-surface-700 truncate">
                <span className="font-medium">{actionLabels[item.action] || item.action}</span>
                {' '}<span className="text-surface-500">{resourceLabels[item.resource] || item.resource}</span>
              </p>
              <p className="text-xs text-surface-400">{timeAgo(item.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
