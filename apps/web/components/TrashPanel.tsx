import { useState, useEffect } from 'react';
import { Card, Button, EmptyState } from '@/components/ui';
import toast from 'react-hot-toast';

interface TrashItemData {
  _id: string;
  resource: string;
  resourceId: string;
  label: string;
  snapshot: Record<string, any>;
  expiresAt: string;
  createdAt: string;
}

const resourceLabels: Record<string, string> = {
  entry: 'Journal Entry',
  account: 'Account',
  client: 'Client',
  customer: 'Customer',
  schedule: 'Schedule',
};

const PAGE_SIZE = 20;

export default function TrashPanel({ userId }: { userId: string }) {
  const [items, setItems] = useState<TrashItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadTrash = async (pg: number = page) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/trash?userId=${encodeURIComponent(userId)}&page=${pg}&limit=${PAGE_SIZE}`);
      const json = await res.json();
      if (json.success) {
        setItems(json.data);
        setTotal(json.total || 0);
        setTotalPages(json.pages || 1);
      }
    } catch {
      toast.error('Failed to load trash');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTrash(1); }, []);

  const deletePermanently = async (id: string) => {
    try {
      const res = await fetch(`/api/trash?id=${id}&userId=` + encodeURIComponent(userId), { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        toast.success('Deleted permanently');
        loadTrash();
      } else {
        toast.error(json.error || 'Failed to delete');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card padding="lg">
        <h2 className="text-lg font-semibold text-surface-900 mb-2">Trash</h2>
        <p className="text-sm text-surface-500 mb-6">
          Deleted items are kept for 30 days before being permanently removed.
        </p>

        {loading ? (
          <div className="text-center py-8 text-surface-400">Loading trash...</div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            }
            title="Trash is empty"
            description="Deleted items appear here and are kept for 30 days."
          />
        ) : (
          <>
            <div className="space-y-2">
              {items.map(item => (
                <div key={item._id} className="flex items-center justify-between bg-surface-50 rounded-lg px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-surface-400 uppercase tracking-wider">
                        {resourceLabels[item.resource] || item.resource}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-surface-900 truncate mt-0.5">{item.label || '(no label)'}</p>
                    <p className="text-xs text-surface-400">Deleted {formatDate(item.createdAt)}</p>
                  </div>
                  <button
                    onClick={() => deletePermanently(item._id)}
                    className="p-2.5 sm:p-1.5 text-surface-400 hover:text-red-500 transition-colors shrink-0 ml-4 min-w-10 min-h-10 sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                    title="Delete permanently"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-surface-200">
                <span className="text-sm text-surface-500">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
                </span>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => { setPage(p => p - 1); loadTrash(page - 1); }} disabled={page <= 1}>
                    Previous
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => { setPage(p => p + 1); loadTrash(page + 1); }} disabled={page >= totalPages}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
