import { useEffect, useState } from 'react';
import { Card } from '@/components/ui';

interface ActivityItem {
  _id: string;
  action: string;
  resource: string;
  resourceId: string;
  details?: Record<string, any>;
  createdAt: string;
}

const actionLabels: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  reclassify: 'Reclassified',
  close: 'Closed',
  reopen: 'Reopened',
};

const resourceIcons: Record<string, string> = {
  entry: '📄',
  account: '📋',
  period: '📅',
  customer: '👤',
  client: '🔗',
  schedule: '⏰',
  trash: '🗑️',
};

export default function ActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const res = await fetch('/api/dashboard/activity');
        const json = await res.json();
        if (json.success) setItems(json.data);
      } catch {} finally {
        setLoading(false);
      }
    };
    fetchActivity();
  }, []);

  const timeAgo = (d: string) => {
    const seconds = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <Card padding="md">
      <h3 className="text-base font-semibold text-surface-900 mb-4">Recent Activity</h3>
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-surface-100 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-surface-400 text-center py-6">No recent activity</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item._id} className="flex items-start gap-3 py-2 border-b border-surface-100 last:border-0">
              <span className="text-lg shrink-0">{resourceIcons[item.resource] || '📌'}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-surface-700">
                  <span className="font-medium">{actionLabels[item.action] || item.action}</span>
                  {' '}
                  <span className="text-surface-500">{item.resource}</span>
                </p>
                <p className="text-xs text-surface-400 mt-0.5">{timeAgo(item.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
