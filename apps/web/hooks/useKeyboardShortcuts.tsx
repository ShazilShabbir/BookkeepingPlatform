import { useEffect, useCallback, useState } from 'react';

interface ShortcutMap {
  [key: string]: () => void;
}

export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (e.key === 'Escape') {
        shortcuts['Escape']?.();
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        shortcuts['?']?.();
        return;
      }

      if (!isInput) {
        if (e.key === '/') {
          e.preventDefault();
          shortcuts['/']?.();
          return;
        }
        const shortcut = shortcuts[e.key];
        if (shortcut) {
          e.preventDefault();
          shortcut();
        }
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [shortcuts]);
}

export function useShortcutGuide() {
  const [open, setOpen] = useState(false);

  const guide = open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
      <div className="fixed inset-0 bg-black/40" />
      <div className="relative bg-white rounded-2xl shadow-modal border border-surface-200 w-full max-w-sm p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-surface-900">Keyboard Shortcuts</h3>
          <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-surface-100 text-surface-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-3">
          <ShortcutRow keys="/" description="Search transactions" />
          <ShortcutRow keys="N" description="New entry / import" />
          <ShortcutRow keys="D" description="Go to Dashboard" />
          <ShortcutRow keys="T" description="Go to Transactions" />
          <ShortcutRow keys="?" description="Toggle this guide" />
          <ShortcutRow keys="Esc" description="Close modals / clear search" />
        </div>
      </div>
    </div>
  ) : null;

  return { open, setOpen, guide };
}

function ShortcutRow({ keys, description }: { keys: string; description: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-surface-700">{description}</span>
      <kbd className="px-2 py-1 text-xs font-mono font-medium bg-surface-100 text-surface-600 rounded border border-surface-200 min-w-[28px] text-center">
        {keys}
      </kbd>
    </div>
  );
}
