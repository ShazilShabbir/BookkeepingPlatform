import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { Modal, Button } from '@/components/ui';

interface ShareButtonProps {
  disabled?: boolean;
}

export default function ShareButton({ disabled }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [clientName, setClientName] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const openModal = useCallback(async () => {
    setOpen(true);
    setLoading(true);
    try {
      const res = await fetch('/api/clients/share-link');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to load share link');
      }
      const json = await res.json();
      if (json.success && json.data) {
        const baseUrl = window.location.origin;
        setShareUrl(`${baseUrl}/reports/${json.data.accessToken}`);
        setClientName(json.data.clientName || 'Client');
      } else {
        throw new Error('Unexpected response');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load share link');
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <>
      <button onClick={openModal} disabled={disabled}
        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
        </svg>
        Share
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Share Financial Report" size="lg">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full" />
          </div>
        ) : shareUrl ? (
          <div className="space-y-4">
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-sm text-indigo-700">
              Anyone with this link can view the financial report. Links never expire.
            </div>

            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1">Shareable Link</label>
              <div className="flex gap-2">
                <input readOnly value={shareUrl}
                  className="flex-1 border border-surface-200 rounded-lg px-3 py-2 text-sm bg-surface-50 font-mono text-surface-700" />
                <button onClick={handleCopy}
                  className={clsx('px-4 py-2 text-sm font-medium rounded-lg transition-colors', copied ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-100 text-surface-700 hover:bg-surface-200')}>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-surface-200">
              <p className="text-sm text-surface-500">
                Recipients see the report for <strong className="text-surface-700">{clientName}</strong>
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-surface-500 mb-4">No share link available. Create a client first.</p>
            <Button variant="secondary" onClick={() => setOpen(false)}>Close</Button>
          </div>
        )}
      </Modal>
    </>
  );
}
